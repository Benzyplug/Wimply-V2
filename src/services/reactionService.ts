import { prisma } from './database.js';

export interface ReactionRuleInput {
  trigger: string;
  emoji: string;
  channelId: string;
}

export async function addReactionRule(guildId: string, data: ReactionRuleInput) {
  return prisma.reactionRule.create({
    data: {
      guildId,
      trigger: data.trigger.trim().toLowerCase(),
      emoji: data.emoji.trim(),
      channelId: data.channelId
    }
  });
}

export async function getReactionRules(guildId: string) {
  return prisma.reactionRule.findMany({
    where: { guildId },
    orderBy: { createdAt: 'asc' }
  });
}

export async function deleteReactionRule(guildId: string, id: string) {
  const rule = await prisma.reactionRule.findFirst({ where: { id, guildId } });
  if (!rule) return null;

  await prisma.reactionRule.delete({ where: { id: rule.id } });
  return rule;
}

export async function clearReactionRules(guildId: string) {
  const result = await prisma.reactionRule.deleteMany({ where: { guildId } });
  return result.count;
}

export async function getMatchingReactionRules(guildId: string, channelId: string, content: string) {
  const normalizedContent = content.toLowerCase();
  const rules = await prisma.reactionRule.findMany({
    where: { guildId, channelId }
  });

  return rules.filter((rule) => normalizedContent.includes(rule.trigger.toLowerCase()));
}
