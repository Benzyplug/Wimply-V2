import { AppError } from '../utils/errors.js';
import { getOrCreateUser, adjustBalance } from './userService.js';
import type { TransactionType } from '@prisma/client';
import { isCooldownActive, getCooldownRemaining, setCooldown } from './cooldownManager.js';
import { formatCurrency } from '../utils/format.js';

const COINFLIP_PAYOUT_PERCENT = 180;
const COINFLIP_COOLDOWN_MS = 3_000;
const DICE_PAYOUT_PERCENT = 95;
const DICE_COOLDOWN_MS = 3_000;
const activeBets = new Set<string>();

function lockKey(discordId: string, guildId: string, game: string) { return `${discordId}:${guildId}:${game}`; }
function acquireBetLock(discordId: string, guildId: string, game: string) {
  const key = lockKey(discordId, guildId, game);
  if (activeBets.has(key)) throw new AppError('Your previous bet is still being processed. Please wait a moment.');
  activeBets.add(key);
  return () => activeBets.delete(key);
}
function getCooldownDescription(ms: number): string {
  const seconds = Math.ceil(ms / 1000), minutes = Math.floor(seconds / 60), hours = Math.floor(minutes / 60);
  const remainingSeconds = seconds % 60, remainingMinutes = minutes % 60;
  if (hours) return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  if (minutes) return `${remainingMinutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

export interface CoinflipResult {
  userId: string; outcome: 'heads' | 'tails'; choice: 'heads' | 'tails'; won: boolean;
  amount: bigint; grossReturn: bigint; tax: bigint; message: string; newWallet: bigint;
}

export async function playCoinflip(discordId: string, guildId: string, betAmount: bigint, choice: 'heads' | 'tails'): Promise<CoinflipResult> {
  if (isCooldownActive(discordId, 'coinflip')) {
    throw new AppError(`Coinflip is still on cooldown. Try again in ${getCooldownDescription(getCooldownRemaining(discordId, 'coinflip'))}.`);
  }
  const release = acquireBetLock(discordId, guildId, 'coinflip');
  try {
    const { user, config } = await getOrCreateUser(discordId, guildId);
    if (betAmount <= 0n) throw new AppError('You must bet a positive amount.');
    if (user.wallet < betAmount) throw new AppError(`Your wallet has ${formatCurrency(user.wallet, config.currencyEmoji)}, but you need ${formatCurrency(betAmount, config.currencyEmoji)} to place this bet.`);
    const outcome = Math.random() < 0.5 ? 'heads' : 'tails';
    const won = outcome === choice;
    const grossReturn = won ? (betAmount * BigInt(COINFLIP_PAYOUT_PERCENT)) / 100n : 0n;
    const netProfit = won ? grossReturn - betAmount : -betAmount;
    const walletDelta = netProfit;
    const updatedUser = await adjustBalance(user.id, { walletDelta }, { source: 'coinflip', amount: walletDelta, type: 'BALANCE' as TransactionType, description: `${won ? 'Coinflip win' : 'Coinflip loss'} (${choice} vs ${outcome})` });
    setCooldown(discordId, 'coinflip', COINFLIP_COOLDOWN_MS);
    return { userId: user.id, outcome, choice, won, amount: walletDelta, grossReturn, tax: 0n,
      message: won ? `🪙 **${outcome.toUpperCase()}!** You won ${formatCurrency(netProfit, config.currencyEmoji)}.` : `💥 **${outcome.toUpperCase()}!** You lost ${formatCurrency(betAmount, config.currencyEmoji)}.`, newWallet: updatedUser.wallet };
  } finally { release(); }
}

export interface DiceRollResult {
  userId: string; sides: number; target: number; roll: number; multiplier: number; won: boolean;
  amount: bigint; grossReturn: bigint; tax: bigint; message: string; newWallet: bigint;
}
function getRandomInt(min: number, max: number): number { return Math.floor(Math.random() * (max - min + 1)) + min; }

export async function playDiceRoll(discordId: string, guildId: string, betAmount: bigint, sides: number, target: number, multiplier: number): Promise<DiceRollResult> {
  if (sides < 2 || sides > 100) throw new AppError('Sides must be between 2 and 100.');
  if (target < 1 || target > sides) throw new AppError(`Choose a target number between 1 and ${sides}.`);
  if (multiplier < 1 || multiplier > 3) throw new AppError('Multiplier must be between 1 and 3.');
  if (isCooldownActive(discordId, 'dice')) throw new AppError(`Dice roll is still on cooldown. Try again in ${getCooldownDescription(getCooldownRemaining(discordId, 'dice'))}.`);
  const release = acquireBetLock(discordId, guildId, 'dice');
  try {
    const { user, config } = await getOrCreateUser(discordId, guildId);
    if (betAmount <= 0n) throw new AppError('You must bet a positive amount.');
    if (user.wallet < betAmount) throw new AppError(`Your wallet has ${formatCurrency(user.wallet, config.currencyEmoji)}, but you need ${formatCurrency(betAmount, config.currencyEmoji)} to place this bet.`);
    const roll = getRandomInt(1, sides);
    const won = roll === target;
    const grossReturn = won ? (betAmount * BigInt(sides) * BigInt(multiplier) * BigInt(DICE_PAYOUT_PERCENT)) / 100n : 0n;
    const netProfit = won ? grossReturn - betAmount : -betAmount;
    const walletDelta = netProfit;
    const updatedUser = await adjustBalance(user.id, { walletDelta }, { source: 'dice', amount: walletDelta, type: 'BALANCE' as TransactionType, description: `${won ? 'Dice win' : 'Dice loss'} (${roll}/${sides}, target ${target})` });
    setCooldown(discordId, 'dice', DICE_COOLDOWN_MS);
    return { userId: user.id, sides, target, roll, multiplier, won, amount: walletDelta, grossReturn, tax: 0n,
      message: won ? `🎲 **${roll}!** You won ${formatCurrency(netProfit, config.currencyEmoji)}.` : `🎲 **${roll}!** You lost ${formatCurrency(betAmount, config.currencyEmoji)}.`, newWallet: updatedUser.wallet };
  } finally { release(); }
}
