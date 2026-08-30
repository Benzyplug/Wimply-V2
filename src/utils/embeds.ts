import { EmbedBuilder, Colors } from 'discord.js';

export function createDefaultEmbed() {
  return new EmbedBuilder().setColor(Colors.Blurple).setTimestamp();
}

export function createSuccessEmbed(title: string, description: string) {
  return createDefaultEmbed().setTitle(title).setDescription(description).setColor(Colors.Green);
}

export function createErrorEmbed(description: string) {
  return createDefaultEmbed().setTitle('Error').setDescription(description).setColor(Colors.Red);
}
