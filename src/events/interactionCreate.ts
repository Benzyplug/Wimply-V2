import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors, version as discordJsVersion } from 'discord.js';
import type { ButtonInteraction, Interaction } from 'discord.js';
import { log } from '../utils/logger.js';
import { handleInteractionError } from '../utils/errorHandler.js';
import { handleBlackjackButtonInteraction } from '../services/blackjackService.js';
import { higherLowerGames, minesGames, payGame, cleanupExpiredGames } from '../services/miniGameService.js';
import { reactToMatchingMessage } from '../services/reactionService.js';
import { formatCurrency } from '../utils/format.js';
import { polishPayload } from '../utils/presentation.js';

const footer = '╰─〔 ⚡ 〢 Made by Benzy 〢 〕─╯';
function gameEmbed(title: string, description: string) { return new EmbedBuilder().setColor(Colors.Blurple).setTitle(title).setDescription(description).setTimestamp().setFooter({ text: footer }); }
function minesRows(id: string, revealed: Set<number>, mines?: Set<number>, cashout = true) {
  const rows = Array.from({ length: 5 }, (_, r) => { const row = new ActionRowBuilder<ButtonBuilder>(); for (let c = 0; c < 4; c++) { const index = r * 4 + c; const isMine = mines?.has(index); row.addComponents(new ButtonBuilder().setCustomId(`mines:cell:${id}:${index}`).setLabel(revealed.has(index) ? (isMine ? '💣' : '💎') : '▫️').setStyle(revealed.has(index) ? ButtonStyle.Secondary : ButtonStyle.Primary).setDisabled(revealed.has(index))); } return row; });
  if (cashout) rows[4].addComponents(new ButtonBuilder().setCustomId(`mines:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success).setDisabled(revealed.size < 1));
  return rows;
}
function withPolishedResponses<T extends Interaction>(interaction: T): T { const clientUser = interaction.client.user; return new Proxy(interaction, { get(target, property, receiver) { if (property === 'reply' || property === 'editReply' || property === 'followUp' || property === 'update') return (payload: unknown) => (target as any)[property](polishPayload(payload as any, clientUser)); return Reflect.get(target, property, receiver); } }); }

async function handleMiniGameButton(interaction: ButtonInteraction) {
  cleanupExpiredGames(); const parts = interaction.customId.split(':');
  if (parts[0] === 'hl') {
    const action = parts[1]; const id = parts.slice(2).join(':'); const game = higherLowerGames.get(id);
    if (!game || game.userId !== interaction.user.id) { await interaction.reply({ embeds: [gameEmbed('╭─〔 ⏳ GAME EXPIRED 〕─╮', '〢 This Higher/Lower game is no longer active.')] }); return true; }
    if (action === 'cashout') {
      if (game.moves < 1) { await interaction.reply({ content: '〢 ⚠️ Make at least **1 prediction** before cashing out.', ephemeral: true }); return true; }
      const payout = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
      await payGame(game.userId, game.guildId, payout, 'Higher/Lower'); higherLowerGames.delete(id);
      await interaction.update({ embeds: [gameEmbed('╭─〔 💰 HIGHER / LOWER CASH OUT 〕─╮', `〢 You secured **${formatCurrency(payout, '🪙')}**.\n〢 Predictions: **${game.moves}**\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**\n\n╰─〔 🎯 Run secured 〕─╯`)], components: [] }); return true;
    }
    const next = Math.floor(Math.random() * 100) + 1; const correct = action === 'higher' ? next > game.current : next < game.current;
    game.moves += 1;
    if (!correct) { higherLowerGames.delete(id); await interaction.update({ embeds: [gameEmbed('╭─〔 💥 HIGHER / LOWER LOST 〕─╮', `〢 Previous: **${game.current}**\n〢 Next: **${next}**\n〢 Predictions: **${game.moves}**\n〢 Bet lost: **${formatCurrency(game.bet, '🪙')}**\n\n╰─〔 🎯 Run ended 〕─╯`)], components: [] }); return true; }
    game.current = next; game.multiplier = Math.min(8, game.multiplier + 0.5); game.expiresAt = Date.now() + 5 * 60_000;
    const potential = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
    await interaction.update({ embeds: [gameEmbed('╭─〔 🎯 HIGHER / LOWER 〕─╮', `〢 **Correct!** 🎯\n〢 New number: **${game.current}**\n〢 Predictions: **${game.moves}**\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**\n〢 Cash-out value: **${formatCurrency(potential, '🪙')}**`)], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`hl:higher:${id}`).setLabel('Higher ⬆️').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`hl:lower:${id}`).setLabel('Lower ⬇️').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`hl:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success))] }); return true;
  }
  if (parts[0] === 'mines') {
    const action = parts[1]; const id = action === 'cell' ? parts.slice(2, -1).join(':') : parts.slice(2).join(':'); const game = minesGames.get(id);
    if (!game || game.userId !== interaction.user.id) { await interaction.reply({ embeds: [gameEmbed('╭─〔 ⏳ GAME EXPIRED 〕─╮', '〢 This Mines game is no longer active.')] }); return true; }
    if (action === 'cashout') {
      if (game.revealed.size < 1) { await interaction.reply({ content: '〢 ⚠️ Reveal at least **1 safe tile** before cashing out.', ephemeral: true }); return true; }
      const payout = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n; const finalBoard = new Set<number>(Array.from({ length: 20 }, (_, i) => i));
      await payGame(game.userId, game.guildId, payout, 'Mines'); minesGames.delete(id);
      await interaction.update({ embeds: [gameEmbed('╭─〔 💰 MINES CASH OUT 〕─╮', `〢 Secured **${formatCurrency(payout, '🪙')}** 💎\n〢 Mines: **${game.mineCount}**\n〢 Gems found: **${game.revealed.size}**\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**\n\n╰─〔 🧩 Board secured 〕─╯`)], components: minesRows(id, finalBoard, game.mines, false) }); return true;
    }
    const index = Number(parts.at(-1)); if (!Number.isInteger(index) || index < 0 || index >= 20 || game.revealed.has(index)) return true; game.revealed.add(index);
    if (game.mines.has(index)) { const finalBoard = new Set<number>(Array.from({ length: 20 }, (_, i) => i)); minesGames.delete(id); await interaction.update({ embeds: [gameEmbed('╭─〔 💣 MINES HIT 〕─╮', `〢 **BOOM!** 💥\n〢 Mines: **${game.mineCount}**\n〢 Gems found: **${game.revealed.size - 1}**\n〢 Bet lost: **${formatCurrency(game.bet, '🪙')}**\n\n╰─〔 🧩 Round ended 〕─╯`)], components: minesRows(id, finalBoard, game.mines, false) }); return true; }
    game.multiplier = 1 + game.revealed.size * (0.18 + game.mineCount * 0.045); game.expiresAt = Date.now() + 10 * 60_000; const potential = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
    await interaction.update({ embeds: [gameEmbed('╭─〔 💎 MINES SAFE 〕─╮', `〢 **Safe tile!** 💎\n〢 Gems found: **${game.revealed.size}**\n〢 Mines: **${game.mineCount}**\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**\n〢 Cash-out value: **${formatCurrency(potential, '🪙')}**`)], components: minesRows(id, game.revealed, game.mines) }); return true;
  }
  if (parts[0] === 'bot' && parts[1] === 'admin') {
    if (!interaction.memberPermissions?.has('Administrator')) { await interaction.reply({ content: '〢 🔒 **You don’t have permission to view the admin details.**', ephemeral: true }); return true; }
    const bot = interaction.client.user; const app = interaction.client.application; const memory = process.memoryUsage();
    await interaction.reply({ content: `╭─〔 🔐 WIMPLY ADMIN DETAILS 〕─╮\n〢 **Application ID:** \`${app?.id ?? bot.id}\`\n〢 **Bot ID:** \`${bot.id}\`\n〢 **Node:** ${process.version}\n〢 **discord.js:** v${discordJsVersion}\n〢 **Memory RSS:** ${(memory.rss / 1024 / 1024).toFixed(1)} MB\n〢 **Servers:** ${interaction.client.guilds.cache.size}\n\n╰─〔 Admin-only diagnostics 〕─╯`, ephemeral: true }); return true;
  }
  return false;
}
export default { name: 'interactionCreate', once: false, async execute(interaction: Interaction) { try { if (interaction.isButton()) { if (await handleMiniGameButton(withPolishedResponses(interaction))) return; await handleBlackjackButtonInteraction(withPolishedResponses(interaction) as ButtonInteraction); return; } if (interaction.isChatInputCommand()) { const command = interaction.client.commands?.get(interaction.commandName); if (!command) { log.warn(`Command not found: ${interaction.commandName}`, 'Interaction'); return; } await command.execute(withPolishedResponses(interaction) as any); if (interaction.guildId && (interaction.replied || interaction.deferred)) { try { const response = await interaction.fetchReply(); await reactToMatchingMessage(response, interaction.guildId, interaction.channelId, `/${interaction.commandName}`); } catch (error) { log.warn(`Unable to apply response reactions for /${interaction.commandName}: ${error instanceof Error ? error.message : String(error)}`, 'Reaction'); } } } } catch (error) { await handleInteractionError(interaction as Parameters<typeof handleInteractionError>[0], error); } } };
