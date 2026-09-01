import type { Message } from 'discord.js';
import { prisma } from './database.js';
import { log } from '../utils/logger.js';

export interface ReactionRuleInput { trigger: string; emoji: string; channelId: string; }

const WIMPLY_LOGO_NAME = 'Wimply_logo';

const BUILT_IN_REACTIONS: Array<{ triggers: string[]; emojis: string[] }> = [
  { triggers: ['dice', '#dice', '/dice'], emojis: ['🎲', '🎯', '🍀', '😈'] },
  { triggers: ['slot', '#slot', '/slot'], emojis: ['🎰', '✨', '🍒', '💎'] },
  { triggers: ['coinflip', 'coin flip', 'flip', '#coinflip', '/coinflip'], emojis: ['🪙', '🔄', '🎯', '😏'] },
  { triggers: ['blackjack', '#blackjack', '/blackjack'], emojis: ['🃏', '♠️', '🎴', '🔥'] },
  { triggers: ['higherlower', 'higher lower', '#higherlower', '/higherlower'], emojis: ['📈', '🎯', '🧠', '👀'] },
  { triggers: ['mines', '#mines', '/mines'], emojis: ['💣', '💎', '🧨', '😳'] },
  { triggers: ['snailgarden', 'snail garden', '#snailgarden', '/snailgarden'], emojis: ['🐌', '🌱', '🏁', '🍃'] },
  { triggers: ['balance', 'wallet', 'cash', '#balance', '/balance'], emojis: ['🪙', '💰', '💳', '📈'] },
  { triggers: ['daily', '#daily', '/daily'], emojis: ['🎁', '✨', '💰', '🍀'] },
  { triggers: ['work', '#work', '/work'], emojis: ['💼', '💵', '🛠️', '📈'] },
  { triggers: ['beg', '#beg', '/beg'], emojis: ['🥺', '🪙', '🙏', '😭'] },
  { triggers: ['profile', '#profile', '/profile'], emojis: ['👤', '📊', '✨', '🏅'] },
  { triggers: ['inventory', 'inv', '#inventory', '#inv', '/inventory'], emojis: ['🎒', '📦', '🧰', '🔎'] },
  { triggers: ['leaderboard', '#leaderboard', '/leaderboard'], emojis: ['🏆', '📊', '🥇', '👑'] },
  { triggers: ['help', 'commands', '#help', '#commands', '/help'], emojis: ['📖', '🧭', '💡', '🤖'] },
  { triggers: ['owner', '#owner', '/owner'], emojis: ['👑', '🛠️', '⚡'] },
  { triggers: ['bot', '#bot', '/bot'], emojis: ['🤖', '⚡', '🧠', '🚀'] }
];

const DYNAMIC_REACTIONS = [
  { triggers: ['jackpot', 'won', 'win', 'winner', 'profit', 'secured', 'congrat', 'success', 'level up'], emojis: ['🎉', '🔥', '🤑', '🚀', '👏', '💎'] },
  { triggers: ['lost', 'loss', 'boom', 'failed', 'miss', 'broke', 'error'], emojis: ['💀', '😭', '💥', '🫠', '📉'] },
  { triggers: ['safe', 'correct', 'rare', 'legendary', 'amazing'], emojis: ['😮', '🔥', '👀', '🗿', '✨'] },
  { triggers: ['hello', 'hi ', 'hey ', 'welcome'], emojis: ['👋', '😎', '🤝', '🫡'] }
];

function pickRandom<T>(items: T[]): T | null { return items.length ? items[Math.floor(Math.random() * items.length)] : null; }

export async function addReactionRule(guildId: string, data: ReactionRuleInput) {
  return prisma.reactionRule.create({ data: { guildId, trigger: data.trigger.trim().toLowerCase(), emoji: data.emoji.trim(), channelId: data.channelId } });
}
export async function getReactionRules(guildId: string) { return prisma.reactionRule.findMany({ where: { guildId }, orderBy: { createdAt: 'asc' } }); }
export async function deleteReactionRule(guildId: string, id: string) { const rule = await prisma.reactionRule.findFirst({ where: { id, guildId } }); if (!rule) return null; await prisma.reactionRule.delete({ where: { id: rule.id } }); return rule; }
export async function clearReactionRules(guildId: string) { const result = await prisma.reactionRule.deleteMany({ where: { guildId } }); return result.count; }

function getLogo(message: Message): string | null {
  return message.guild?.emojis.cache.find(emoji => emoji.name === WIMPLY_LOGO_NAME)?.id ?? null;
}

async function chooseMatchingEmoji(guildId: string, channelId: string, content: string): Promise<string | null> {
  const normalized = content.toLowerCase();
  const customRules = await prisma.reactionRule.findMany({ where: { guildId, channelId } });
  const customMatch = pickRandom(customRules.filter(rule => normalized.includes(rule.trigger.toLowerCase())).map(rule => rule.emoji));
  if (customMatch) return customMatch;

  const candidates: string[] = [];
  for (const group of BUILT_IN_REACTIONS) {
    if (group.triggers.some(trigger => normalized.includes(trigger))) candidates.push(...group.emojis);
  }
  for (const group of DYNAMIC_REACTIONS) {
    if (group.triggers.some(trigger => normalized.includes(trigger))) candidates.push(...group.emojis);
  }
  return pickRandom([...new Set(candidates)]);
}

export async function reactToBotMessage(
  message: Message | null | undefined,
  guildId: string,
  channelId: string,
  triggerContent: string,
  preferredEmojis?: string[]
) {
  if (!message) return;

  const logo = getLogo(message);
  if (logo) {
    try { await message.react(logo); }
    catch (error) { log.warn(`Failed to react with ${WIMPLY_LOGO_NAME}: ${error instanceof Error ? error.message : String(error)}`, 'Reaction'); }
  }

  const matching = preferredEmojis?.length ? pickRandom(preferredEmojis) : await chooseMatchingEmoji(guildId, channelId, triggerContent);
  if (!matching || matching === logo) return;
  try { await message.react(matching); }
  catch (error) { log.warn(`Failed to react with ${matching}: ${error instanceof Error ? error.message : String(error)}`, 'Reaction'); }
}

export async function reactToMatchingMessage(message: Message | null | undefined, guildId: string, channelId: string, triggerContent: string) {
  await reactToBotMessage(message, guildId, channelId, triggerContent);
}
