import { EmbedBuilder, Colors } from 'discord.js';

const BRAND_FOOTER = 'Wimply V2.0 • Built by SHAX ⚡';

export function createDefaultEmbed() {
  return new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTimestamp()
    .setFooter({ text: BRAND_FOOTER });
}

export function createSuccessEmbed(title: string, description: string) {
  return createDefaultEmbed()
    .setTitle(`╭─〔 ✨ ${title} 〕─╮`)
    .setDescription(`〢 ${description}`)
    .setColor(Colors.Green);
}

export function createErrorEmbed(description: string) {
  return createDefaultEmbed()
    .setTitle('╭─〔 🚫 WIMPLY ERROR 〕─╮')
    .setDescription(`〢 ${description}`)
    .setColor(Colors.Red);
}

export function createInfoEmbed(title: string, description: string) {
  return createDefaultEmbed()
    .setTitle(`╭─〔 ℹ️ ${title} 〕─╮`)
    .setDescription(`〢 ${description}`)
    .setColor(Colors.Blurple);
}

export function brandEmbed(embed: EmbedBuilder, clientUser?: { displayAvatarURL: (options?: { size?: number }) => string } | null) {
  if (clientUser) {
    embed.setThumbnail(clientUser.displayAvatarURL({ size: 128 }));
  }
  return embed.setFooter({ text: BRAND_FOOTER });
}
