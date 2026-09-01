import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { getOrCreateUser } from '../../services/userService.js';
import { getInventory } from '../../services/inventoryService.js';
import { formatCurrency } from '../../utils/format.js';
import { STYLE } from '../../utils/presentation.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('networth')
    .setDescription('View a user total economy value')
    .addUserOption(option => option.setName('user').setDescription('User to inspect').setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const target = interaction.options.getUser('user') ?? interaction.user;
    const { user, config } = await getOrCreateUser(target.id, interaction.guildId);
    const inventory = await getInventory(user);
    const netWorth = user.wallet + user.bank;
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(STYLE.title('💎', `${target.username}'s Net Worth`)).setThumbnail(target.displayAvatarURL({ size: 256 })).setDescription(`〢 **Wallet:** ${formatCurrency(user.wallet, config.currencyEmoji)}\n〢 **Bank:** ${formatCurrency(user.bank, config.currencyEmoji)}\n〢 **Net worth:** **${formatCurrency(netWorth, config.currencyEmoji)}**\n〢 **Inventory:** ${inventory.length} unique item${inventory.length === 1 ? '' : 's'}\n\n${STYLE.stamp}`).setFooter({ text: STYLE.brand }).setTimestamp()] });
  }
};
export default command;
