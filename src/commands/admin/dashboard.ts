import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { prisma } from '../../services/database.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { assertAdmin } from '../../utils/permission.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Open the server economy admin dashboard'),
  async execute(interaction: ChatInputCommandInteraction) {
    assertAdmin(interaction);
    if (!interaction.guildId) return;
    await interaction.deferReply({ ephemeral: true });

    const config = await getOrCreateGuildConfig(interaction.guildId);
    const [users, inventoryItems, transactions, topUsers] = await Promise.all([
      prisma.user.count({ where: { guildId: config.id } }),
      prisma.inventoryItem.count({ where: { user: { guildId: config.id } } }),
      prisma.economyTransaction.count({ where: { user: { guildId: config.id } } }),
      prisma.user.findMany({ where: { guildId: config.id }, orderBy: { wallet: 'desc' }, take: 10 })
    ]);

    const walletTotal = topUsers.reduce((sum, user) => sum + user.wallet, 0n);
    const bankTotal = topUsers.reduce((sum, user) => sum + user.bank, 0n);
    const leaders = topUsers.length
      ? topUsers.map((user, index) => `**${index + 1}.** <@${user.discordId}> • ${formatCurrency(user.wallet, config.currencyEmoji)}`).join('\n')
      : 'No users yet.';

    const embed = createDefaultEmbed()
      .setTitle('╭─〔 📊 WIMPLY ECONOMY DASHBOARD 〕─╮')
      .setDescription(`〢 **Server:** ${interaction.guild?.name ?? 'Unknown'}\n〢 **Currency:** ${config.currencyEmoji} ${config.currencyName}\n\n╭〔 📈 Metrics 〕╮\n〢 Users: **${users}**\n〢 Inventory records: **${inventoryItems}**\n〢 Transactions: **${transactions}**\n〢 Top-10 wallet total: **${formatCurrency(walletTotal, config.currencyEmoji)}**\n〢 Top-10 bank total: **${formatCurrency(bankTotal, config.currencyEmoji)}**`)
      .addFields({ name: '🏆 Top Wallets', value: leaders, inline: false })
      .addFields({ name: '⚙️ Config', value: `Daily: ${config.dailyCooldown}h • Work: ${config.workCooldown}h • Tax: ${config.taxPercent}% • XP: ${config.xpEnabled ? 'ON' : 'OFF'}`, inline: false })
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }));

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
