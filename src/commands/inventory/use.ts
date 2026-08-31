import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { getOrCreateUser, updateWallet } from '../../services/userService.js';
import { findItemByName } from '../../services/itemService.js';
import { removeInventoryItem } from '../../services/inventoryService.js';
import { prisma } from '../../services/database.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use an item from your inventory')
    .addStringOption((option) => option.setName('item').setDescription('Item to use').setRequired(true))
    .addIntegerOption((option) => option.setName('quantity').setDescription('Quantity to use').setRequired(false)),
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

    if (!item || !item.usable) {
      await interaction.editReply({ content: 'That item cannot be used or does not exist.' });
      return;
    }

    await removeInventoryItem(user, item, quantity);

    let resultMessage = `You used ${quantity} x ${item.emoji} ${item.name}.`;

    if (item.boostType === 'coins' && item.boostValue) {
      const totalBonus = BigInt(item.boostValue) * BigInt(quantity);
      await updateWallet(user.id, totalBonus, `Used ${item.name}`);
      resultMessage += ` You gained ${totalBonus} coins.`;
    }

    if (item.boostType === 'xp' && item.boostValue) {
      await prisma.user.update({
        where: { id: user.id },
        data: { xp: user.xp + item.boostValue * quantity }
      });
      resultMessage += ` You gained ${item.boostValue * quantity} XP.`;
    }

    if (item.boostType === 'role' && item.boostTarget) {
      if (!interaction.guild) {
        await interaction.editReply({ content: 'This command must be used in a guild.' });
        return;
      }

      const member = await interaction.guild.members.fetch(interaction.user.id);

      if (!member.roles.cache.has(item.boostTarget)) {
        await member.roles.add(item.boostTarget);
        resultMessage += ' You were granted a role reward.';
      } else {
        resultMessage += ' You already have the role reward.';
      }
    }

    await interaction.editReply({
      embeds: [createSuccessEmbed('Item Used', resultMessage)]
    });
  }
};

export default command;
