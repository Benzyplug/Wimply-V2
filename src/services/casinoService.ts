import { AppError } from '../utils/errors.js';
import { getOrCreateUser, adjustBalance } from './userService.js';
import type { TransactionType } from '@prisma/client';
import { isCooldownActive, getCooldownRemaining, setCooldown } from './cooldownManager.js';
import { formatCurrency } from '../utils/format.js';

// The GuildConfig schema does not (currently) store per-guild gambling payout
// percentages or cooldowns for coinflip/dice/blackjack/slot - those fields were
// removed. Until that is reintroduced as a real schema change, these games use
// fixed, hardcoded balancing constants here instead of reading them off `config`.
// `config.taxPercent` still exists on GuildConfig and is still respected below.
const COINFLIP_PAYOUT_PERCENT = 180; // 1.8x gross return on a win
const COINFLIP_COOLDOWN_MS = 3_000; // anti-spam / anti-double-click, not a real gameplay cooldown

const DICE_PAYOUT_PERCENT = 95; // base payout factor before sides/multiplier scaling
const DICE_COOLDOWN_MS = 3_000;

// In-memory locks so the same user cannot resolve two bets of the same game
// concurrently (double-click / rapid re-submit before the first one has
// finished writing to the database).
const activeBets = new Set<string>();

function lockKey(discordId: string, guildId: string, game: string) {
  return `${discordId}:${guildId}:${game}`;
}

function acquireBetLock(discordId: string, guildId: string, game: string) {
  const key = lockKey(discordId, guildId, game);
  if (activeBets.has(key)) {
    throw new AppError('Your previous bet is still being processed. Please wait a moment.');
  }
  activeBets.add(key);
  return () => activeBets.delete(key);
}

function getCooldownDescription(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;

  if (hours) return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  if (minutes) return `${remainingMinutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export interface CoinflipResult {
  userId: string;
  outcome: 'heads' | 'tails';
  choice: 'heads' | 'tails';
  won: boolean;
  amount: bigint;
  grossReturn: bigint;
  tax: bigint;
  message: string;
  newWallet: bigint;
}

export async function playCoinflip(
  discordId: string,
  guildId: string,
  betAmount: bigint,
  choice: 'heads' | 'tails'
): Promise<CoinflipResult> {
  if (isCooldownActive(discordId, 'coinflip')) {
    const remaining = getCooldownRemaining(discordId, 'coinflip');
    throw new AppError(`Coinflip is still on cooldown. Try again in ${getCooldownDescription(remaining)}.`);
  }

  const release = acquireBetLock(discordId, guildId, 'coinflip');

  try {
    const { user, config } = await getOrCreateUser(discordId, guildId);

    if (betAmount <= 0n) {
      throw new AppError('You must bet a positive amount.');
    }

    if (user.wallet < betAmount) {
      throw new AppError('You do not have enough wallet balance to place that bet.');
    }

    const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = outcome === choice;

    const grossReturn = won ? (betAmount * BigInt(COINFLIP_PAYOUT_PERCENT)) / 100n : 0n;
    const netProfit = won ? grossReturn - betAmount : -betAmount;
    const tax = won ? (netProfit * BigInt(config.taxPercent)) / 100n : 0n;
    const walletDelta = won ? netProfit - tax : -betAmount;

    const description = won
      ? `Coinflip win (${choice} vs ${outcome})`
      : `Coinflip loss (${choice} vs ${outcome})`;

    const updatedUser = await adjustBalance(
      user.id,
      { walletDelta },
      {
        source: 'coinflip',
        amount: walletDelta,
        type: 'BALANCE' as TransactionType,
        description
      }
    );

    setCooldown(discordId, 'coinflip', COINFLIP_COOLDOWN_MS);

    return {
      userId: user.id,
      outcome,
      choice,
      won,
      amount: walletDelta,
      grossReturn,
      tax,
      message: won
        ? `You won ${formatCurrency(grossReturn - tax, config.currencyEmoji)} (${formatCurrency(betAmount, config.currencyEmoji)} → ${formatCurrency(grossReturn, config.currencyEmoji)} after tax).`
        : `You lost ${formatCurrency(betAmount, config.currencyEmoji)}.`,
      newWallet: updatedUser.wallet
    };
  } finally {
    release();
  }
}

export interface DiceRollResult {
  userId: string;
  sides: number;
  target: number;
  roll: number;
  multiplier: number;
  won: boolean;
  amount: bigint;
  grossReturn: bigint;
  tax: bigint;
  message: string;
  newWallet: bigint;
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function playDiceRoll(
  discordId: string,
  guildId: string,
  betAmount: bigint,
  sides: number,
  target: number,
  multiplier: number
): Promise<DiceRollResult> {
  if (sides < 2 || sides > 100) {
    throw new AppError('Sides must be between 2 and 100.');
  }

  if (target < 1 || target > sides) {
    throw new AppError(`Choose a target number between 1 and ${sides}.`);
  }

  if (multiplier < 1 || multiplier > 3) {
    throw new AppError('Multiplier must be between 1 and 3.');
  }

  if (isCooldownActive(discordId, 'dice')) {
    const remaining = getCooldownRemaining(discordId, 'dice');
    throw new AppError(`Dice roll is still on cooldown. Try again in ${getCooldownDescription(remaining)}.`);
  }

  const release = acquireBetLock(discordId, guildId, 'dice');

  try {
    const { user, config } = await getOrCreateUser(discordId, guildId);

    if (betAmount <= 0n) {
      throw new AppError('You must bet a positive amount.');
    }

    if (user.wallet < betAmount) {
      throw new AppError('You do not have enough wallet balance to place that bet.');
    }

    const roll = getRandomInt(1, sides);
    const won = roll === target;
    // Payout scales with the odds of hitting the exact number, so longer-odds
    // bets (more sides) pay out more - same shape as the old config-driven
    // formula, just with a fixed payout factor instead of a per-guild one.
    const grossReturn = won
      ? (betAmount * BigInt(sides) * BigInt(multiplier) * BigInt(DICE_PAYOUT_PERCENT)) / 100n
      : 0n;
    const netProfit = won ? grossReturn - betAmount : -betAmount;
    const tax = won ? (netProfit * BigInt(config.taxPercent)) / 100n : 0n;
    const walletDelta = won ? netProfit - tax : -betAmount;

    const description = won
      ? `Dice win (${roll}/${sides}, target ${target})`
      : `Dice loss (${roll}/${sides}, target ${target})`;

    const updatedUser = await adjustBalance(
      user.id,
      { walletDelta },
      {
        source: 'dice',
        amount: walletDelta,
        type: 'BALANCE' as TransactionType,
        description
      }
    );

    setCooldown(discordId, 'dice', DICE_COOLDOWN_MS);

    return {
      userId: user.id,
      sides,
      target,
      roll,
      multiplier,
      won,
      amount: walletDelta,
      grossReturn,
      tax,
      message: won
        ? `You rolled ${roll}/${sides} and won ${formatCurrency(grossReturn - tax, config.currencyEmoji)}.`
        : `You rolled ${roll}/${sides} and lost ${formatCurrency(betAmount, config.currencyEmoji)}.`,
      newWallet: updatedUser.wallet
    };
  } finally {
    release();
  }
}
