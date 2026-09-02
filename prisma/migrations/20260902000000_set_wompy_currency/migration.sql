ALTER TABLE "GuildConfig" ALTER COLUMN "currencyName" SET DEFAULT 'Wompy';
ALTER TABLE "GuildConfig" ALTER COLUMN "currencyEmoji" SET DEFAULT 'Wompy';
UPDATE "GuildConfig" SET "currencyName" = 'Wompy', "currencyEmoji" = 'Wompy' WHERE "currencyName" = 'Coins' AND "currencyEmoji" = '🪙';
