export function getCooldownRemaining(lastUsed: Date | null, cooldownHours: number): number {
  if (!lastUsed) return 0;
  const msSince = Date.now() - lastUsed.getTime();
  const duration = cooldownHours * 3600000;
  return Math.max(duration - msSince, 0);
}

export function isCooldownActive(lastUsed: Date | null, cooldownHours: number): boolean {
  return getCooldownRemaining(lastUsed, cooldownHours) > 0;
}
