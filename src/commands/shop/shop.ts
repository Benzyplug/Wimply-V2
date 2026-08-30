import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { listShop } from '../../services/shopService.js';
import { formatCurrency } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('shop').setDescription('View available shop items'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const guildConfig = await getOrCreateGuildConfig(interaction.guildId);
    const items = await listShop(guildConfig);
    const embed = createDefaultEmbed().setTitle('Shop Items');

    if (items.length === 0) {
      embed.setDescription('No items are currently listed in the shop.');
    } else {
      embed.setDescription(
        items
          .map((item) =>
            `${item.emoji} **${item.name}** (${item.category}) — ${item.description}\nPrice: ${formatCurrency(item.price, guildConfig.currencyEmoji)} | Sell: ${formatCurrency(item.sellPrice, guildConfig.currencyEmoji)} | Stock: ${item.stock ?? 'Unlimited'}`
          )
          .join('\n\n')
      );
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
