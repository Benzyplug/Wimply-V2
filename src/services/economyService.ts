import { AppError } from '../utils/errors.js';
import { prisma } from './database.js';
import { getOrCreateUser } from './userService.js';
import { getCooldownRemaining, isCooldownActive } from '../utils/time.js';
import { parsePositiveAmount } from '../utils/format.js';
import type { User } from '@prisma/client';

export interface EconomyResult {
  message: string;
  amount: bigint;
  user: User;
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

export async function getBalance(discordId: string, guildId: string) {
  const { user, config } = await getOrCreateUser(discordId, guildId);
  return { user, config };
}

export async function claimDaily(discordId: string, guildId: string): Promise<EconomyResult> {
  const { user, config } = await getOrCreateUser(discordId, guildId);
  if (isCooldownActive(user.lastDaily, config.dailyCooldown)) {
    const remaining = getCooldownRemaining(user.lastDaily, config.dailyCooldown);
    throw new AppError(`Daily reward is still on cooldown. Try again in ${getCooldownDescription(remaining)}.`);
  }

  const amount = BigInt(250 + Math.floor(Math.random() * 101));
  const updated = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + amount, lastDaily: new Date() }
    });
    await tx.economyTransaction.create({
      data: {
        userId: user.id,
        source: 'daily',
        amount,
        balanceAfter: updatedUser.wallet + updatedUser.bank,
        type: 'DAILY',
        description: 'Daily reward'
      }
    });
    return updatedUser;
  });

  return { message: `You received ${amount} from your daily reward!`, amount, user: updated };
}

export async function claimWeekly(discordId: string, guildId: string): Promise<EconomyResult> {
  const { user, config } = await getOrCreateUser(discordId, guildId);
  if (isCooldownActive(user.lastWeekly, config.weeklyCooldown)) {
    const remaining = getCooldownRemaining(user.lastWeekly, config.weeklyCooldown);
    throw new AppError(`Weekly reward is still on cooldown. Try again in ${getCooldownDescription(remaining)}.`);
  }

  const amount = BigInt(1500 + Math.floor(Math.random() * 501));
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + amount, lastWeekly: new Date() }
    });
    await tx.economyTransaction.create({
      data: {
        userId: user.id,
        source: 'weekly',
        amount,
        balanceAfter: updated.wallet + updated.bank,
        type: 'WEEKLY',
        description: 'Weekly reward'
      }
    });
    return updated;
  });

  return { message: `You received ${amount} from your weekly reward!`, amount, user: updatedUser };
}

export async function claimMonthly(discordId: string, guildId: string): Promise<EconomyResult> {
  const { user, config } = await getOrCreateUser(discordId, guildId);
  if (isCooldownActive(user.lastMonthly, config.monthlyCooldown)) {
    const remaining = getCooldownRemaining(user.lastMonthly, config.monthlyCooldown);
    throw new AppError(`Monthly reward is still on cooldown. Try again in ${getCooldownDescription(remaining)}.`);
  }

  const amount = BigInt(5000 + Math.floor(Math.random() * 1001));
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + amount, lastMonthly: new Date() }
    });
    await tx.economyTransaction.create({
      data: {
        userId: user.id,
        source: 'monthly',
        amount,
        balanceAfter: updated.wallet + updated.bank,
        type: 'MONTHLY',
        description: 'Monthly reward'
      }
    });
    return updated;
  });

  return { message: `You received ${amount} from your monthly reward!`, amount, user: updatedUser };
}

export async function work(discordId: string, guildId: string): Promise<EconomyResult> {
  const { user, config } = await getOrCreateUser(discordId, guildId);
  if (isCooldownActive(user.lastWork, config.workCooldown)) {
    const remaining = getCooldownRemaining(user.lastWork, config.workCooldown);
    throw new AppError(`Work is still on cooldown. Try again in ${getCooldownDescription(remaining)}.`);
  }

  const amount = BigInt(500 + Math.floor(Math.random() * 501));
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + amount, lastWork: new Date() }
    });
    await tx.economyTransaction.create({
      data: {
        userId: user.id,
        source: 'work',
        amount,
        balanceAfter: updated.wallet + updated.bank,
        type: 'WORK',
        description: 'Work reward'
      }
    });
    return updated;
  });

  return { message: `You earned ${amount} from work!`, amount, user: updatedUser };
}

export async function crime(discordId: string, guildId: string): Promise<EconomyResult> {
  const { user, config } = await getOrCreateUser(discordId, guildId);
  if (isCooldownActive(user.lastCrime, config.crimeCooldown)) {
    const remaining = getCooldownRemaining(user.lastCrime, config.crimeCooldown);
    throw new AppError(`Crime is still on cooldown. Try again in ${getCooldownDescription(remaining)}.`);
  }

  const succeeded = Math.random() < 0.4;
  const rawAmount = BigInt(300 + Math.floor(Math.random() * 301));
  // On failure, never take more than the user actually has in their wallet.
  const amount = succeeded ? rawAmount : (rawAmount > user.wallet ? user.wallet : rawAmount);
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: {
        wallet: succeeded ? user.wallet + amount : user.wallet - amount,
        lastCrime: new Date()
      }
    });
    await tx.economyTransaction.create({
      data: {
        userId: user.id,
        source: 'crime',
        amount: succeeded ? amount : -amount,
        balanceAfter: updated.wallet + updated.bank,
        type: 'CRIME',
        description: succeeded ? 'Crime success' : 'Crime failure'
      }
    });
    return updated;
  });

  const message = succeeded
    ? `Crime successful! You stole ${amount}.`
    : `Crime failed and you lost ${amount}.`;

  return { message, amount, user: updatedUser };
}

export async function beg(discordId: string, guildId: string): Promise<EconomyResult> {
  const { user, config } = await getOrCreateUser(discordId, guildId);
  if (isCooldownActive(user.lastBeg, config.begCooldown)) {
    const remaining = getCooldownRemaining(user.lastBeg, config.begCooldown);
    throw new AppError(`Beg is still on cooldown. Try again in ${getCooldownDescription(remaining)}.`);
  }

  const amount = BigInt(50 + Math.floor(Math.random() * 151));
  const updatedUser = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + amount, lastBeg: new Date() }
    });
    await tx.economyTransaction.create({
      data: {
        userId: user.id,
        source: 'beg',
        amount,
        balanceAfter: updated.wallet + updated.bank,
        type: 'BEG',
        description: 'Beg reward'
      }
    });
    return updated;
  });

  return { message: `Someone felt generous and gave you ${amount}.`, amount, user: updatedUser };
}

export async function transfer(
  discordId: string,
  guildId: string,
  targetDiscordId: string,
  amountString: string
): Promise<EconomyResult> {
  const amount = parsePositiveAmount(amountString);
  const senderToken = await getOrCreateUser(discordId, guildId);
  const receiverToken = await getOrCreateUser(targetDiscordId, guildId);

  if (senderToken.user.wallet < amount) {
    throw new AppError('You do not have enough wallet balance to transfer that amount.');
  }
  if (senderToken.user.discordId === receiverToken.user.discordId) {
    throw new AppError('You cannot pay yourself.');
  }

  const [updatedSender] = await prisma.$transaction([
    prisma.user.update({
      where: { id: senderToken.user.id },
      data: { wallet: senderToken.user.wallet - amount }
    }),
    prisma.user.update({
      where: { id: receiverToken.user.id },
      data: { wallet: receiverToken.user.wallet + amount }
    }),
    prisma.economyTransaction.create({
      data: {
        userId: senderToken.user.id,
        source: 'pay',
        amount: -amount,
        balanceAfter: senderToken.user.wallet - amount + senderToken.user.bank,
        type: 'PAY',
        description: `Paid ${targetDiscordId}`
      }
    }),
    prisma.economyTransaction.create({
      data: {
        userId: receiverToken.user.id,
        source: 'pay',
        amount,
        balanceAfter: receiverToken.user.wallet + amount + receiverToken.user.bank,
        type: 'PAY',
        description: `Received payment from ${discordId}`
      }
    })
  ]);

  return { message: `You paid ${amount} to <@${targetDiscordId}>.`, amount, user: updatedSender };
}

export async function robUser(
  discordId: string,
  guildId: string,
  targetDiscordId: string
): Promise<EconomyResult> {
  const attacker = await getOrCreateUser(discordId, guildId);
  const victim = await getOrCreateUser(targetDiscordId, guildId);

  if (attacker.user.id === victim.user.id) {
    throw new AppError('You cannot rob yourself.');
  }

  if (victim.user.wallet <= 0n) {
    throw new AppError('The target has no wallet balance to rob.');
  }

  if (isCooldownActive(attacker.user.lastRob, attacker.config.robCooldown)) {
    const remaining = getCooldownRemaining(attacker.user.lastRob, attacker.config.robCooldown);
    throw new AppError(`Rob is still on cooldown. Try again in ${getCooldownDescription(remaining)}.`);
  }

  const success = Math.random() < 0.35;
  const rawAmount = success
    ? BigInt(Math.min(Number(victim.user.wallet), 100 + Math.floor(Math.random() * 401)))
    : BigInt(100 + Math.floor(Math.random() * 201));
  // On a failed attempt the attacker pays a penalty from their own wallet — never more than they have.
  const amount = success ? rawAmount : (rawAmount > attacker.user.wallet ? attacker.user.wallet : rawAmount);

  const result = await prisma.$transaction(async (tx) => {
    if (success) {
      const updatedAttacker = await tx.user.update({
        where: { id: attacker.user.id },
        data: { wallet: attacker.user.wallet + amount, lastRob: new Date() }
      });
      const updatedVictim = await tx.user.update({
        where: { id: victim.user.id },
        data: { wallet: victim.user.wallet - amount }
      });
      await tx.economyTransaction.create({
        data: {
          userId: attacker.user.id,
          source: 'rob',
          amount,
          balanceAfter: updatedAttacker.wallet + updatedAttacker.bank,
          type: 'ROB',
          description: `Robbed ${targetDiscordId}`
        }
      });
      await tx.economyTransaction.create({
        data: {
          userId: victim.user.id,
          source: 'rob',
          amount: -amount,
          balanceAfter: updatedVictim.wallet + updatedVictim.bank,
          type: 'ROB',
          description: `Robbed by ${discordId}`
        }
      });
      return { success, amount, user: updatedAttacker };
    }

    const updatedAttacker = await tx.user.update({
      where: { id: attacker.user.id },
      data: { wallet: attacker.user.wallet - amount, lastRob: new Date() }
    });
    await tx.economyTransaction.create({
      data: {
        userId: attacker.user.id,
        source: 'rob',
        amount: -amount,
        balanceAfter: updatedAttacker.wallet + updatedAttacker.bank,
        type: 'ROB',
        description: `Rob failed against ${targetDiscordId}`
      }
    });
    return { success, amount, user: updatedAttacker };
  });

  const message = result.success
    ? `Rob success! You stole ${result.amount} from <@${targetDiscordId}>.`
    : `Rob failed! You lost ${result.amount}.`;

  return { message, amount: result.amount, user: result.user };
}
