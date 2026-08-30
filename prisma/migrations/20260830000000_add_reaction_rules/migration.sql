CREATE TABLE "ReactionRule" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReactionRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReactionRule_guildId_channelId_idx" ON "ReactionRule"("guildId", "channelId");

ALTER TABLE "ReactionRule" ADD CONSTRAINT "ReactionRule_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "GuildConfig"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
