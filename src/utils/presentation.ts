import { EmbedBuilder } from 'discord.js';

const BRAND = 'Wimply V2.0 • Built by SHAX ⚡';
const DEFAULT_COLOR = 0x5865f2;

type ClientUserLike = {
  username?: string;
  displayAvatarURL: (options?: { size?: number }) => string;
};

type MessagePayloadLike = {
  embeds?: unknown[];
  [key: string]: unknown;
};

export function decorateEmbed(input: unknown, clientUser?: ClientUserLike | null) {
  const embed = input instanceof EmbedBuilder ? EmbedBuilder.from(input) : EmbedBuilder.from(input as any);
  if (!embed.data.color) embed.setColor(DEFAULT_COLOR);
  if (!embed.data.timestamp) embed.setTimestamp();
  if (!embed.data.footer) embed.setFooter({ text: BRAND });
  if (!embed.data.author && clientUser) {
    embed.setAuthor({
      name: clientUser.username ?? 'Wimply',
      iconURL: clientUser.displayAvatarURL({ size: 64 })
    });
  }
  if (!embed.data.thumbnail && clientUser) {
    embed.setThumbnail(clientUser.displayAvatarURL({ size: 128 }));
  }
  return embed;
}

export function polishPayload<T extends MessagePayloadLike | string>(payload: T, clientUser?: ClientUserLike | null): T {
  if (typeof payload === 'string' || !payload || !Array.isArray(payload.embeds)) return payload;
  const objectPayload = payload as MessagePayloadLike;
  const polished: MessagePayloadLike = {
    ...objectPayload,
    embeds: objectPayload.embeds!.map((embed) => decorateEmbed(embed, clientUser))
  };
  return polished as T;
}

export function balanceMessage(current: bigint, required: bigint, action: string, emoji = '🪙') {
  const missing = required > current ? required - current : 0n;
  if (missing > 0n) {
    return `╭─〔 💳 WALLET CHECK 〕─╮\n〢 **Balance:** ${current.toLocaleString()} ${emoji}\n〢 **Required:** ${required.toLocaleString()} ${emoji}\n〢 **Missing:** ${missing.toLocaleString()} ${emoji}\n〢 You need **${missing.toLocaleString()} ${emoji}** more to ${action}.\n╰─〔 📈 Earn more with #work • #daily • #beg 〕─╯`;
  }
  return `╭─〔 💳 WALLET CHECK 〕─╮\n〢 **Balance:** ${current.toLocaleString()} ${emoji}\n〢 **Required:** ${required.toLocaleString()} ${emoji}\n〢 **Status:** ✅ Ready to ${action}.\n╰─〔 ⚡ Wimply Economy 〕─╯`;
}

export const STYLE = {
  title: (emoji: string, text: string) => `╭─〔 ${emoji} ${text.toUpperCase()} 〕─╮`,
  line: (emoji: string, text: string) => `〢 ${emoji} ${text}`,
  bottom: (emoji = '⚡', text = 'Wimply V2.0 • Built by SHAX') => `╰─〔 ${emoji} ${text} 〕─╯`
};
