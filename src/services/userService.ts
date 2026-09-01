import { AppError } from '../utils/errors.js';
import { Prisma } from '@prisma/client';
import { prisma } from './database.js';
import type { GuildConfig, User, TransactionType } from '@prisma/client';
import { log } from '../utils/logger.js';

interface UserToken { user: User; config: GuildConfig; }

export async function getOrCreateUser(discordId: string, guildId: string): Promise<UserToken> {
  const config = await prisma.guildConfig.upsert({ where: { guildId }, update: {}, create: { guildId, name: 'Default Server' } });
  let user = await prisma.user.findUnique({ where: { discordId_guildId: { discordId, guildId: config.id } } });
  if (!user) {
    user = await prisma.user.create({ data: { discordId, guildId: config.id } });
    log.info(`Created user profile for ${discordId} in guild ${guildId}`, 'UserService');
  }
  return { user, config };
}

function isSerializationConflict(error: unknown) { return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034'; }

export async function awardXp(discordId: string, guildId: string, amount: number) {
  if (amount <= 0) return null;
  const { user, config } = await getOrCreateUser(discordId, guildId);
  if (!config.xpEnabled) return user;
  const xp = user.xp + Math.floor(amount);
  const level = Math.max(1, Math.floor(Math.sqrt(xp / 100)) + 1);
  return prisma.user.update({ where: { id: user.id }, data: { xp, level } });
}

export async function adjustBalance(userId: string, data: { walletDelta?: bigint; bankDelta?: bigint; lastDaily?: Date | null; lastWeekly?: Date | null; lastMonthly?: Date | null; lastWork?: Date | null; lastCrime?: Date | null; lastRob?: Date | null; lastBeg?: Date | null; }, transaction: { source: string; amount: bigint; type: TransactionType; description: string; }) {
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new AppError('User not found.');
        const wallet = user.wallet + (data.walletDelta ?? 0n);
        const bank = user.bank + (data.bankDelta ?? 0n);
        if (wallet < 0n || bank < 0n) {
          const required = data.walletDelta !== undefined && data.walletDelta < 0n ? -data.walletDelta : 0n;
          const missing = required > user.wallet ? required - user.wallet : 0n;
          throw new AppError(`╭─〔 💳 BALANCE CHECK 〕─╮\n〢 **Wallet:** ${user.wallet.toLocaleString()} 🪙\n〢 **Required:** ${required.toLocaleString()} 🪙\n〢 **Short by:** ${missing.toLocaleString()} 🪙\n╰─〔 📈 Earn more and try again 〕─╯`);
        }
        const updatePayload: Record<string, unknown> = {};
        if (data.walletDelta !== undefined) updatePayload.wallet = { increment: data.walletDelta };
        if (data.bankDelta !== undefined) updatePayload.bank = { increment: data.bankDelta };
        if (data.lastDaily !== undefined) updatePayload.lastDaily = data.lastDaily;
        if (data.lastWeekly !== undefined) updatePayload.lastWeekly = data.lastWeekly;
        if (data.lastMonthly !== undefined) updatePayload.lastMonthly = data.lastMonthly;
        if (data.lastWork !== undefined) updatePayload.lastWork = data.lastWork;
        if (data.lastCrime !== undefined) updatePayload.lastCrime = data.lastCrime;
        if (data.lastRob !== undefined) updatePayload.lastRob = data.lastRob;
        if (data.lastBeg !== undefined) updatePayload.lastBeg = data.lastBeg;
        const updatedUser = await tx.user.update({ where: { id: userId }, data: updatePayload });
        await tx.economyTransaction.create({ data: { userId, source: transaction.source, amount: transaction.amount, balanceAfter: updatedUser.wallet + updatedUser.bank, type: transaction.type, description: transaction.description } });
        return updatedUser;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!isSerializationConflict(error) || attempt === 3) throw error;
      await new Promise(resolve => setTimeout(resolve, 50 * attempt));
    }
  }
  throw new Error('Balance transaction failed after retries.');
}

export async function updateWallet(userId: string, amount: bigint, description: string): Promise<void> { await adjustBalance(userId, { walletDelta: amount }, { source: 'wallet', amount, type: 'BALANCE', description }); }
export async function depositToBank(userId: string, amount: bigint): Promise<void> { await adjustBalance(userId, { walletDelta: -amount, bankDelta: amount }, { source: 'deposit', amount, type: 'DEPOSIT', description: 'Deposit to bank' }); }
export async function withdrawFromBank(userId: string, amount: bigint): Promise<void> { await adjustBalance(userId, { walletDelta: amount, bankDelta: -amount }, { source: 'withdraw', amount, type: 'WITHDRAW', description: 'Withdraw from bank' }); }
export async function createTransactionOnly(userId: string, amount: bigint, type: TransactionType, description: string, walletAfter: bigint, bankAfter: bigint) { await prisma.economyTransaction.create({ data: { userId, source: 'transaction', amount, balanceAfter: walletAfter + bankAfter, type, description } }); }
