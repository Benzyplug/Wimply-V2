import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check bot latency and health'),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply({ content: `Pong! Latency is ${interaction.client.ws.ping}ms.` });
  }
};

export default command;
