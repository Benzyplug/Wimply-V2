import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency } from '../../utils/format.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { prisma } from '../../services/database.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('leaderboard').setDescription('View the top economy leaderboard'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);
    const topUsers = await prisma.user.findMany({
      where: { guildId: guildConfig.id },
      orderBy: [{ wallet: 'desc' }, { bank: 'desc' }],
      take: 10
    });

    const embed = createDefaultEmbed().setTitle('Economy Leaderboard');
    if (topUsers.length === 0) {
      embed.setDescription('No users are ranked yet.');
    } else {
      embed.setDescription(
        topUsers
          .map((user, index) => {
            const total = user.wallet + user.bank;
            return `**${index + 1}.** <@${user.discordId}> — Wallet: ${formatCurrency(user.wallet, guildConfig.currencyEmoji)} • Bank: ${formatCurrency(user.bank, guildConfig.currencyEmoji)} • Total: ${formatCurrency(total, guildConfig.currencyEmoji)}`;
          })
          .join('\n')
      );
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
