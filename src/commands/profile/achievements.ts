import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { prisma } from '../../services/database.js';
import { getOrCreateUser } from '../../services/userService.js';
import { formatCurrency } from '../../utils/format.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('achievements')
    .setDescription('View unlocked and locked Wimply achievements')
    .addUserOption(option => option.setName('user').setDescription('User to inspect').setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) { await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true }); return; }
    await interaction.deferReply();
    const target = interaction.options.getUser('user') ?? interaction.user;
    const { user } = await getOrCreateUser(target.id, interaction.guildId);
    const gameTransactions = await prisma.economyTransaction.findMany({ where: { userId: user.id, source: { in: ['blackjack','coinflip','dice','higherlower','mines','slot','snailgarden'] } }, select: { amount: true } });
    const played = gameTransactions.filter(t => t.amount < 0n).length;
    const wins = gameTransactions.filter(t => t.amount > 0n).length;
    const netWorth = user.wallet + user.bank;
    const checks = [
      ['🌟 Level Up', user.level >= 2, 'Reach level 2'],
      ['💰 Money Maker', netWorth >= 10_000n, 'Reach 10,000 net worth'],
      ['💎 Wealthy', netWorth >= 100_000n, 'Reach 100,000 net worth'],
      ['🎰 Lucky Winner', wins >= 10, 'Win 10 casino rounds'],
      ['🎮 Game Regular', played >= 50, 'Play 50 casino rounds'],
      ['🏆 High Roller', played >= 100, 'Play 100 casino rounds'],
      ['📊 XP Grinder', user.xp >= 1_000, 'Earn 1,000 XP'],
      ['🪙 Banked', user.bank >= 50_000n, 'Hold 50,000 in the bank']
    ] as const;
    const unlocked = checks.filter(([, ok]) => ok);
    const locked = checks.filter(([, ok]) => !ok);
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🏆 ${target.username}'s Achievements`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(`**${unlocked.length}/${checks.length} unlocked**\n\n${unlocked.map(([name]) => `🏅 **${name}**`).join('\n') || 'No achievements unlocked yet.'}`)
      .addFields({ name: '🔒 NEXT TARGETS', value: locked.map(([name, , requirement]) => `▫️ **${name}** — ${requirement}`).join('\n') || 'Everything unlocked.' })
      .setFooter({ text: `Net worth ${formatCurrency(netWorth, '🪙')} • Level ${user.level}` });
    await interaction.editReply({ embeds: [embed] });
  }
};
export default command;
