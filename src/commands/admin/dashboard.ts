import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { prisma } from '../../services/database.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { assertAdmin } from '../../utils/permission.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency } from '../../utils/format.js';

const PAGE_SIZE = 10;

function valueOr<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback;
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Open the server economy admin dashboard')
    .addIntegerOption(option => option.setName('page').setDescription('User page to display').setMinValue(1).setMaxValue(100)),
  async execute(interaction: ChatInputCommandInteraction) {
    assertAdmin(interaction);
    if (!interaction.guildId) return;
    await interaction.deferReply({ ephemeral: true });

    const config = await getOrCreateGuildConfig(interaction.guildId);
    const page = interaction.options.getInteger('page') ?? 1;
    const skip = (page - 1) * PAGE_SIZE;

    const results = await Promise.allSettled([
      prisma.user.count({ where: { guildId: config.id } }),
      prisma.inventoryItem.count({ where: { user: { guildId: config.id } } }),
      prisma.economyTransaction.count({ where: { user: { guildId: config.id } } }),
      prisma.user.aggregate({ where: { guildId: config.id }, _sum: { wallet: true } }),
      prisma.user.aggregate({ where: { guildId: config.id }, _sum: { bank: true } }),
      prisma.user.findMany({ where: { guildId: config.id }, orderBy: [{ wallet: 'desc' }, { updatedAt: 'asc' }], skip, take: PAGE_SIZE })
    ]);

    const users = valueOr(results[0], 0);
    const inventoryItems = valueOr(results[1], 0);
    const transactions = valueOr(results[2], 0);
    const totalWallet = valueOr(results[3], { _sum: { wallet: null as bigint | null } });
    const totalBank = valueOr(results[4], { _sum: { bank: null as bigint | null } });
    const userRows = valueOr(results[5], []);
    const pages = Math.max(1, Math.ceil(users / PAGE_SIZE));
    const safePage = Math.min(page, pages);
    const displayedUsers = userRows.length
      ? userRows.map((user, index) => `**${skip + index + 1}.** <@${user.discordId}>\n💰 Wallet: **${formatCurrency(user.wallet, config.currencyEmoji)}** • 🏦 Bank: **${formatCurrency(user.bank, config.currencyEmoji)}** • ⭐ Lv.${user.level}`).join('\n')
      : 'No users have economy data yet.';

    const embed = createDefaultEmbed()
      .setTitle('📊 WIMPLY ECONOMY DASHBOARD')
      .setDescription(`**Server:** ${interaction.guild?.name ?? 'Unknown'}\n**Currency:** ${config.currencyEmoji} ${config.currencyName}\n**Page:** ${safePage}/${pages}\n\n**GLOBAL METRICS**\n👥 Users: **${users}**\n💰 Total wallet: **${formatCurrency(totalWallet._sum.wallet ?? 0n, config.currencyEmoji)}**\n🏦 Total bank: **${formatCurrency(totalBank._sum.bank ?? 0n, config.currencyEmoji)}**\n🎒 Inventory records: **${inventoryItems}**\n📜 Transactions: **${transactions}**`)
      .addFields(
        { name: `👤 USERS • ${users ? skip + 1 : 0}-${Math.min(skip + PAGE_SIZE, users)}`, value: displayedUsers, inline: false },
        { name: '⚙️ ECONOMY CONFIG', value: `🪙 Currency: **${config.currencyEmoji} ${config.currencyName}**\n🎁 Daily: **${config.dailyCooldown}s** • 🛠️ Work: **${config.workCooldown}s** • 🚨 Crime: **${config.crimeCooldown}s**\n🏦 Interest: **${(config.interestRate * 100).toFixed(2)}%** • ⭐ XP: **${config.xpEnabled ? 'ON' : 'OFF'}**`, inline: false },
        { name: '🧭 NAVIGATION', value: `Use **/dashboard page:${Math.min(pages, safePage + 1)}** for the next page.\nUse **/economy** and **/item** for administration.`, inline: false }
      )
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }));

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
