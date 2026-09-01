import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { STYLE } from '../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('ship').setDescription('Calculate a chaotic compatibility score').addUserOption(o => o.setName('user').setDescription('Person to ship with').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    const target = interaction.options.getUser('user', true);
    const seed = [...`${interaction.user.id}${target.id}`].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
    const score = seed % 101;
    const bar = '❤️'.repeat(Math.max(1, Math.round(score / 10))) + '🖤'.repeat(10 - Math.max(1, Math.round(score / 10)));
    const verdict = score >= 85 ? 'Certified power duo. 💍' : score >= 60 ? 'There is something here. 👀' : score >= 35 ? 'Chaotic potential. 😭' : 'Wimply says run. 🏃';
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0xed4245).setTitle(STYLE.title('💞', 'Wimply Ship')).setDescription(`〢 <@${interaction.user.id}> × <@${target.id}>\n\n**${score}%**\n${bar}\n\n╰─〔 ${verdict} 〕─╯\n\n${STYLE.stamp}`).setFooter({ text: STYLE.brand }).setTimestamp()] });
  }
};
export default command;
