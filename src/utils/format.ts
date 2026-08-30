import { AppError } from './errors.js';
export function formatCurrency(amount: bigint, emoji = '🪙'): string {
  const formatted = Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(Number(amount));
  return `${emoji} ${formatted}`;
}

export function parsePositiveAmount(value: string): bigint {
  const parsed = BigInt(value.replace(/[^0-9]/g, ''));
  if (parsed <= 0n) {
    throw new AppError('Amount must be greater than zero.');
  }
  return parsed;
}

export function formatDuration(ms: number): string {
  if (ms <= 0) return '0s';
  const seconds = Math.floor(ms / 1000) % 60;
  const minutes = Math.floor(ms / 60000) % 60;
  const hours = Math.floor(ms / 3600000) % 24;
  const days = Math.floor(ms / 86400000);
  const parts = [];

  if (days) parts.push(`${days}d`);
  if (hours) parts.push(`${hours}h`);
  if (minutes) parts.push(`${minutes}m`);
  if (seconds) parts.push(`${seconds}s`);

  return parts.join(' ');
}
