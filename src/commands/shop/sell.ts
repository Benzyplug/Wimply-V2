import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { getOrCreateUser } from '../../services/userService.js';
import { findItemByName } from '../../services/itemService.js';
import { sellItem } from '../../services/shopService.js';
import { formatCurrency } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('sell')
    .setDescription('Sell an item from your inventory')
    .addStringOption((option) =>
      option.setName('item').setDescription('Name of the item to sell').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('quantity').setDescription('How many to sell').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const itemName = interaction.options.getString('item', true);
    const quantity = interaction.options.getInteger('quantity') ?? 1;
    const { user, config } = await getOrCreateUser(interaction.user.id, interaction.guildId);
    const item = await findItemByName(config, itemName);

    if (!item) {
      await interaction.editReply({ content: 'Item not found in the shop.' });
      return;
    }

    const result = await sellItem(user, item, quantity);

    await interaction.editReply({
      embeds: [
        createSuccessEmbed(
          'Sell Complete',
          `Sold ${quantity} x ${item.name} for ${formatCurrency(result.totalGain, config.currencyEmoji)}.`
        )
      ]
    });
  }
};

export default command;
