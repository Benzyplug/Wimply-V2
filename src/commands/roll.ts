import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { STYLE } from '../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('roll').setDescription('Roll dice with NdM notation').addStringOption(o => o.setName('dice').setDescription('Examples: d20, 2d6, 3d8').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const input = interaction.options.getString('dice', true).toLowerCase().replace(/\s+/g, '');
    const match = input.match(/^(\d*)d(\d+)$/);
    if (!match) { await interaction.reply({ content: '〢 🎲 Use `d20`, `2d6`, `3d8`, etc.' }); return; }
    const count = Math.max(1, Math.min(20, Number(match[1] || 1)));
    const sides = Math.max(2, Math.min(1000, Number(match[2])));
    const rolls = Array.from({ length: count }, () => Math.floor(Math.random() * sides) + 1);
    const total = rolls.reduce((sum, value) => sum + value, 0);
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(STYLE.title('🎲', 'Wimply Dice')).setDescription(`〢 **Roll:** \`${count}d${sides}\`\n〢 **Results:** ${rolls.map(value => `**${value}**`).join(' • ')}\n〢 **Total:** **${total}**\n\n${STYLE.stamp}`).setFooter({ text: STYLE.brand }).setTimestamp()] });
  }
};
export default command;
