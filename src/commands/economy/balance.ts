import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency } from '../../utils/format.js';
import { getBalance } from '../../services/economyService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('balance')
    .setDescription('View a user wallet and bank balance')
    .addUserOption(option => option.setName('user').setDescription('User to inspect').setRequired(false)),

  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();
    const target = interaction.options.getUser('user') ?? interaction.user;
    const { user, config } = await getBalance(target.id, interaction.guildId);

    const embed = createDefaultEmbed()
      .setTitle(`${target.username}'s Balance`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: 'Wallet', value: formatCurrency(user.wallet, config.currencyEmoji), inline: true },
        { name: 'Bank', value: formatCurrency(user.bank, config.currencyEmoji), inline: true },
        { name: 'Total / Net Worth', value: formatCurrency(user.wallet + user.bank, config.currencyEmoji), inline: true },
        { name: 'Level / XP', value: `Level ${user.level} • ${user.xp} XP`, inline: false }
      );

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
