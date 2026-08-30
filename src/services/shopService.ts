import { AppError } from '../utils/errors.js';
import { prisma } from './database.js';
import type { GuildConfig, Item, User } from '@prisma/client';
import { addInventoryItem, removeInventoryItem } from './inventoryService.js';
import { getOrCreateUser } from './userService.js';

export async function purchaseItem(user: User, item: Item, quantity: number) {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than zero.');
  }

  if (item.stock !== null && item.stock < quantity) {
    throw new AppError('This item does not have enough available quantity.');
  }

  const totalCost = item.price * BigInt(quantity);
  if (user.wallet < totalCost) {
    throw new AppError('You do not have enough money in your wallet to purchase this item.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet - totalCost }
    });

    if (item.stock !== null) {
      await tx.item.update({
        where: { id: item.id },
        data: { stock: item.stock - quantity }
      });
    }

    await tx.economyTransaction.create({
      data: {
        userId: user.id,
        source: 'purchase',
        amount: -totalCost,
        balanceAfter: updatedUser.wallet + updatedUser.bank,
        type: 'PURCHASE',
        description: `Purchased ${quantity} x ${item.name}`
      }
    });

    // Grant the item inside the same transaction so a failure here rolls back
    // the payment/stock changes too, instead of charging the user for nothing.
    await addInventoryItem(user, item, quantity, tx);

    return updatedUser;
  });

  return { user: updated, totalCost };
}

export async function sellItem(user: User, item: Item, quantity: number) {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than zero.');
  }

  const totalGain = item.sellPrice * BigInt(quantity);

  const updatedUser = await prisma.$transaction(async (tx) => {
    // Remove the item and credit the wallet in the same transaction so a failure
    // partway through can't leave the user paid-but-not-debited or vice versa.
    await removeInventoryItem(user, item, quantity, tx);

    const updated = await tx.user.update({
      where: { id: user.id },
      data: { wallet: user.wallet + totalGain }
    });

    await tx.economyTransaction.create({
      data: {
        userId: user.id,
        source: 'sell',
        amount: totalGain,
        balanceAfter: updated.wallet + updated.bank,
        type: 'SELL',
        description: `Sold ${quantity} x ${item.name}`
      }
    });

    return updated;
  });

  return { user: updatedUser, totalGain };
}

export async function listShop(guildConfig: GuildConfig) {
  return prisma.item.findMany({
    where: { guildId: guildConfig.id },
    orderBy: [{ limited: 'desc' }, { category: 'asc' }, { name: 'asc' }]
  });
}

export async function purchaseItemByName(discordId: string, guildId: string, name: string, quantity: number) {
  const { user, config } = await getOrCreateUser(discordId, guildId);
  const item = await prisma.item.findFirst({
    where: { guildId: config.id, name: { equals: name, mode: 'insensitive' } }
  });
  if (!item) {
    throw new AppError('Item not found.');
  }
  return purchaseItem(user, item, quantity);
}
