import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { getOrCreateUser } from '../../services/userService.js';
import { getInventory } from '../../services/inventoryService.js';
import { formatCurrency } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('profile').setDescription('View your economy profile'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const { user, config } = await getOrCreateUser(interaction.user.id, interaction.guildId);
    const inventory = await getInventory(user);
    const embed = createDefaultEmbed()
      .setTitle(`${interaction.user.username}'s Profile`)
      .addFields(
        { name: 'Currency', value: `${config.currencyEmoji} ${config.currencyName}`, inline: true },
        { name: 'Level / XP', value: `Level ${user.level} • ${user.xp} XP`, inline: true },
        { name: 'Badges', value: user.badges.length ? user.badges.join(' • ') : 'None', inline: false },
        { name: 'Joined', value: `<t:${Math.floor(user.joinedAt.getTime() / 1000)}:R>`, inline: true },
        { name: 'Inventory', value: `${inventory.length} unique item${inventory.length === 1 ? '' : 's'}`, inline: true },
        { name: 'Wallet / Bank', value: `${formatCurrency(user.wallet, config.currencyEmoji)} / ${formatCurrency(user.bank, config.currencyEmoji)}`, inline: false }
      );

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
