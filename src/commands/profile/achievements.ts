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
    const transactions = await prisma.economyTransaction.findMany({ where: { userId: user.id, source: { in: ['blackjack','coinflip','dice','higherlower','mines','slot','snailgarden'] } }, select: { amount: true } });
    const played = transactions.filter(t => t.amount < 0n).length;
    const wins = transactions.filter(t => t.amount > 0n).length;
    const netWorth = user.wallet + user.bank;
    const checks = [
      { icon:'🌟', name:'Level Up', description:'Reach level 2.', current:user.level, target:2 },
      { icon:'💰', name:'Money Maker', description:'Reach 10,000 net worth.', current:Number(netWorth > 10_000n ? 10_000n : netWorth), target:10_000 },
      { icon:'💎', name:'Wealthy', description:'Reach 100,000 net worth.', current:Number(netWorth > 100_000n ? 100_000n : netWorth), target:100_000 },
      { icon:'🎰', name:'Lucky Winner', description:'Win 10 casino rounds.', current:wins, target:10 },
      { icon:'🎮', name:'Game Regular', description:'Play 50 casino rounds.', current:played, target:50 },
      { icon:'🏆', name:'High Roller', description:'Play 100 casino rounds.', current:played, target:100 },
      { icon:'📊', name:'XP Grinder', description:'Earn 1,000 XP.', current:user.xp, target:1_000 },
      { icon:'🪙', name:'Banked', description:'Hold 50,000 in the bank.', current:Number(user.bank > 50_000n ? 50_000n : user.bank), target:50_000 }
    ];
    const progress = (a: typeof checks[number]) => Math.min(100, Math.floor((a.current / a.target) * 100));
    const lines = checks.map(a => `${a.current >= a.target ? '🏅' : '▫️'} **${a.icon} ${a.name}** — ${a.description}\n   ${Math.min(a.current,a.target).toLocaleString()} / ${a.target.toLocaleString()} • **${progress(a)}%**`).join('\n');
    const unlocked = checks.filter(a => a.current >= a.target).length;
    const embed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle(`🏆 ${target.username}'s Achievements`)
      .setThumbnail(target.displayAvatarURL({ size: 256 }))
      .setDescription(`**${unlocked}/${checks.length} unlocked**\n\n${lines}`)
      .addFields({ name:'📈 PROFILE PROGRESS', value:`Level **${user.level}** • XP **${user.xp.toLocaleString()}**\nNet worth **${formatCurrency(netWorth, '🪙')}** • Games **${played}** • Wins **${wins}**` })
      .setTimestamp();
    await interaction.editReply({ embeds: [embed] });
  }
};
export default command;
