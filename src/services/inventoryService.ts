import { AppError } from '../utils/errors.js';
import { prisma } from './database.js';
import type { Item, User, Prisma } from '@prisma/client';

// Accepts either the top-level PrismaClient or a $transaction callback client,
// so these functions can be composed inside another service's transaction.
type PrismaClientOrTx = typeof prisma | Prisma.TransactionClient;

export async function getInventory(user: User) {
  return prisma.inventoryItem.findMany({
    where: { userId: user.id },
    include: { item: true },
    orderBy: { acquiredAt: 'desc' }
  });
}

export async function addInventoryItem(user: User, item: Item, quantity: number, tx: PrismaClientOrTx = prisma) {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than zero.');
  }

  return tx.inventoryItem.upsert({
    where: { userId_itemId: { userId: user.id, itemId: item.id } },
    update: { quantity: { increment: quantity } },
    create: {
      userId: user.id,
      itemId: item.id,
      quantity
    }
  });
}

export async function removeInventoryItem(user: User, item: Item, quantity: number, tx: PrismaClientOrTx = prisma) {
  if (quantity <= 0) {
    throw new AppError('Quantity must be greater than zero.');
  }

  const existing = await tx.inventoryItem.findUnique({
    where: { userId_itemId: { userId: user.id, itemId: item.id } }
  });

  if (!existing || existing.quantity < quantity) {
    throw new AppError('You do not have enough of that item to remove.');
  }

  if (existing.quantity === quantity) {
    return tx.inventoryItem.delete({ where: { id: existing.id } });
  }

  return tx.inventoryItem.update({
    where: { id: existing.id },
    data: { quantity: existing.quantity - quantity }
  });
}

export async function getInventoryItem(user: User, item: Item) {
  return prisma.inventoryItem.findUnique({
    where: { userId_itemId: { userId: user.id, itemId: item.id } }
  });
}
