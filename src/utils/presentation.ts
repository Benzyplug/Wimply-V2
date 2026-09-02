import { EmbedBuilder } from 'discord.js';

const BRAND = 'Wimply is created and developed by ẞ€ÑZ¥.';
const DEFAULT_COLOR = 0x5865f2;
const BOT_VERSION = 'Wimply V2.5.8';
const LEGACY_STAMP = /╰─〔\s*⚡\s*〢\s*(?:Wimply V2\.(?:0|1|1\.1)\s*•\s*)?Made by ẞ€ÑZ¥\s*〢\s*⚡\s*〕─╯/g;
const LEGACY_BOX = /[╭╮╰╯]─〔[^〕]*〕─[╮╯]/g;
type ClientUserLike = { username?: string; bannerURL?: (...args: any[]) => string | null | undefined; displayAvatarURL: (...args: any[]) => string };
type MessagePayloadLike = { embeds?: unknown[]; content?: string; [key: string]: unknown };
type GuildLike = { emojis?: { cache?: { find: (predicate: (emoji: { name?: string | null }) => boolean) => unknown } } };

function cleanText(value: string | null | undefined) {
  if (!value) return value;
  return value.replace(LEGACY_STAMP, '').replace(LEGACY_BOX, '').replace(/(^|\n)\s*〢\s*/g, '$1').replace(/\n{3,}/g, '\n\n').trim();
}

export function getWimplyLogo(guild?: GuildLike | null): string {
  const emoji = guild?.emojis?.cache?.find(emoji => emoji.name === 'Wimply_logo') as { toString?: () => string } | undefined;
  return emoji?.toString?.() ?? 'Wimply';
}

export function getBotBanner(clientUser: ClientUserLike): string {
  return clientUser.bannerURL?.({ size: 2048 }) ?? clientUser.displayAvatarURL({ size: 1024 });
}

function isCasinoFinalTitle(title: string | null | undefined) {
  if (!title) return false;
  const normalized = title.toUpperCase();
  return normalized.includes('CASHED OUT') || normalized.includes('• HIT') || normalized.includes('• LOST') || normalized.includes('ROAD CLEARED') || normalized.includes('GAME OVER') || normalized.includes('BLACKJACK •') || normalized.includes('COINFLIP •') || normalized.includes('DICE •') || normalized.includes('SLOT •') || normalized.includes('SNAIL GARDEN •');
}

export function decorateEmbed(input: unknown, clientUser?: ClientUserLike | null) {
  const embed = input instanceof EmbedBuilder ? EmbedBuilder.from(input) : EmbedBuilder.from(input as any);
  if (!embed.data.color) embed.setColor(DEFAULT_COLOR);
  if (!embed.data.timestamp) embed.setTimestamp();
  const title = cleanText(embed.data.title);
  const description = cleanText(embed.data.description);
  if (title !== undefined) embed.setTitle(title);
  if (description !== undefined) embed.setDescription(description);
  embed.setFooter({ text: BRAND });
  if (!embed.data.author && clientUser) embed.setAuthor({ name: clientUser.username ?? 'Wimply', iconURL: clientUser.displayAvatarURL({ size: 64 }) });
  if (clientUser && isCasinoFinalTitle(title) && !embed.data.image?.url) embed.setImage(getBotBanner(clientUser));
  return embed;
}

export function polishPayload<T extends MessagePayloadLike | string>(payload: T, clientUser?: ClientUserLike | null): T {
  if (typeof payload === 'string' || !payload) return payload;
  const objectPayload = payload as MessagePayloadLike;
  if (!Array.isArray(objectPayload.embeds)) return payload;
  return Object.assign({}, objectPayload, { embeds: objectPayload.embeds.map(embed => decorateEmbed(embed, clientUser)) }) as T;
}

export function balanceMessage(current: bigint, required: bigint, action: string, emoji = 'Wompy') {
  const missing = required > current ? required - current : 0n;
  if (missing > 0n) return `💳 **Wallet check**\nBalance: **${current.toLocaleString()} ${emoji}**\nRequired: **${required.toLocaleString()} ${emoji}**\nMissing: **${missing.toLocaleString()} ${emoji}**\nYou need **${missing.toLocaleString()} ${emoji}** more to ${action}.`;
  return `💳 **Wallet check**\nBalance: **${current.toLocaleString()} ${emoji}**\nRequired: **${required.toLocaleString()} ${emoji}**\nStatus: ✅ Ready to ${action}.`;
}

export const STYLE = { version: BOT_VERSION, brand: BRAND, stamp: BRAND, title: (emoji: string, text: string) => `${emoji} ${text.toUpperCase()}`, line: (emoji: string, text: string) => `${emoji} ${text}`, bottom: (emoji = '〢', text = 'ẞ€ÑZ¥') => `${emoji} ${text}` };
