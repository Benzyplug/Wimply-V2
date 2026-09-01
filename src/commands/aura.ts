import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { STYLE } from '../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('aura').setDescription('Generate your chaotic Wimply aura score'),
  async execute(interaction: ChatInputCommandInteraction) {
    const now = new Date();
    const seed = Number(interaction.user.id.slice(-8)) + now.getUTCDate() * 17;
    const score = Math.abs(seed) % 10001;
    const tier = score >= 9000 ? 'MYTHIC 👑' : score >= 7000 ? 'ELITE 🔥' : score >= 4000 ? 'SOLID ⚡' : 'NPC ENERGY 🗿';
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(STYLE.title('✨', 'Wimply Aura')).setDescription(`〢 **Aura:** \`${score.toLocaleString()}\`\n〢 **Tier:** **${tier}**\n〢 **Daily seed:** ${now.toISOString().slice(0, 10)}\n\n${STYLE.stamp}`).setFooter({ text: STYLE.brand }).setTimestamp()] });
  }
};
export default command;
