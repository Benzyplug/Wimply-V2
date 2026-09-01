import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { STYLE } from '../utils/presentation.js';

const fortunes = [
  'A risky move pays off when you stop hesitating. 🎯',
  'Your next grind session looks profitable. 💰',
  'Someone is about to notice your work. 👀',
  'Do not chase the first shiny option. ✨',
  'A small win is setting up a bigger one. 📈',
  'Your luck is suspiciously active today. 🍀',
  'Patience is your strongest multiplier. 🧠'
];
const command: Command = {
  data: new SlashCommandBuilder().setName('fortune').setDescription('Get a random Wimply fortune'),
  async execute(interaction: ChatInputCommandInteraction) {
    const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(STYLE.title('🔮', 'Wimply Fortune')).setDescription(`╭─〔 🧿 TODAY'S FORTUNE 〕─╮\n〢 **${fortune}**\n╰─〔 Take it or ignore it. 😈 〕─╯\n\n${STYLE.stamp}`).setFooter({ text: STYLE.brand }).setTimestamp()] });
  }
};
export default command;
