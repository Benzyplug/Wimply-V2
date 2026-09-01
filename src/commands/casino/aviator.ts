import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { startAviator, aviatorGames, getAviatorMultiplier, isAviatorCrashed, settleAviatorCrash } from '../../services/aviatorService.js';
import { getOrCreateUser } from '../../services/userService.js';
import { formatCurrency } from '../../utils/format.js';

function flightPhase(multiplier: number) { if (multiplier < 1.25) return '🛫 TAKEOFF'; if (multiplier < 2) return '☁️ CLIMBING'; if (multiplier < 4) return '🚀 TURBO FLIGHT'; if (multiplier < 8) return '⚡ TURBULENCE'; return '🌪️ EXTREME ALTITUDE'; }
function flightEmbed(session: { bet: bigint; multiplier: number; crashAt: number }, currency: string, status = 'FLYING') {
  const potential = session.bet * BigInt(Math.floor(session.multiplier * 100)) / 100n;
  const phase = status === 'FLYING' ? flightPhase(session.multiplier) : status === 'CRASHED' ? '💥 FLIGHT LOST' : '🔒 FLIGHT SECURED';
  const barLength = 18; const filled = Math.min(barLength, Math.max(1, Math.floor(Math.log(Math.max(1, session.multiplier)) / Math.log(100) * barLength) + 1)); const bar = '━'.repeat(filled) + '·'.repeat(barLength - filled);
  return new EmbedBuilder().setColor(status === 'CRASHED' ? 0xed4245 : status === 'CASHED OUT' ? 0x57f287 : 0x5865f2).setTitle(status === 'CRASHED' ? '💥 WIMPLY AVIATOR' : status === 'CASHED OUT' ? '💰 WIMPLY AVIATOR' : '✈️ WIMPLY AVIATOR').setDescription(`### ${session.multiplier.toFixed(2)}×\n\`${bar}\`\n\n${phase}\n\n💰 **Wager**  ${formatCurrency(session.bet, currency)}\n📈 **Current value**  ${formatCurrency(potential, currency)}\n🎯 **Status**  ${status}\n\n${status === 'FLYING' ? '⚡ Cash out before the aircraft disappears.' : status === 'CRASHED' ? `💥 The aircraft crashed at **${session.crashAt.toFixed(2)}×**.` : `🔒 You secured **${potential.toLocaleString()}**.`}`).setFooter({ text: status === 'FLYING' ? 'Live flight • Your cashout is calculated server-side.' : `Crash point ${session.crashAt.toFixed(2)}× • Wimply V2.1.1` });
}

const command: Command = {
  data: new SlashCommandBuilder().setName('aviator').setDescription('Board a live multiplier flight and cash out before it crashes').addStringOption(option => option.setName('amount').setDescription('Amount to wager').setRequired(true)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) { await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true }); return; }
    const amount = interaction.options.getString('amount', true); const session = await startAviator(interaction.user.id, interaction.guildId, amount); const { config } = await getOrCreateUser(interaction.user.id, interaction.guildId); const emoji = config.currencyEmoji || '🪙';
    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`aviator:cashout:${session.id}`).setLabel('💰 Cash Out').setStyle(ButtonStyle.Success));
    await interaction.deferReply(); const message = await interaction.editReply({ embeds: [flightEmbed(session, emoji)], components: [row] });
    const timer = setInterval(async () => { const live = aviatorGames.get(session.id); if (!live) { clearInterval(timer); return; } live.multiplier = getAviatorMultiplier(live); if (isAviatorCrashed(live)) { clearInterval(timer); settleAviatorCrash(live.id); try { await message.edit({ embeds: [flightEmbed(live, emoji, 'CRASHED')], components: [] }); } catch { clearInterval(timer); } return; } try { await message.edit({ embeds: [flightEmbed(live, emoji)], components: [row] }); } catch { clearInterval(timer); } }, 350);
  }
};
export default command;
