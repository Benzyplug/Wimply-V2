import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { STYLE } from '../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('choose').setDescription('Let Wimply choose between options').addStringOption(o => o.setName('options').setDescription('Separate choices with commas or |').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const raw = interaction.options.getString('options', true);
    const options = raw.split(/[|,]/).map(value => value.trim()).filter(Boolean).slice(0, 15);
    if (options.length < 2) { await interaction.reply({ content: '〢 🎯 Give me at least **2 options**, separated by commas or `|`.' }); return; }
    const chosen = options[Math.floor(Math.random() * options.length)];
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(STYLE.title('🎯', 'Wimply Chooses')).setDescription(`〢 **Options:** ${options.map(option => `\`${option}\``).join(' • ')}\n\n╭─〔 🎯 DECISION 〕─╮\n〢 **${chosen}**\n╰─〔 No take-backs. 😈 〕─╯\n\n${STYLE.stamp}`).setFooter({ text: STYLE.brand }).setTimestamp()] });
  }
};
export default command;
