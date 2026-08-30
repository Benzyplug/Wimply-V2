import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { getInventory } from '../../services/inventoryService.js';
import { getOrCreateUser } from '../../services/userService.js';

const command: Command = {
  data: new SlashCommandBuilder().setName('inventory').setDescription('View your inventory'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();

    const { user } = await getOrCreateUser(interaction.user.id, interaction.guildId);
    const items = await getInventory(user);
    const embed = createDefaultEmbed().setTitle(`${interaction.user.username}'s Inventory`);

    if (items.length === 0) {
      embed.setDescription('Your inventory is empty.');
    } else {
      embed.setDescription(items.map((entry) => `${entry.item.emoji} **${entry.item.name}** x${entry.quantity} - ${entry.item.description}`).join('\n'));
    }

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
