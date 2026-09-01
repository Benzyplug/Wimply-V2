import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { getInventory } from '../../services/inventoryService.js';
import { getOrCreateUser } from '../../services/userService.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('inventory')
    .setDescription('View a user inventory')
    .addUserOption(option => option.setName('user').setDescription('User to inspect').setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) {
      await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true });
      return;
    }

    await interaction.deferReply();
    const target = interaction.options.getUser('user') ?? interaction.user;
    const { user } = await getOrCreateUser(target.id, interaction.guildId);
    const items = await getInventory(user);
    const embed = createDefaultEmbed().setTitle(`${target.username}'s Inventory`).setThumbnail(target.displayAvatarURL({ size: 256 }));

    if (items.length === 0) embed.setDescription(`${target.username} has an empty inventory.`);
    else embed.setDescription(items.map((entry) => `${entry.item.emoji} **${entry.item.name}** x${entry.quantity} - ${entry.item.description}`).join('\n'));

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
