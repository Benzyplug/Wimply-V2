import { EmbedBuilder, Colors } from 'discord.js';
import { decorateEmbed, STYLE } from './presentation.js';

const BRAND_FOOTER = 'Wimply V2.0 • Built by SHAX ⚡';

export function createDefaultEmbed() {
  return new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setTimestamp()
    .setFooter({ text: BRAND_FOOTER });
}

export function createSuccessEmbed(title: string, description: string) {
  return createDefaultEmbed()
    .setTitle(STYLE.title('✨', title))
    .setDescription(`〢 ${description}`)
    .setColor(Colors.Green);
}

export function createErrorEmbed(description: string) {
  return createDefaultEmbed()
    .setTitle(STYLE.title('🚫', 'Wimply Error'))
    .setDescription(`〢 ${description}\n\n${STYLE.bottom('🛠️', 'Try again or check /help')}`)
    .setColor(Colors.Red);
}

export function createInfoEmbed(title: string, description: string) {
  return createDefaultEmbed()
    .setTitle(STYLE.title('ℹ️', title))
    .setDescription(`〢 ${description}`)
    .setColor(Colors.Blurple);
}

export function brandEmbed(embed: EmbedBuilder, clientUser?: { username?: string; displayAvatarURL: (options?: { size?: number }) => string } | null) {
  return decorateEmbed(embed, clientUser);
}
