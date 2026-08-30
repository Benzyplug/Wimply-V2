import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { purchaseItemByName } from '../../services/shopService.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { formatCurrency } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('buy')
    .setDescription('Buy an item from the shop')
    .addStringOption((option) =>
      option.setName('item').setDescription('Name of the item to buy').setRequired(true)
    )
    .addIntegerOption((option) =>
      option.setName('quantity').setDescription('How many to buy').setRequired(false)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const itemName = interaction.options.getString('item', true);
    const quantity = interaction.options.getInteger('quantity') ?? 1;
    const result = await purchaseItemByName(interaction.user.id, interaction.guildId, itemName, quantity);
    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);

    await interaction.editReply({
      embeds: [
        createSuccessEmbed('Purchase Complete', `Bought ${quantity} x ${itemName} for ${formatCurrency(result.totalCost, guildConfig.currencyEmoji)}.`)
      ]
    });
  }
};

export default command;
