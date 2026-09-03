import type { APIEmbed } from 'discord.js';

export const MAINTENANCE_VERSION = 'Wimply V3.2.0';

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
      `🛠️ Wimply is currently taking a development break while the next major update is being prepared.\n\n` +
      `🏖️ **ẞ€ÑZ¥ is currently enjoying a well-earned beach break.**\n` +
      `The owner is away for a little while, but Wimply is still being shaped behind the scenes.\n\n` +
      `🚀 **What is coming:** better games, smoother systems, fresh features, and plenty of surprises.\n` +
      `💙 **Thank you** to everyone who has used Wimply, tested it, reported issues, and supported the project.\n\n` +
      `⏳ **Wimply V3.2.0 is coming soon.**\n` +
      `Please check back later — the next chapter is being prepared.`,
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
