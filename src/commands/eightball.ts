import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { STYLE } from '../utils/presentation.js';

const answers = ['Absolutely. 🎯', 'Not today. 💀', 'The odds look good. 🍀', 'Ask again. 👀', 'Definitely. 🔥', 'I would not bet on it. 😭', 'Signs point to yes. ✨', 'The answer is hiding. 🫥'];
const command: Command = {
  data: new SlashCommandBuilder().setName('eightball').setDescription('Ask Wimply a chaotic 8-ball question').addStringOption(o => o.setName('question').setDescription('Your yes/no question').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const question = interaction.options.getString('question', true);
    const answer = answers[Math.floor(Math.random() * answers.length)];
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(STYLE.title('🔮', 'Wimply 8-Ball')).setDescription(`〢 **Question:** ${question}\n\n╭─〔 🎱 ANSWER 〕─╮\n〢 **${answer}**\n╰─〔 ✨ Fate has spoken 〕─╯\n\n${STYLE.stamp}`).setFooter({ text: STYLE.brand }).setTimestamp()] });
  }
};
export default command;
