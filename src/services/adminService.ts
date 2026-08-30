import { AppError } from '../utils/errors.js';
import { prisma } from './database.js';
import { addInventoryItem, removeInventoryItem } from './inventoryService.js';
import { createItem, deleteItem, updateItem } from './itemService.js';
import { getOrCreateGuildConfig, updateGuildConfig } from './guildConfigService.js';
import type { GuildConfig, Item, User } from '@prisma/client';

interface CurrencyUpdate {
  currencyName?: string;
  currencyEmoji?: string;
}

export async function setGuildConfig(guildId: string, data: CurrencyUpdate & Partial<Pick<GuildConfig, 'taxPercent' | 'interestRate' | 'dailyCooldown' | 'weeklyCooldown' | 'monthlyCooldown' | 'workCooldown' | 'crimeCooldown' | 'robCooldown' | 'begCooldown'>>): Promise<GuildConfig> {
  return updateGuildConfig(guildId, data);
}

export async function setUserBalances(user: User, wallet: bigint | null, bank: bigint | null) {
  const walletValue = wallet ?? user.wallet;
  const bankValue = bank ?? user.bank;
  if (walletValue < 0n || bankValue < 0n) {
    throw new AppError('Balance values cannot be negative.');
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { wallet: walletValue, bank: bankValue }
  });

  await prisma.economyTransaction.create({
    data: {
      userId: user.id,
      source: 'admin',
      amount: walletValue + bankValue,
      balanceAfter: walletValue + bankValue,
      type: 'ADMIN',
      description: 'Admin balance update'
    }
  });

  return updatedUser;
}

export async function adjustUserBalance(user: User, walletDelta: bigint, bankDelta: bigint) {
  const walletValue = user.wallet + walletDelta;
  const bankValue = user.bank + bankDelta;
  if (walletValue < 0n || bankValue < 0n) {
    throw new AppError('Resulting balance cannot be negative.');
  }

  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: { wallet: walletValue, bank: bankValue }
  });

  await prisma.economyTransaction.create({
    data: {
      userId: user.id,
      source: 'admin',
      amount: walletDelta + bankDelta,
      balanceAfter: walletValue + bankValue,
      type: 'ADMIN',
      description: 'Admin balance adjustment'
    }
  });

  return updatedUser;
}

export async function resetUserEconomy(user: User) {
  await prisma.$transaction([
    prisma.inventoryItem.deleteMany({ where: { userId: user.id } }),
    prisma.economyTransaction.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        wallet: 0n,
        bank: 0n,
        xp: 0,
        level: 1,
        badges: [],
        lastDaily: null,
        lastWeekly: null,
        lastMonthly: null,
        lastWork: null,
        lastCrime: null,
        lastRob: null,
        lastBeg: null
      }
    })
  ]);
}

export async function resetGuildEconomy(guildId: string) {
  const config = await getOrCreateGuildConfig(guildId);
  await prisma.$transaction([
    prisma.inventoryItem.deleteMany({ where: { user: { guildId: config.id } } }),
    prisma.economyTransaction.deleteMany({ where: { user: { guildId: config.id } } }),
    prisma.user.updateMany({
      where: { guildId: config.id },
      data: {
        wallet: 0n,
        bank: 0n,
        xp: 0,
        level: 1,
        badges: [],
        lastDaily: null,
        lastWeekly: null,
        lastMonthly: null,
        lastWork: null,
        lastCrime: null,
        lastRob: null,
        lastBeg: null
      }
    })
  ]);
}

export async function giveUserItem(user: User, item: Item, quantity: number) {
  return addInventoryItem(user, item, quantity);
}

export async function takeUserItem(user: User, item: Item, quantity: number) {
  return removeInventoryItem(user, item, quantity);
}

export async function createShopItem(guildId: string, data: {
  name: string;
  description: string;
  emoji: string;
  category: string;
  price: bigint;
  sellPrice: bigint;
  stock?: number | null;
  limited?: boolean;
  stackable?: boolean;
  usable?: boolean;
  boostType?: string | null;
  boostValue?: number | null;
  boostTarget?: string | null;
}) {
  const config = await getOrCreateGuildConfig(guildId);
  return createItem(config, data);
}

export async function editShopItem(item: Item, updates: Partial<Item>) {
  return updateItem(item.id, updates);
}

export async function deleteShopItem(item: Item) {
  return deleteItem(item.id);
}
