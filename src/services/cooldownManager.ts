const cooldownStore = new Map<string, number>();

export function getCooldownKey(userId: string, action: string) {
  return `${userId}:${action}`;
}

export function isCooldownActive(userId: string, action: string): boolean {
  const key = getCooldownKey(userId, action);
  const expiration = cooldownStore.get(key);
  return typeof expiration === 'number' && expiration > Date.now();
}

export function getCooldownRemaining(userId: string, action: string): number {
  const key = getCooldownKey(userId, action);
  const expiration = cooldownStore.get(key);
  if (!expiration) return 0;
  return Math.max(expiration - Date.now(), 0);
}

export function setCooldown(userId: string, action: string, durationMs: number): void {
  const key = getCooldownKey(userId, action);
  cooldownStore.set(key, Date.now() + durationMs);
}

export function clearCooldown(userId: string, action: string): void {
  cooldownStore.delete(getCooldownKey(userId, action));
}
