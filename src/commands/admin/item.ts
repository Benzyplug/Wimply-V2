import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { assertAdmin } from '../../utils/permission.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { findItemByName } from '../../services/itemService.js';
import { createShopItem, editShopItem, deleteShopItem, giveUserItem, takeUserItem } from '../../services/adminService.js';
import { getOrCreateUser } from '../../services/userService.js';
import { parsePositiveAmount } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('item')
    .setDescription('Manage shop items and inventory for users')
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Create a new shop item')
        .addStringOption((option) => option.setName('name').setDescription('Item name').setRequired(true))
        .addStringOption((option) => option.setName('description').setDescription('Item description').setRequired(true))
        .addStringOption((option) => option.setName('emoji').setDescription('Item emoji').setRequired(true))
        .addStringOption((option) => option.setName('category').setDescription('Item category').setRequired(true))
        .addStringOption((option) => option.setName('price').setDescription('Item price').setRequired(true))
        .addStringOption((option) => option.setName('sell_price').setDescription('Sell price').setRequired(true))
        .addIntegerOption((option) => option.setName('stock').setDescription('Stock amount').setRequired(false))
        .addBooleanOption((option) => option.setName('limited').setDescription('Is item limited?').setRequired(false))
        .addBooleanOption((option) => option.setName('stackable').setDescription('Is item stackable?').setRequired(false))
        .addBooleanOption((option) => option.setName('usable').setDescription('Is item usable?').setRequired(false))
        .addStringOption((option) => option.setName('boost_type').setDescription('Boost type: coins, xp, role').setRequired(false))
        .addStringOption((option) => option.setName('boost_target').setDescription('Boost target, e.g. role ID').setRequired(false))
        .addIntegerOption((option) => option.setName('boost_value').setDescription('Boost value amount').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('edit')
        .setDescription('Edit an existing shop item')
        .addStringOption((option) => option.setName('item').setDescription('Item name').setRequired(true))
        .addStringOption((option) => option.setName('description').setDescription('Item description').setRequired(false))
        .addStringOption((option) => option.setName('emoji').setDescription('Item emoji').setRequired(false))
        .addStringOption((option) => option.setName('category').setDescription('Item category').setRequired(false))
        .addStringOption((option) => option.setName('price').setDescription('Item price').setRequired(false))
        .addStringOption((option) => option.setName('sell_price').setDescription('Sell price').setRequired(false))
        .addIntegerOption((option) => option.setName('stock').setDescription('Stock amount').setRequired(false))
        .addBooleanOption((option) => option.setName('limited').setDescription('Is item limited?').setRequired(false))
        .addBooleanOption((option) => option.setName('stackable').setDescription('Is item stackable?').setRequired(false))
        .addBooleanOption((option) => option.setName('usable').setDescription('Is item usable?').setRequired(false))
        .addStringOption((option) => option.setName('boost_type').setDescription('Boost type: coins, xp, role').setRequired(false))
        .addStringOption((option) => option.setName('boost_target').setDescription('Boost target, e.g. role ID').setRequired(false))
        .addIntegerOption((option) => option.setName('boost_value').setDescription('Boost value amount').setRequired(false))
    )
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Delete a shop item')
        .addStringOption((option) => option.setName('item').setDescription('Item name').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('give')
        .setDescription('Give an item to a user')
        .addUserOption((option) => option.setName('user').setDescription('User to receive item').setRequired(true))
        .addStringOption((option) => option.setName('item').setDescription('Item name').setRequired(true))
        .addIntegerOption((option) => option.setName('quantity').setDescription('Quantity to give').setRequired(true))
    )
    .addSubcommand((sub) =>
      sub
        .setName('take')
        .setDescription('Remove an item from a user')
        .addUserOption((option) => option.setName('user').setDescription('User to remove item from').setRequired(true))
        .addStringOption((option) => option.setName('item').setDescription('Item name').setRequired(true))
        .addIntegerOption((option) => option.setName('quantity').setDescription('Quantity to remove').setRequired(true))
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    assertAdmin(interaction);
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);

    if (subcommand === 'create') {
      const name = interaction.options.getString('name', true);
      const description = interaction.options.getString('description', true);
      const emoji = interaction.options.getString('emoji', true);
      const category = interaction.options.getString('category', true);
      const price = parsePositiveAmount(interaction.options.getString('price', true));
      const sellPrice = parsePositiveAmount(interaction.options.getString('sell_price', true));
      const stock = interaction.options.getInteger('stock') ?? null;
      const limited = interaction.options.getBoolean('limited') ?? false;
      const stackable = interaction.options.getBoolean('stackable') ?? true;
      const usable = interaction.options.getBoolean('usable') ?? false;
      const boostType = interaction.options.getString('boost_type');
      const boostTarget = interaction.options.getString('boost_target');
      const boostValue = interaction.options.getInteger('boost_value') ?? null;

      await createShopItem(interaction.guildId, {
        name,
        description,
        emoji,
        category,
        price,
        sellPrice,
        stock,
        limited,
        stackable,
        usable,
        boostType: boostType ?? null,
        boostValue,
        boostTarget: boostTarget ?? null
      });

      await interaction.editReply({ embeds: [createSuccessEmbed('Item Created', `${emoji} ${name} was added to the shop.`)] });
      return;
    }

    const itemName = interaction.options.getString('item', true);
    const item = await findItemByName(guildConfig, itemName);
    if (!item) {
      await interaction.editReply({ content: 'Item not found in this guild shop.', ephemeral: true });
      return;
    }

    if (subcommand === 'edit') {
      const updates: any = {};
      const description = interaction.options.getString('description');
      const emoji = interaction.options.getString('emoji');
      const category = interaction.options.getString('category');
      const price = interaction.options.getString('price');
      const sellPrice = interaction.options.getString('sell_price');
      const stock = interaction.options.getInteger('stock');
      const limited = interaction.options.getBoolean('limited');
      const stackable = interaction.options.getBoolean('stackable');
      const usable = interaction.options.getBoolean('usable');
      const boostType = interaction.options.getString('boost_type');
      const boostTarget = interaction.options.getString('boost_target');
      const boostValue = interaction.options.getInteger('boost_value');

      if (description) updates.description = description;
      if (emoji) updates.emoji = emoji;
      if (category) updates.category = category;
      if (price) updates.price = parsePositiveAmount(price);
      if (sellPrice) updates.sellPrice = parsePositiveAmount(sellPrice);
      if (stock !== null) updates.stock = stock;
      if (limited !== null) updates.limited = limited;
      if (stackable !== null) updates.stackable = stackable;
      if (usable !== null) updates.usable = usable;
      if (boostType !== null) updates.boostType = boostType;
      if (boostTarget !== null) updates.boostTarget = boostTarget;
      if (boostValue !== null) updates.boostValue = boostValue;

      await editShopItem(item, updates);
      await interaction.editReply({ embeds: [createSuccessEmbed('Item Updated', `${item.name} has been updated.`)] });
      return;
    }

    if (subcommand === 'delete') {
      await deleteShopItem(item);
      await interaction.editReply({ embeds: [createSuccessEmbed('Item Deleted', `${item.name} has been removed from the shop.`)] });
      return;
    }

    const target = interaction.options.getUser('user', true);
    const quantity = interaction.options.getInteger('quantity', true);
    const targetToken = await getOrCreateUser(target.id, interaction.guildId);

    if (subcommand === 'give') {
      await giveUserItem(targetToken.user, item, quantity);
      await interaction.editReply({ embeds: [createSuccessEmbed('Item Granted', `Gave ${quantity} x ${item.name} to ${target.tag}.`)] });
      return;
    }

    if (subcommand === 'take') {
      await takeUserItem(targetToken.user, item, quantity);
      await interaction.editReply({ embeds: [createSuccessEmbed('Item Removed', `Removed ${quantity} x ${item.name} from ${target.tag}.`)] });
      return;
    }
  }
};

export default command;
