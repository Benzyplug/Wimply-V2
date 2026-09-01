import type { Message } from 'discord.js';
import { prisma } from './database.js';
import { log } from '../utils/logger.js';

export interface ReactionRuleInput {
  trigger: string;
  emoji: string;
  channelId: string;
}

const BUILT_IN_REACTIONS: Array<{ triggers: string[]; emojis: string[] }> = [
  { triggers: ['dice', '#dice', '/dice'], emojis: ['🎲', '🎯'] },
  { triggers: ['slot', '#slot', '/slot'], emojis: ['🎰', '✨'] },
  { triggers: ['coinflip', 'coin flip', 'flip', '#coinflip', '/coinflip'], emojis: ['🪙', '🔄'] },
  { triggers: ['blackjack', '#blackjack', '/blackjack'], emojis: ['🃏', '♠️'] },
  { triggers: ['higherlower', 'higher lower', '#higherlower', '/higherlower'], emojis: ['📈', '🎯'] },
  { triggers: ['mines', '#mines', '/mines'], emojis: ['💣', '💎'] },
  { triggers: ['snailgarden', 'snail garden', '#snailgarden', '/snailgarden'], emojis: ['🐌', '🌱'] },
  { triggers: ['balance', 'wallet', 'cash', '#balance', '/balance'], emojis: ['🪙', '💰'] },
  { triggers: ['daily', '#daily', '/daily'], emojis: ['🎁', '✨'] },
  { triggers: ['work', '#work', '/work'], emojis: ['💼', '💵'] },
  { triggers: ['beg', '#beg', '/beg'], emojis: ['🥺', '🪙'] },
  { triggers: ['profile', '#profile', '/profile'], emojis: ['👤', '📊'] },
  { triggers: ['inventory', 'inv', '#inventory', '#inv', '/inventory'], emojis: ['🎒', '📦'] },
  { triggers: ['leaderboard', '#leaderboard', '/leaderboard'], emojis: ['🏆', '📊'] },
  { triggers: ['help', 'commands', '#help', '#commands', '/help'], emojis: ['📖', '🧭'] },
  { triggers: ['owner', '#owner', '/owner'], emojis: ['👑', '🛠️'] },
  { triggers: ['bot', '#bot', '/bot'], emojis: ['🤖', '⚡'] }
];

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

  const matches = rules.filter((rule) => normalizedContent.includes(rule.trigger.toLowerCase()));
  const seen = new Set(matches.map((rule) => rule.emoji));

  for (const group of BUILT_IN_REACTIONS) {
    if (!group.triggers.some((trigger) => normalizedContent.includes(trigger))) continue;
    for (const emoji of group.emojis) {
      if (seen.has(emoji)) continue;
      seen.add(emoji);
      matches.push({
        id: `builtin:${group.triggers[0]}:${emoji}`,
        guildId,
        channelId,
        trigger: group.triggers[0],
        emoji,
        createdAt: new Date()
      });
    }
  }

  return matches;
}

export async function reactToMatchingMessage(
  message: Message | null | undefined,
  guildId: string,
  channelId: string,
  triggerContent: string
) {
  if (!message) return;

  const rules = await getMatchingReactionRules(guildId, channelId, triggerContent);
  for (const rule of rules) {
    try {
      await message.react(rule.emoji);
    } catch (error) {
      log.warn(`Failed to react with ${rule.emoji} for rule ${rule.id}: ${error instanceof Error ? error.message : String(error)}`, 'Reaction');
    }
  }
}
