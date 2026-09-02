ALTER TABLE "GuildConfig" ADD COLUMN "levelUpEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "GuildConfig" ADD COLUMN "levelUpMessage" TEXT NOT NULL DEFAULT '🎉 {user} reached **Level {level}**!';
