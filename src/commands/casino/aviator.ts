import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { startAviator, aviatorGames, getAviatorMultiplier, isAviatorCrashed, settleAviatorCrash } from '../../services/aviatorService.js';
import { formatCurrency } from '../../utils/format.js';
import { playGameSlides } from '../../utils/gameAnimation.js';

function flightPhase(multiplier: number) { if (multiplier < 1.5) return '🛫 TAKEOFF'; if (multiplier < 3) return '☁️ CLIMBING'; if (multiplier < 6) return '🚀 HIGH ALTITUDE'; if (multiplier < 12) return '⚡ TURBO FLIGHT'; return '🌌 EXTREME ALTITUDE'; }
function progressBar(multiplier: number) { const length = 20; const progress = Math.min(length, Math.max(1, Math.floor(Math.log(Math.max(1, multiplier)) / Math.log(100) * length) + 1)); return `${'█'.repeat(progress)}${'░'.repeat(length - progress)}`; }
function flightEmbed(session: { bet: bigint; multiplier: number; crashAt: number }, currency: string, status: 'FLYING' | 'CRASHED' | 'CASHED OUT' = 'FLYING', payout?: bigint) {
  const value = payout ?? session.bet * BigInt(Math.floor(session.multiplier * 100)) / 100n;
  const title = status === 'CRASHED' ? '💥 AVIATOR • CRASHED' : status === 'CASHED OUT' ? '💰 AVIATOR • CASHED OUT' : '✈️ WIMPLY AVIATOR';
  const description = status === 'FLYING'
    ? `## ${session.multiplier.toFixed(2)}×\n\`${progressBar(session.multiplier)}\`\n\n**${flightPhase(session.multiplier)}**\n\n💰 **Wager**\n${formatCurrency(session.bet, currency)}\n\n📈 **Current value**\n${formatCurrency(value, currency)}\n\n🎯 **Flight status**\n🟢 IN FLIGHT\n\n⚠️ Cash out before the aircraft crashes.`
    : status === 'CRASHED'
      ? `## ${session.crashAt.toFixed(2)}×\n\`${progressBar(session.crashAt)}\`\n\n💥 **FLIGHT LOST**\nThe aircraft crashed at **${session.crashAt.toFixed(2)}×**.\n\n💰 **Wager lost**\n${formatCurrency(session.bet, currency)}`
      : `## ${session.multiplier.toFixed(2)}×\n\`${progressBar(session.multiplier)}\`\n\n🔒 **FLIGHT SECURED**\n\n💰 **Wager**\n${formatCurrency(session.bet, currency)}\n\n🏆 **Payout**\n${formatCurrency(value, currency)}\n\n📈 **Profit**\n${formatCurrency(value - session.bet, currency)}`;
  return new EmbedBuilder().setColor(status === 'CRASHED' ? 0xed4245 : status === 'CASHED OUT' ? 0x57f287 : 0x5865f2).setTitle(title).setDescription(description).setTimestamp().setFooter({ text: 'Wimply Aviator • V2.5.7' });
}
function cashoutRow(id: string, enabled = true) { return [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`aviator:cashout:${id}`).setLabel('💰 Cash Out').setStyle(ButtonStyle.Success).setDisabled(!enabled))]; }
const command: Command = { data: new SlashCommandBuilder().setName('aviator').setDescription('Board a live multiplier flight and cash out before it crashes').addStringOption(option => option.setName('amount').setDescription('Amount to wager').setRequired(true)), async execute(interaction: ChatInputCommandInteraction) { if (!interaction.guildId) { await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true }); return; } const amount = interaction.options.getString('amount', true); const session = await startAviator(interaction.user.id, interaction.guildId, amount); const emoji = interaction.guild?.emojis.cache.find(e => e.name === 'Wompy')?.toString() ?? 'Wompy'; await interaction.deferReply(); const bootSlides = [
  { content: { embeds: [flightEmbed(session, emoji).setTitle('✈️ AVIATOR • SYSTEM CHECK').setDescription(`💰 Wager locked: **${formatCurrency(session.bet, emoji)}**\n\n🔧 Engines warming…\n🛰️ Flight telemetry online…`)], components: [] }, delay: 280 },
  { content: { embeds: [flightEmbed(session, emoji).setTitle('🛫 AVIATOR • TAKEOFF READY').setDescription(`💰 Wager: **${formatCurrency(session.bet, emoji)}**\n\n🟢 Engines ready\n🟢 Flight path locked\n\n**Prepare to cash out before the crash.**`)], components: cashoutRow(session.id) }, delay: 360 },
  { content: { embeds: [flightEmbed(session, emoji, 'FLYING')], components: cashoutRow(session.id) }, delay: 0 }
]; await playGameSlides(bootSlides, async (payload) => { await interaction.editReply(payload); }); const message = await interaction.fetchReply(); const timer = setInterval(async () => { const live = aviatorGames.get(session.id); if (!live) { clearInterval(timer); return; } live.multiplier = getAviatorMultiplier(live); if (isAviatorCrashed(live)) { clearInterval(timer); settleAviatorCrash(live.id); try { await message.edit({ embeds: [flightEmbed(live, emoji, 'CRASHED')], components: [] }); } catch {} return; } try { await message.edit({ embeds: [flightEmbed(live, emoji)], components: cashoutRow(live.id) }); } catch { clearInterval(timer); } }, 600); } };
export default command;
