import { prisma } from './database.js';
import type { Item, GuildConfig } from '@prisma/client';

export async function getShopItems(guildConfig: GuildConfig) {
  return prisma.item.findMany({
    where: { guildId: guildConfig.id },
    orderBy: [{ category: 'asc' }, { name: 'asc' }]
  });
}

export async function findItemByName(guildConfig: GuildConfig, name: string): Promise<Item | null> {
  return prisma.item.findFirst({
    where: {
      guildId: guildConfig.id,
      name: { equals: name, mode: 'insensitive' }
    }
  });
}

export async function createItem(guildConfig: GuildConfig, data: {
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
  return prisma.item.create({
    data: {
      guildId: guildConfig.id,
      ...data
    }
  });
}

export async function updateItem(itemId: string, updates: Partial<Item>) {
  return prisma.item.update({ where: { id: itemId }, data: updates });
}

export async function deleteItem(itemId: string) {
  await prisma.item.delete({ where: { id: itemId } });
}
