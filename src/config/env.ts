import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1),
  CLIENT_ID: z.string().min(1),
  DATABASE_URL: z.string().url(),
  GUILD_ID: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info')
});

const parseResult = envSchema.safeParse(process.env);
if (!parseResult.success) {
  throw new Error(`Environment validation failed: ${parseResult.error.message}`);
}

export const env = parseResult.data;
