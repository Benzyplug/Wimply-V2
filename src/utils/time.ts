export function getCooldownRemaining(lastUsed: Date | null, cooldownSeconds: number): number {
  if (!lastUsed) return 0;
  const msSince = Date.now() - lastUsed.getTime();
  const duration = cooldownSeconds * 1000;
  return Math.max(duration - msSince, 0);
}

export function isCooldownActive(lastUsed: Date | null, cooldownSeconds: number): boolean {
  return getCooldownRemaining(lastUsed, cooldownSeconds) > 0;
}
