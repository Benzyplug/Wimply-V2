import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { prisma } from '../../services/database.js';
import { getOrCreateGuildConfig } from '../../services/guildConfigService.js';
import { assertAdmin } from '../../utils/permission.js';
import { createDefaultEmbed } from '../../utils/embeds.js';
import { formatCurrency } from '../../utils/format.js';

const PAGE_SIZE = 10;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Open the server economy admin dashboard')
    .addIntegerOption(option =>
      option.setName('page').setDescription('User page to display').setMinValue(1).setMaxValue(100)
    ),
  async execute(interaction: ChatInputCommandInteraction) {
    assertAdmin(interaction);
    if (!interaction.guildId) return;
    await interaction.deferReply({ ephemeral: true });

    const config = await getOrCreateGuildConfig(interaction.guildId);
    const page = interaction.options.getInteger('page') ?? 1;
    const skip = (page - 1) * PAGE_SIZE;

    const [users, inventoryItems, transactions, totalWallet, totalBank, userRows] = await Promise.all([
      prisma.user.count({ where: { guildId: config.id } }),
      prisma.inventoryItem.count({ where: { user: { guildId: config.id } } }),
      prisma.economyTransaction.count({ where: { user: { guildId: config.id } } }),
      prisma.user.aggregate({ where: { guildId: config.id }, _sum: { wallet: true } }),
      prisma.user.aggregate({ where: { guildId: config.id }, _sum: { bank: true } }),
      prisma.user.findMany({
        where: { guildId: config.id },
        orderBy: [{ wallet: 'desc' }, { updatedAt: 'asc' }],
        skip,
        take: PAGE_SIZE
      })
    ]);

    const pages = Math.max(1, Math.ceil(users / PAGE_SIZE));
    const displayedUsers = userRows.length
      ? userRows.map((user, index) => {
          const rank = skip + index + 1;
          return `**${rank}.** <@${user.discordId}>\n〢 💰 Wallet: **${formatCurrency(user.wallet, config.currencyEmoji)}** • 🏦 Bank: **${formatCurrency(user.bank, config.currencyEmoji)}** • ⭐ Lv.${user.level}`;
        }).join('\n')
      : '〢 No users have economy data yet.';

    const totalWalletValue = totalWallet._sum.wallet ?? 0n;
    const totalBankValue = totalBank._sum.bank ?? 0n;
    const embed = createDefaultEmbed()
      .setTitle('╭─〔 📊 WIMPLY ECONOMY DASHBOARD 〕─╮')
      .setDescription(`〢 **Server:** ${interaction.guild?.name ?? 'Unknown'}\n〢 **Currency:** ${config.currencyEmoji} ${config.currencyName}\n〢 **Page:** ${page}/${pages}\n\n╭〔 📈 GLOBAL METRICS 〕╮\n〢 👥 Users: **${users}**\n〢 💰 Total wallet: **${formatCurrency(totalWalletValue, config.currencyEmoji)}**\n〢 🏦 Total bank: **${formatCurrency(totalBankValue, config.currencyEmoji)}**\n〢 🎒 Inventory records: **${inventoryItems}**\n〢 📜 Transactions: **${transactions}**`)
      .addFields(
        { name: `╭ 👤 USERS • ${skip + 1}-${Math.min(skip + PAGE_SIZE, users)} 〕`, value: displayedUsers, inline: false },
        { name: '╭ ⚙️ ECONOMY CONFIG 〕', value: `🪙 Currency: **${config.currencyEmoji} ${config.currencyName}**\n🎁 Daily: **${config.dailyCooldown}h** • 🛠️ Work: **${config.workCooldown}h** • 🚨 Crime: **${config.crimeCooldown}h**\n🏦 Interest: **${(config.interestRate * 100).toFixed(2)}%** • 🧾 Tax: **${config.taxPercent}%** • ⭐ XP: **${config.xpEnabled ? 'ON' : 'OFF'}**`, inline: false },
        { name: '╰─〔 🧭 NAVIGATION 〕─╯', value: `〢 Use **/dashboard page:${Math.min(pages, page + 1)}** for the next page.\n〢 Use **/economy** and **/item** for administration.`, inline: false }
      )
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }));

    await interaction.editReply({ embeds: [embed] });
  }
};

export default command;
