import { AppError } from '../utils/errors.js';
import { getOrCreateUser, adjustBalance } from './userService.js';
import type { TransactionType } from '@prisma/client';
import { formatCurrency } from '../utils/format.js';
import { isCooldownActive, getCooldownRemaining, setCooldown } from './cooldownManager.js';

// GuildConfig no longer has a `slotPayout` column, so the reel payout table
// below is the single source of truth for slot payouts (previously it was
// multiplied by `config.slotPayout`, which read as `undefined`).
const slotSymbols = [
  { emoji: '7️⃣', name: 'Seven', weight: 4, payout: 10 },
  { emoji: '💎', name: 'Diamond', weight: 8, payout: 8 },
  { emoji: '🔔', name: 'Bell', weight: 12, payout: 5 },
  { emoji: '🍊', name: 'Orange', weight: 16, payout: 4 },
  { emoji: '🍒', name: 'Cherry', weight: 20, payout: 3 },
  { emoji: '⭐', name: 'Star', weight: 40, payout: 2 }
] as const;

const SLOT_COOLDOWN_MS = 3_000; // anti-spam / anti-double-click, not a real gameplay cooldown
const activeSpins = new Set<string>();

export interface SlotResult {
  reels: string[];
  won: boolean;
  multiplier: number;
  grossReturn: bigint;
  tax: bigint;
  netAmount: bigint;
  message: string;
  newWallet: bigint;
}

function chooseSymbol() {
  const totalWeight = slotSymbols.reduce((sum, symbol) => sum + symbol.weight, 0);
  let n = Math.random() * totalWeight;
  for (const symbol of slotSymbols) {
    n -= symbol.weight;
    if (n <= 0) return symbol;
  }
  return slotSymbols[slotSymbols.length - 1];
}

function evaluateSpin(reels: ReadonlyArray<typeof slotSymbols[number]>) {
  const [first, second, third] = reels;
  const same = first.name === second.name && second.name === third.name;
  const twoSame = first.name === second.name || first.name === third.name || second.name === third.name;

  if (same) {
    return {
      multiplier: first.payout,
      description: `Triple ${first.name}`,
      jackpot: first.name === 'Seven'
    };
  }

  if (twoSame) {
    return {
      multiplier: 1.5,
      description: 'Two matching symbols',
      jackpot: false
    };
  }

  return {
    multiplier: 0,
    description: 'No win',
    jackpot: false
  };
}

export async function playSlot(
  discordId: string,
  guildId: string,
  betAmount: bigint
): Promise<SlotResult & { jackpot: boolean }> {
  if (isCooldownActive(discordId, 'slot')) {
    const remaining = getCooldownRemaining(discordId, 'slot');
    throw new AppError(`Slots are still on cooldown. Try again in ${formatDuration(remaining)}.`);
  }

  const lockKey = `${discordId}:${guildId}:slot`;
  if (activeSpins.has(lockKey)) {
    throw new AppError('Your previous spin is still being processed. Please wait a moment.');
  }
  activeSpins.add(lockKey);

  try {
    const { user, config } = await getOrCreateUser(discordId, guildId);

    if (betAmount <= 0n) {
      throw new AppError('You must bet a positive amount.');
    }

    if (user.wallet < betAmount) {
      throw new AppError('You do not have enough wallet balance to play slots.');
    }

    const reels = [chooseSymbol(), chooseSymbol(), chooseSymbol()];
    const evaluation = evaluateSpin(reels);

    const grossReturn = evaluation.multiplier > 0
      ? (betAmount * BigInt(Math.round(evaluation.multiplier * 100))) / 100n
      : 0n;
    const profit = evaluation.multiplier > 0 ? grossReturn - betAmount : -betAmount;
    const tax = evaluation.multiplier > 0 ? (profit * BigInt(config.taxPercent)) / 100n : 0n;
    const netAmount = evaluation.multiplier > 0 ? profit - tax : -betAmount;

    const updatedUser = await adjustBalance(
      user.id,
      { walletDelta: netAmount },
      {
        source: 'slot',
        amount: netAmount,
        type: 'BALANCE' as TransactionType,
        description: evaluation.description
      }
    );

    setCooldown(discordId, 'slot', SLOT_COOLDOWN_MS);

    return {
      reels: reels.map((symbol) => symbol.emoji),
      won: evaluation.multiplier > 0,
      multiplier: evaluation.multiplier,
      grossReturn,
      tax,
      netAmount,
      jackpot: evaluation.jackpot,
      message: evaluation.multiplier > 0
        ? `${evaluation.jackpot ? 'JACKPOT! ' : ''}You won ${formatCurrency(netAmount, config.currencyEmoji)} after tax.`
        : `No win this time. You lost ${formatCurrency(betAmount, config.currencyEmoji)}.`,
      newWallet: updatedUser.wallet
    };
  } finally {
    activeSpins.delete(lockKey);
  }
}

function formatDuration(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const remainingSeconds = seconds % 60;
  const remainingMinutes = minutes % 60;

  if (hours) return `${hours}h ${remainingMinutes}m ${remainingSeconds}s`;
  if (minutes) return `${remainingMinutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}
