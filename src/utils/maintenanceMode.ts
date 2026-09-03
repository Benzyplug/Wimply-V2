import type { APIEmbed } from 'discord.js';

export const MAINTENANCE_ENABLED = true;
export const MAINTENANCE_VERSION = 'Wimply V3.2.0';
export const MAINTENANCE_OWNER_MENTION = '<@1317480616048070656>';

export interface MaintenancePayload {
  content: string;
  embeds: [APIEmbed];
  allowedMentions: { parse: [] };
}

export function buildMaintenanceMessage(logo: string, banner: string): MaintenancePayload {
  const embed: APIEmbed = {
    title: `${logo} WIMPLY IS IN DEVELOPMENT`,
    description:
      `**${MAINTENANCE_VERSION} • COMING SOON**\n\n` +
      `🛠️ **Wimply is currently in development.**\n` +
      `The economy, games, and other command systems are temporarily offline while the next update is being prepared.\n\n` +
      `🏖️ **Owner:** ${MAINTENANCE_OWNER_MENTION}\n` +
      `ẞ€ÑZ¥ is currently taking a well-earned beach break. 🌊\n\n` +
      `🚀 **V3.2.0 will bring:** better games, smoother systems, fresh features, and more improvements.\n\n` +
      `💙 **Thank you** to everyone who has used Wimply, tested it, reported issues, and supported the project.\n\n` +
      `⏳ **Wimply V3.2.0 is coming soon.**\n` +
      `Please check back later for the next chapter.`,
    image: { url: banner },
    footer: { text: 'Wimply • Created and developed by ẞ€ÑZ¥.' },
    timestamp: new Date().toISOString()
  };

  return {
    content: '',
    embeds: [embed],
    allowedMentions: { parse: [] }
  };
}
