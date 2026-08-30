import { PrismaClient } from '@prisma/client';
import { log } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: [{ level: 'error', emit: 'event' }, { level: 'warn', emit: 'event' }]
});

prisma.$on('error', (error) => {
  log.error('Prisma client error', 'Database', error);
});

prisma.$on('warn', (event) => {
  log.warn(event.message, 'Database');
});

export async function connectDatabase() {
  await prisma.$connect();
  log.info('Connected to PostgreSQL database', 'Database');
}
