import { EmbedBuilder } from 'discord.js';

const BRAND = '╰─〔 ⚡ 〢 Made by ẞ€ÑZ¥ 〢 ⚡ 〕─╯';
const DEFAULT_COLOR = 0x5865f2;
const BOT_VERSION = 'Wimply V2.1.1';

type ClientUserLike = {
  username?: string;
  displayAvatarURL: (options?: { size?: number }) => string;
  bannerURL?: (options?: { size?: number }) => string | null | undefined;
};
type MessagePayloadLike = { embeds?: unknown[]; content?: string; [key: string]: unknown };

export function decorateEmbed(input: unknown, clientUser?: ClientUserLike | null) {
  const embed = input instanceof EmbedBuilder ? EmbedBuilder.from(input) : EmbedBuilder.from(input as any);
  if (!embed.data.color) embed.setColor(DEFAULT_COLOR);
  if (!embed.data.timestamp) embed.setTimestamp();
  embed.setFooter({ text: BRAND });
  if (!embed.data.author && clientUser) embed.setAuthor({ name: clientUser.username ?? 'Wimply', iconURL: clientUser.displayAvatarURL({ size: 64 }) });
  if (!embed.data.thumbnail && clientUser) embed.setThumbnail(clientUser.displayAvatarURL({ size: 128 }));
  if (!embed.data.image && clientUser?.bannerURL) {
    const banner = clientUser.bannerURL({ size: 2048 });
    if (banner) embed.setImage(banner);
  }
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
  title: (emoji: string, text: string) => `${emoji} **${text.toUpperCase()}**`,
  line: (emoji: string, text: string) => `${emoji} ${text}`,
  bottom: (emoji = '⚡', text = 'ẞ€ÑZ¥') => `${emoji} ${text}`
};
