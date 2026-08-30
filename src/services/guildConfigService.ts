import { prisma } from './database.js';
import type { GuildConfig } from '@prisma/client';
import { log } from '../utils/logger.js';

export async function getOrCreateGuildConfig(discordGuildId: string): Promise<GuildConfig> {
  let config = await prisma.guildConfig.findUnique({ where: { guildId: discordGuildId } });
  if (!config) {
    config = await prisma.guildConfig.create({
      data: {
        guildId: discordGuildId
      }
    });
    log.info(`Created default guild configuration for ${discordGuildId}`, 'GuildConfig');
  }
  return config;
}

export async function updateGuildConfig(discordGuildId: string, data: Partial<GuildConfig>): Promise<GuildConfig> {
  const config = await getOrCreateGuildConfig(discordGuildId);
  return prisma.guildConfig.update({
    where: { id: config.id },
    data: {
      ...data,
      updatedAt: new Date()
    }
  });
}
