import { EmbedBuilder } from 'discord.js';

const BRAND = '╰─〔 ⚡ 〢 Made by ẞ€ÑZ¥ 〢 ⚡ 〕─╯';
const DEFAULT_COLOR = 0x5865f2;
const BOT_VERSION = 'Wimply V2.1.1';
const LEGACY_STAMP = /╰─〔\s*⚡\s*〢\s*Wimply V2\.1\.1\s*•\s*Made by ẞ€ÑZ¥\s*〢\s*⚡\s*〕─╯/g;
const LEGACY_FOOTER = /╰─〔\s*⚡\s*〢\s*Made by ẞ€ÑZ¥\s*〢\s*⚡\s*〕─╯/g;
const TOP_BOX = /╭─〔\s*([^〕]+?)\s*〕─╮/g;
const BOTTOM_BOX = /╰─〔\s*([^〕]+?)\s*〕─╯/g;

type ClientUserLike = {
  username?: string;
  displayAvatarURL: (options?: { size?: number }) => string;
  bannerURL?: (options?: { size?: number }) => string | null | undefined;
};
type MessagePayloadLike = { embeds?: unknown[]; content?: string; [key: string]: unknown };

function cleanText(value: string | null | undefined) {
  if (!value) return value;
  return value.replace(LEGACY_STAMP, '').replace(LEGACY_FOOTER, '').replace(TOP_BOX, '$1').replace(BOTTOM_BOX, '$1').replace(/\n{3,}/g, '\n\n').trim();
}

export function decorateEmbed(input: unknown, clientUser?: ClientUserLike | null) {
  const embed = input instanceof EmbedBuilder ? EmbedBuilder.from(input) : EmbedBuilder.from(input as any);
  if (!embed.data.color) embed.setColor(DEFAULT_COLOR);
  if (!embed.data.timestamp) embed.setTimestamp();
  const cleanedTitle = cleanText(embed.data.title);
  if (cleanedTitle !== undefined) embed.setTitle(cleanedTitle);
  const cleanedDescription = cleanText(embed.data.description);
  if (cleanedDescription !== undefined) embed.setDescription(cleanedDescription);
  const banner = clientUser?.bannerURL?.({ size: 1024 }) ?? null;
  embed.setFooter(banner ? { text: BRAND, iconURL: banner } : { text: BRAND });
  if (!embed.data.author && clientUser) embed.setAuthor({ name: clientUser.username ?? 'Wimply', iconURL: clientUser.displayAvatarURL({ size: 64 }) });
  if (!embed.data.thumbnail && clientUser) embed.setThumbnail(clientUser.displayAvatarURL({ size: 128 }));
  if (!embed.data.image && banner) embed.setImage(banner);
  return embed;
}

export function polishPayload<T extends MessagePayloadLike | string>(payload: T, clientUser?: ClientUserLike | null): T {
  if (typeof payload === 'string' || !payload) return payload;
  const objectPayload = payload as MessagePayloadLike;
  if (!Array.isArray(objectPayload.embeds)) return payload;
  return Object.assign({}, objectPayload, { embeds: objectPayload.embeds.map(embed => decorateEmbed(embed, clientUser)) }) as T;
}

export function balanceMessage(current: bigint, required: bigint, action: string, emoji = '🪙') {
  const missing = required > current ? required - current : 0n;
  if (missing > 0n) return `💳 **Wallet check**\nBalance: **${current.toLocaleString()} ${emoji}**\nRequired: **${required.toLocaleString()} ${emoji}**\nMissing: **${missing.toLocaleString()} ${emoji}**\nYou need **${missing.toLocaleString()} ${emoji}** more to ${action}.`;
  return `💳 **Wallet check**\nBalance: **${current.toLocaleString()} ${emoji}**\nRequired: **${required.toLocaleString()} ${emoji}**\nStatus: ✅ Ready to ${action}.`;
}

export const STYLE = {
  version: BOT_VERSION,
  brand: BRAND,
  stamp: BRAND,
  title: (emoji: string, text: string) => `${emoji} ${text.toUpperCase()}`,
  line: (emoji: string, text: string) => `${emoji} ${text}`,
  bottom: (emoji = '⚡', text = 'ẞ€ÑZ¥') => `${emoji} ${text}`
};
