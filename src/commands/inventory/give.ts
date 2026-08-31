import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { AppError } from '../../utils/errors.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { getOrCreateUser } from '../../services/userService.js';
import { findItemByName } from '../../services/itemService.js';
import { addInventoryItem, removeInventoryItem } from '../../services/inventoryService.js';
import { prisma } from '../../services/database.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('give')
    .setDescription('Give an item from your inventory to another user')
    .addUserOption((option) => option.setName('user').setDescription('Recipient').setRequired(true))
    .addStringOption((option) => option.setName('item').setDescription('Item to give').setRequired(true))
    .addIntegerOption((option) => option.setName('quantity').setDescription('Quantity to give').setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const target = interaction.options.getUser('user', true);
    const itemName = interaction.options.getString('item', true);
    const quantity = interaction.options.getInteger('quantity') ?? 1;

    if (target.id === interaction.user.id) {
      throw new AppError('You cannot give an item to yourself.');
    }

    const { user, config } = await getOrCreateUser(interaction.user.id, interaction.guildId);
    const targetToken = await getOrCreateUser(target.id, interaction.guildId);
    const item = await findItemByName(config, itemName);

    if (!item) {
      await interaction.editReply({ content: 'Item not found in the shop.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      await removeInventoryItem(user, item, quantity, tx);
      await addInventoryItem(targetToken.user, item, quantity, tx);
    });

    await interaction.editReply({
      embeds: [createSuccessEmbed('Item Gifted', `Gave ${quantity} x ${item.emoji} ${item.name} to ${target.tag}.`)]
    });
  }
};

export default command;
