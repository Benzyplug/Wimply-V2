import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { getOrCreateUser } from '../../services/userService.js';
import { findItemByName } from '../../services/itemService.js';
import { removeInventoryItem } from '../../services/inventoryService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('drop')
    .setDescription('Drop an item from your inventory')
    .addStringOption((option) => option.setName('item').setDescription('Item to drop').setRequired(true))
    .addIntegerOption((option) => option.setName('quantity').setDescription('Quantity to drop').setRequired(false)),
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
      await interaction.editReply({ content: 'Item not found in your inventory.' });
      return;
    }

    await removeInventoryItem(user, item, quantity);
    await interaction.editReply({ embeds: [createSuccessEmbed('Item Dropped', `Dropped ${quantity} x ${item.emoji} ${item.name}.`)] });
  }
};

export default command;
