import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } from 'discord.js';
import type { ButtonInteraction, Interaction } from 'discord.js';
import { log } from '../utils/logger.js';
import { handleInteractionError } from '../utils/errorHandler.js';
import { handleBlackjackButtonInteraction } from '../services/blackjackService.js';
import { higherLowerGames, minesGames, minesMultiplier, payGame, cleanupExpiredGames } from '../services/miniGameService.js';
import { aviatorGames, cashOutAviator, getAviatorMultiplier } from '../services/aviatorService.js';
import { reactToMatchingMessage } from '../services/reactionService.js';
import { formatCurrency } from '../utils/format.js';
import { polishPayload } from '../utils/presentation.js';

function gameEmbed(title: string, description: string) { return new EmbedBuilder().setColor(Colors.Blurple).setTitle(title).setDescription(description).setTimestamp(); }
function warningEmbed(title: string, description: string) { return gameEmbed(title, description); }
function minesRows(id: string, revealed: Set<number>, mines?: Set<number>, cashout = true) {
  const firstSafe = [...revealed].sort((a, b) => a - b).find(index => !mines?.has(index));
  return Array.from({ length: 5 }, (_, r) => {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 5; c++) {
      const index = r * 5 + c;
      const isMine = mines?.has(index);
      const isRevealed = revealed.has(index);
      const isCashoutTile = cashout && isRevealed && !isMine && index === firstSafe;
      row.addComponents(new ButtonBuilder()
        .setCustomId(isCashoutTile ? `mines:cashout:${id}:${index}` : `mines:cell:${id}:${index}`)
        .setLabel(isCashoutTile ? '💰 Cash Out' : isRevealed ? (isMine ? '💣' : '💎') : '▫️')
        .setStyle(isCashoutTile ? ButtonStyle.Success : isRevealed ? ButtonStyle.Secondary : ButtonStyle.Primary)
        .setDisabled(isRevealed && !isCashoutTile));
    }
    return row;
  });
}
function withPolishedResponses<T extends Interaction>(interaction: T): T { const clientUser = interaction.client.user; return new Proxy(interaction, { get(target, property, receiver) { if (property === 'reply' || property === 'editReply' || property === 'followUp' || property === 'update') return (payload: unknown) => (target as any)[property](polishPayload(payload as any, clientUser)); return Reflect.get(target, property, receiver); } }); }

async function handleMiniGameButton(interaction: ButtonInteraction) {
  cleanupExpiredGames(); const parts = interaction.customId.split(':');
  if (parts[0] === 'aviator') {
    const action = parts[1]; const id = parts.slice(2).join(':'); const game = aviatorGames.get(id);
    if (!game || game.discordId !== interaction.user.id) { await interaction.reply({ embeds: [warningEmbed('⏳ AVIATOR EXPIRED', 'This flight is no longer active.')], ephemeral: true }); return true; }
    if (action === 'cashout') {
      game.multiplier = getAviatorMultiplier(game);
      try {
        const result = await cashOutAviator(id, interaction.user.id, game.multiplier);
        const potential = result.payout;
        await interaction.update({ embeds: [gameEmbed('💰 WIMPLY AVIATOR — CASHED OUT', `✈️ Flight secured.\n\n〢 Multiplier: **${result.multiplier.toFixed(2)}×**\n〢 Wager: **${formatCurrency(result.session.bet, '🪙')}**\n〢 Payout: **${formatCurrency(potential, '🪙')}**\n〢 Profit: **${formatCurrency(potential - result.session.bet, '🪙')}**`)], components: [] });
      } catch (error) { await interaction.reply({ embeds: [warningEmbed('⚠️ CASH OUT FAILED', error instanceof Error ? error.message : String(error))], ephemeral: true }); }
      return true;
    }
  }
  if (parts[0] === 'hl') {
    const action = parts[1]; const id = parts.slice(2).join(':'); const game = higherLowerGames.get(id);
    if (!game || game.userId !== interaction.user.id) { await interaction.reply({ embeds: [warningEmbed('⏳ GAME EXPIRED', 'This Higher/Lower session is no longer active.')], ephemeral: true }); return true; }
    if (action === 'cashout') { if (game.moves < 1) { await interaction.reply({ embeds: [warningEmbed('⚠️ CASH OUT BLOCKED', 'Make at least **1 prediction** before cashing out.')], ephemeral: true }); return true; } const payout = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n; await payGame(game.userId, game.guildId, payout, 'Higher/Lower'); higherLowerGames.delete(id); await interaction.update({ embeds: [gameEmbed('💰 HIGHER / LOWER CASH OUT', `〢 You secured **${formatCurrency(payout, '🪙')}**.\n〢 Predictions: **${game.moves}**\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**`)], components: [] }); return true; }
    const next = Math.floor(Math.random() * 100) + 1; const correct = action === 'higher' ? next > game.current : next < game.current; game.moves += 1;
    if (!correct) { higherLowerGames.delete(id); await interaction.update({ embeds: [gameEmbed('💥 HIGHER / LOWER LOST', `〢 **Miss!** 🎯\n〢 Previous: **${game.current}**\n〢 Next: **${next}**\n〢 Predictions: **${game.moves}**\n〢 Bet lost: **${formatCurrency(game.bet, '🪙')}**`)], components: [] }); return true; }
    game.current = next; game.multiplier = Math.min(8, game.multiplier + 0.5); game.expiresAt = Date.now() + 5 * 60_000; const potential = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
    await interaction.update({ embeds: [gameEmbed('🎯 HIGHER / LOWER', `〢 **Correct!** 🎯\n〢 New number: **${game.current}**\n〢 Predictions: **${game.moves}**\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**\n〢 Cash-out value: **${formatCurrency(potential, '🪙')}**`)], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`hl:higher:${id}`).setLabel('Higher ⬆️').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`hl:lower:${id}`).setLabel('Lower ⬇️').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`hl:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success))] }); return true;
  }
  if (parts[0] === 'mines') {
    const action = parts[1]; const id = parts.slice(2, action === 'cell' || action === 'cashout' ? -1 : undefined).join(':'); const game = minesGames.get(id);
    if (!game || game.userId !== interaction.user.id) { await interaction.reply({ embeds: [warningEmbed('⏳ GAME EXPIRED', 'This Mines session is no longer active.')], ephemeral: true }); return true; }
    if (action === 'cashout') { if (game.revealed.size < 1) { await interaction.reply({ embeds: [warningEmbed('⚠️ CASH OUT BLOCKED', 'Reveal at least **1 safe tile** before cashing out.')], ephemeral: true }); return true; } const payout = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n; const settledBoard = new Set<number>(Array.from({ length: 25 }, (_, i) => i)); await payGame(game.userId, game.guildId, payout, 'Mines'); minesGames.delete(id); await interaction.update({ embeds: [gameEmbed('💰 MINES CASH OUT', `〢 Secured **${formatCurrency(payout, '🪙')}** 💎\n〢 Mines: **${game.mineCount}/25**\n〢 Gems found: **${game.revealed.size}**\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**\n\n〢 Board settled • Session secured`)], components: minesRows(id, settledBoard, game.mines, false) }); return true; }
    const index = Number(parts.at(-1)); if (!Number.isInteger(index) || index < 0 || index >= 25 || game.revealed.has(index)) return true; game.revealed.add(index);
    if (game.mines.has(index)) { const settledBoard = new Set<number>(Array.from({ length: 25 }, (_, i) => i)); minesGames.delete(id); await interaction.update({ embeds: [gameEmbed('💣 MINES HIT', `〢 **BOOM!** 💥\n〢 Mines: **${game.mineCount}/25**\n〢 Gems found: **${game.revealed.size - 1}**\n〢 Bet lost: **${formatCurrency(game.bet, '🪙')}**\n\n〢 Board settled • Session ended`)], components: minesRows(id, settledBoard, game.mines, false) }); return true; }
    game.multiplier = minesMultiplier(game.mineCount, game.revealed.size); game.expiresAt = Date.now() + 10 * 60_000; const potential = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n; const nextMultiplier = game.revealed.size < 25 - game.mineCount ? minesMultiplier(game.mineCount, game.revealed.size + 1) : game.multiplier;
    await interaction.update({ embeds: [gameEmbed('💎 MINES SAFE', `〢 **Safe tile!** 💎\n〢 Gems found: **${game.revealed.size}**\n〢 Mines: **${game.mineCount}/25**\n〢 Current multiplier: **${game.multiplier.toFixed(2)}x**\n〢 Cash-out value: **${formatCurrency(potential, '🪙')}**\n〢 Next safe multiplier: **${nextMultiplier.toFixed(2)}x**\n\n〢 ${25 - game.mineCount - game.revealed.size} safe tiles remain`)], components: minesRows(id, game.revealed, game.mines) }); return true;
  }
  if (parts[0] === 'bot' && parts[1] === 'admin') { if (!interaction.memberPermissions?.has('Administrator')) { await interaction.reply({ embeds: [warningEmbed('🔒 ACCESS DENIED', 'You don’t have permission to open the private server snapshot.')], ephemeral: true }); return true; } const bot = interaction.client.user; const app = interaction.client.application; const memory = process.memoryUsage(); await interaction.reply({ content: `🔐 **WIMPLY PRIVATE SNAPSHOT**\nApplication ID: \`${app?.id ?? bot.id}\`\nBot ID: \`${bot.id}\`\nNode: ${process.version}\nMemory RSS: ${(memory.rss / 1024 / 1024).toFixed(1)} MB\nServers: ${interaction.client.guilds.cache.size}\nRuntime: Online`, ephemeral: true }); return true; }
  return false;
}

export default { name: 'interactionCreate', once: false, async execute(interaction: Interaction) { try { if (interaction.isButton()) { if (await handleMiniGameButton(withPolishedResponses(interaction))) return; await handleBlackjackButtonInteraction(withPolishedResponses(interaction) as ButtonInteraction); return; } if (interaction.isChatInputCommand()) { const command = interaction.client.commands?.get(interaction.commandName); if (!command) { log.warn(`Command not found: ${interaction.commandName}`, 'Interaction'); return; } await command.execute(withPolishedResponses(interaction) as any); if (interaction.guildId && (interaction.replied || interaction.deferred)) { try { const response = await interaction.fetchReply(); const resultText = response.embeds.map(embed => `${embed.title ?? ''} ${embed.description ?? ''}`).join(' '); await reactToMatchingMessage(response, interaction.guildId, interaction.channelId, `/${interaction.commandName} ${resultText}`); } catch (error) { log.warn(`Unable to apply response reactions for /${interaction.commandName}: ${error instanceof Error ? error.message : String(error)}`, 'Reaction'); } } } } catch (error) { await handleInteractionError(interaction as Parameters<typeof handleInteractionError>[0], error); } } };
