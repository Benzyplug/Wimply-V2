-- Existing cooldowns were stored as hours. Preserve their meaning while switching the schema to seconds.
UPDATE "GuildConfig" SET
  "dailyCooldown" = "dailyCooldown" * 3600,
  "weeklyCooldown" = "weeklyCooldown" * 3600,
  "monthlyCooldown" = "monthlyCooldown" * 3600,
  "workCooldown" = "workCooldown" * 3600,
  "crimeCooldown" = "crimeCooldown" * 3600,
  "robCooldown" = "robCooldown" * 3600,
  "begCooldown" = "begCooldown" * 3600;
