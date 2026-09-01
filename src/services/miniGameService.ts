import { AppError } from '../utils/errors.js';
import { adjustBalance, getOrCreateUser } from './userService.js';
import { prisma } from './database.js';

export type HigherLowerState = {
  userId: string;
  guildId: string;
  bet: bigint;
  current: number;
  multiplier: number;
  moves: number;
  expiresAt: number;
};

export type MinesState = {
  userId: string;
  guildId: string;
  bet: bigint;
  mines: Set<number>;
  revealed: Set<number>;
  multiplier: number;
  mineCount: number;
  expiresAt: number;
};

export const higherLowerGames = new Map<string, HigherLowerState>();
export const minesGames = new Map<string, MinesState>();

export function createGameSessionId(userId: string) {
  return `${userId}:${crypto.randomUUID()}`;
}

export async function chargeGame(userId: string, guildId: string, amount: bigint, game: string) {
  if (amount <= 0n) throw new AppError('Your bet must be greater than **0** 🪙.');
  const { user } = await getOrCreateUser(userId, guildId);
  if (user.wallet < amount) {
    throw new AppError(`Your balance is **${user.wallet.toLocaleString()} 🪙**. You need **${amount.toLocaleString()} 🪙** to play **${game}**.`);
  }
  return adjustBalance(user.id, { walletDelta: -amount }, { source: game.toLowerCase(), amount: -amount, type: 'ADMIN', description: `${game} entry bet` });
}

export async function payGame(userId: string, guildId: string, amount: bigint, game: string) {
  const { user } = await getOrCreateUser(userId, guildId);
  return adjustBalance(user.id, { walletDelta: amount }, { source: game.toLowerCase(), amount, type: 'ADMIN', description: `${game} payout` });
}

export async function getGameCurrency(guildId: string) {
  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (config) return config;
  return prisma.guildConfig.upsert({ where: { guildId }, update: {}, create: { guildId, name: 'Default Server' } });
}

export function randomMines(count: number, size: number) {
  const mines = new Set<number>();
  while (mines.size < count) mines.add(Math.floor(Math.random() * size));
  return mines;
}

export function cleanupExpiredGames() {
  const now = Date.now();
  for (const [id, game] of higherLowerGames) if (game.expiresAt < now) higherLowerGames.delete(id);
  for (const [id, game] of minesGames) if (game.expiresAt < now) minesGames.delete(id);
}
