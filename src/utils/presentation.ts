import { EmbedBuilder } from 'discord.js';

const BRAND = '╰─〔 ⚡ 〢 Made by Benzy 〢 〕─╯';
const DEFAULT_COLOR = 0x5865f2;

type ClientUserLike = {
  username?: string;
  displayAvatarURL: (options?: { size?: number }) => string;
  bannerURL?: (options?: { size?: number }) => string | null;
};
type MessagePayloadLike = { embeds?: unknown[]; [key: string]: unknown };

export function decorateEmbed(input: unknown, clientUser?: ClientUserLike | null) {
  const embed = input instanceof EmbedBuilder ? EmbedBuilder.from(input) : EmbedBuilder.from(input as any);
  if (!embed.data.color) embed.setColor(DEFAULT_COLOR);
  if (!embed.data.timestamp) embed.setTimestamp();
  embed.setFooter({ text: BRAND });
  if (!embed.data.author && clientUser) embed.setAuthor({ name: clientUser.username ?? 'Wimply', iconURL: clientUser.displayAvatarURL({ size: 64 }) });
  if (!embed.data.thumbnail && clientUser) embed.setThumbnail(clientUser.displayAvatarURL({ size: 128 }));
  if (!embed.data.image && clientUser?.bannerURL) {
    const banner = clientUser.bannerURL({ size: 1024 });
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
  if (missing > 0n) return `╭─〔 💳 WALLET CHECK 〕─╮\n〢 **Balance:** ${current.toLocaleString()} ${emoji}\n〢 **Required:** ${required.toLocaleString()} ${emoji}\n〢 **Missing:** ${missing.toLocaleString()} ${emoji}\n〢 You need **${missing.toLocaleString()} ${emoji}** more to ${action}.\n╰─〔 📈 Earn more with #work • #daily • #beg 〕─╯`;
  return `╭─〔 💳 WALLET CHECK 〕─╮\n〢 **Balance:** ${current.toLocaleString()} ${emoji}\n〢 **Required:** ${required.toLocaleString()} ${emoji}\n〢 **Status:** ✅ Ready to ${action}.\n╰─〔 ⚡ Wimply Economy 〕─╯`;
}

export const STYLE = {
  title: (emoji: string, text: string) => `╭─〔 ${emoji} ${text.toUpperCase()} 〕─╮`,
  line: (emoji: string, text: string) => `〢 ${emoji} ${text}`,
  bottom: (emoji = '⚡', text = '〢 Made by Benzy 〢') => `╰─〔 ${emoji} ${text} 〕─╯`
};
