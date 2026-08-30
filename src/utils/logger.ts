import pino from 'pino';
import { env } from '../config/env.js';

const logger = (pino as unknown as (opts: any) => any)({
  level: env.LOG_LEVEL,
  transport: process.env.NODE_ENV !== 'production' ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } } : undefined,
  base: { pid: false },
  timestamp: pino.stdTimeFunctions.isoTime
});

export const log = {
  info: (message: string, context?: string, meta?: Record<string, unknown>) => logger.info({ context, ...meta }, message),
  warn: (message: string, context?: string, meta?: Record<string, unknown>) => logger.warn({ context, ...meta }, message),
  error: (message: string, context?: string, error?: unknown, meta?: Record<string, unknown>) => {
    logger.error({ context, error, ...meta }, message);
  },
  debug: (message: string, context?: string, meta?: Record<string, unknown>) => logger.debug({ context, ...meta }, message)
};
