import { randomBytes } from 'node:crypto';
import { AppError } from '../utils/errors.js';
import { prisma } from './database.js';
import { getOrCreateUser } from './userService.js';
import { parsePositiveAmount } from '../utils/format.js';

export interface AviatorSession { id: string; userId: string; discordId: string; guildId: string; bet: bigint; crashAt: number; multiplier: number; startedAt: number; cashedOut: boolean; }
export const aviatorGames = new Map<string, AviatorSession>();
function crashPoint() { const random = randomBytes(6).readUIntBE(0, 6) / 0x1000000000000; const raw = 0.97 / Math.max(0.000001, 1 - random); return Math.max(1.01, Math.min(100, Math.floor(raw * 100) / 100)); }
export function getAviatorMultiplier(session: AviatorSession, now = Date.now()) { const elapsed = Math.max(0, now - session.startedAt); const live = 1 + elapsed / 5200; return Math.min(session.crashAt, Math.round(live * 100) / 100); }
export function isAviatorCrashed(session: AviatorSession, now = Date.now()) { return getAviatorMultiplier(session, now) >= session.crashAt; }
export async function startAviator(discordId: string, guildId: string, amountString: string) {
  const existing = [...aviatorGames.values()].find(game => game.discordId === discordId && game.guildId === guildId && !game.cashedOut && !isAviatorCrashed(game));
  if (existing) { existing.multiplier = getAviatorMultiplier(existing); return existing; }
  const amount = parsePositiveAmount(amountString); const { user } = await getOrCreateUser(discordId, guildId);
  if (user.wallet < amount) throw new AppError(`You need **${amount.toLocaleString()}** in your wallet to board this flight.`);
  const updated = await prisma.$transaction(async tx => { const next = await tx.user.update({ where: { id: user.id }, data: { wallet: user.wallet - amount } }); await tx.economyTransaction.create({ data: { userId: user.id, source: 'aviator', amount: -amount, balanceAfter: next.wallet + next.bank, type: 'ADMIN', description: 'Aviator wager' } }); return next; });
  const session: AviatorSession = { id: randomBytes(8).toString('hex'), userId: updated.id, discordId, guildId, bet: amount, crashAt: crashPoint(), multiplier: 1, startedAt: Date.now(), cashedOut: false }; aviatorGames.set(session.id, session); return session;
}
export async function cashOutAviator(sessionId: string, discordId: string, multiplier: number) { const session = aviatorGames.get(sessionId); if (!session || session.discordId !== discordId) throw new AppError('This Aviator flight is no longer yours or is already settled.'); if (session.cashedOut) throw new AppError('This flight has already been cashed out.'); if (isAviatorCrashed(session)) throw new AppError('💥 The plane already crashed. Your wager was lost.'); const lockedMultiplier = Math.min(session.crashAt, Math.max(1, multiplier)); const payout = session.bet * BigInt(Math.floor(lockedMultiplier * 100)) / 100n; session.cashedOut = true; aviatorGames.delete(sessionId); await prisma.$transaction(async tx => { const user = await tx.user.findUniqueOrThrow({ where: { id: session.userId } }); const updated = await tx.user.update({ where: { id: user.id }, data: { wallet: user.wallet + payout } }); await tx.economyTransaction.create({ data: { userId: user.id, source: 'aviator', amount: payout, balanceAfter: updated.wallet + updated.bank, type: 'ADMIN', description: `Aviator cashout at ${lockedMultiplier.toFixed(2)}x` } }); }); return { session, multiplier: lockedMultiplier, payout }; }
export function settleAviatorCrash(sessionId: string) { const session = aviatorGames.get(sessionId); if (!session) return null; aviatorGames.delete(sessionId); return session; }
export function cleanupAviatorGames(maxAgeMs = 15 * 60_000) { const cutoff = Date.now() - maxAgeMs; for (const [id, session] of aviatorGames) if (session.startedAt < cutoff) aviatorGames.delete(id); }
