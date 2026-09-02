import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } from 'discord.js';
import type { ButtonInteraction, Interaction, Message } from 'discord.js';
import { log } from '../utils/logger.js';
import { handleInteractionError } from '../utils/errorHandler.js';
import { handleBlackjackButtonInteraction } from '../services/blackjackService.js';
import { higherLowerGames, minesGames, minesMultiplier, payGame, cleanupExpiredGames } from '../services/miniGameService.js';
import { aviatorGames, cashOutAviator, getAviatorMultiplier } from '../services/aviatorService.js';
import { chickenGames, cashOutChicken } from '../services/chickenCrossRoadService.js';
import { pendingTransfers } from '../commands/economy/pay.js';
import { reactToMatchingMessage } from '../services/reactionService.js';
import { formatCurrency } from '../utils/format.js';
import { polishPayload } from '../utils/presentation.js';
import { minesRows, minesCashoutRow } from '../commands/casino/mines.js';

function gameEmbed(title: string, description: string) {
  return new EmbedBuilder().setColor(Colors.Blurple).setTitle(title).setDescription(description).setTimestamp();
}

function warningEmbed(title: string, description: string) {
  return gameEmbed(title, description);
}

function wompy(interaction: ButtonInteraction) {
  return interaction.guild?.emojis.cache.find(e => e.name === 'Wompy')?.toString() ?? 'Wompy';
}

function withPolishedResponses<T extends Interaction>(interaction: T): T {
  const clientUser = interaction.client.user;
  return new Proxy(interaction, {
    get(target, property, receiver) {
      if (property === 'reply' || property === 'editReply' || property === 'followUp' || property === 'update') {
        return (payload: unknown) => (target as any)[property](polishPayload(payload as any, clientUser));
      }
      return Reflect.get(target, property, receiver);
    }
  });
}

async function editMessageById(interaction: ButtonInteraction, channelId: string | undefined, messageId: string | undefined, payload: Record<string, unknown>) {
  if (!channelId || !messageId) return false;
  try {
    const channel = await interaction.client.channels.fetch(channelId);
    if (!channel?.isTextBased() || !('messages' in channel)) return false;
    const message = await channel.messages.fetch(messageId);
    await message.edit(payload as any);
    return true;
  } catch (error) {
    log.warn(`Failed to edit linked game message: ${error instanceof Error ? error.message : String(error)}`, 'Interaction');
    return false;
  }
}

async function syncMinesCashout(interaction: ButtonInteraction, game: { id: string; channelId?: string; cashoutMessageId?: string; mineCount: number; revealed: Set<number>; multiplier: number }, enabled: boolean) {
  const description = `Reveal at least **1 safe tile** before cashing out.\n\n💣 Mines: **${game.mineCount}/25**\n💎 Gems found: **${game.revealed.size}**\n📈 Multiplier: **${game.multiplier.toFixed(2)}×**`;
  if (game.cashoutMessageId && game.channelId) {
    const updated = await editMessageById(interaction, game.channelId, game.cashoutMessageId, { components: minesCashoutRow(game.id, enabled) });
    if (updated) return;
    game.cashoutMessageId = undefined;
  }
  try {
    const sent = await interaction.followUp({ embeds: [gameEmbed('💰 MINES • CASH OUT', description)], components: minesCashoutRow(game.id, enabled), fetchReply: true });
    game.cashoutMessageId = (sent as Message).id;
  } catch (error) {
    log.warn(`Failed to create Mines cash-out control: ${error instanceof Error ? error.message : String(error)}`, 'Interaction');
  }
}

async function settleMinesBoard(interaction: ButtonInteraction, game: { id: string; channelId?: string; boardMessageId?: string; mines: Set<number> }, title: string, description: string) {
  const settled = new Set<number>(Array.from({ length: 25 }, (_, i) => i));
  await editMessageById(interaction, game.channelId, game.boardMessageId, {
    embeds: [gameEmbed(title, description)],
    components: minesRows(game.id, settled, game.mines)
  });
}

async function handleMiniGameButton(interaction: ButtonInteraction) {
  cleanupExpiredGames();
  const parts = interaction.customId.split(':');

  if (parts[0] === 'pay') {
    const action = parts[1];
    const id = parts.slice(2).join(':');
    const pending = pendingTransfers.get(id);
    if (!pending || pending.guildId !== interaction.guildId || pending.from !== interaction.user.id) {
      await interaction.reply({ embeds: [warningEmbed('⏳ TRANSFER EXPIRED', 'This payment confirmation has expired or belongs to another user.')], ephemeral: true });
      return true;
    }
    if (action === 'cancel') {
      pendingTransfers.delete(id);
      await interaction.update({ embeds: [gameEmbed('✖ PAYMENT CANCELLED', 'No Wompy was transferred.')], components: [] });
      return true;
    }
    if (action === 'confirm') {
      try {
        await transferPending(pending);
        pendingTransfers.delete(id);
        const currency = wompy(interaction);
        await interaction.update({ embeds: [gameEmbed('✨ PAYMENT COMPLETE', `You paid <@${pending.to}> **${formatCurrency(BigInt(pending.amount.replace(/,/g, '')), currency)}**.\n\n✅ Transfer confirmed successfully.`)], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId('pay:noop').setLabel('✓ Transfer Complete').setStyle(ButtonStyle.Success).setDisabled(true))] });
      } catch (error) {
        await interaction.reply({ embeds: [warningEmbed('⚠️ PAYMENT FAILED', error instanceof Error ? error.message : String(error))], ephemeral: true });
      }
      return true;
    }
  }

  if (parts[0] === 'aviator') {
    const action = parts[1];
    const id = parts.slice(2).join(':');
    const game = aviatorGames.get(id);
    if (!game || game.discordId !== interaction.user.id) {
      await interaction.reply({ embeds: [warningEmbed('⏳ AVIATOR EXPIRED', 'This flight is no longer active.')], ephemeral: true });
      return true;
    }
    if (action === 'cashout') {
      game.multiplier = getAviatorMultiplier(game);
      try {
        const result = await cashOutAviator(id, interaction.user.id, game.multiplier);
        const currency = wompy(interaction);
        await interaction.update({ embeds: [gameEmbed('💰 AVIATOR • CASHED OUT', `✈️ **Flight secured.**\n\n📈 Multiplier: **${result.multiplier.toFixed(2)}×**\n💰 Wager: **${formatCurrency(result.session.bet, currency)}**\n🏆 Payout: **${formatCurrency(result.payout, currency)}**\n💎 Profit: **${formatCurrency(result.payout - result.session.bet, currency)}**`)], components: [] });
      } catch (error) {
        await interaction.reply({ embeds: [warningEmbed('⚠️ CASH OUT FAILED', error instanceof Error ? error.message : String(error))], ephemeral: true });
      }
      return true;
    }
  }

  if (parts[0] === 'chicken') {
    const action = parts[1];
    const id = parts.slice(2).join(':');
    const game = chickenGames.get(id);
    if (!game || game.userId !== interaction.user.id) {
      await interaction.reply({ embeds: [warningEmbed('⏳ CHICKEN GAME EXPIRED', 'This Chicken Cross Road game is no longer active.')], ephemeral: true });
      return true;
    }
    const currency = wompy(interaction);
    if (action === 'cashout') {
      if (game.road < 1) {
        await interaction.reply({ embeds: [warningEmbed('⚠️ CASH OUT BLOCKED', 'Cross at least **1 road** before cashing out.')], ephemeral: true });
        return true;
      }
      const payout = await cashOutChicken(game);
      await interaction.update({ embeds: [gameEmbed('💰 CHICKEN • CASHED OUT', `🐔 You crossed **${game.road}/10 roads**.\n\n📈 Multiplier: **${game.multiplier.toFixed(2)}×**\n🏆 Payout: **${formatCurrency(payout, currency)}**\n💎 Profit: **${formatCurrency(payout - game.bet, currency)}**`)], components: [] });
      return true;
    }
    if (action === 'cross') {
      const safe = Math.random() < 0.78;
      if (!safe) {
        chickenGames.delete(id);
        await interaction.update({ embeds: [gameEmbed('💥 CHICKEN • HIT', `🐔 The chicken got hit on road **${game.road + 1}**.\n\n💰 Bet lost: **${formatCurrency(game.bet, currency)}**\nTry again with a new round.`)], components: [] });
        return true;
      }
      game.road += 1;
      game.multiplier = Math.min(12, Number((game.multiplier + 0.35 + game.road * 0.08).toFixed(2)));
      if (game.road >= 10) {
        const payout = await cashOutChicken(game);
        await interaction.update({ embeds: [gameEmbed('🏆 CHICKEN • ROAD CLEARED', `🐔 You crossed all **10 roads**.\n\n📈 Final multiplier: **${game.multiplier.toFixed(2)}×**\n🏆 Payout: **${formatCurrency(payout, currency)}**\n💎 Profit: **${formatCurrency(payout - game.bet, currency)}**`)], components: [] });
        return true;
      }
      const value = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
      await interaction.update({ embeds: [gameEmbed('🐔 CHICKEN CROSS ROAD', `## Road ${game.road}/10\n\n🛣️ **Crossing successful!**\n📈 Multiplier: **${game.multiplier.toFixed(2)}×**\n💰 Wager: **${formatCurrency(game.bet, currency)}**\n🏆 Cash-out value: **${formatCurrency(value, currency)}**\n\nThe next road is riskier.`)], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`chicken:cross:${id}`).setLabel('🐔 Cross Road').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`chicken:cashout:${id}`).setLabel('💰 Cash Out').setStyle(ButtonStyle.Success))] });
      return true;
    }
  }

  if (parts[0] === 'hl') {
    const action = parts[1];
    const id = parts.slice(2).join(':');
    const game = higherLowerGames.get(id);
    if (!game || game.userId !== interaction.user.id) {
      await interaction.reply({ embeds: [warningEmbed('⏳ GAME EXPIRED', 'This Higher/Lower session is no longer active.')], ephemeral: true });
      return true;
    }
    const currency = wompy(interaction);
    if (action === 'cashout') {
      if (game.moves < 1) {
        await interaction.reply({ embeds: [warningEmbed('⚠️ CASH OUT BLOCKED', 'Make at least **1 prediction** before cashing out.')], ephemeral: true });
        return true;
      }
      const payout = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
      await payGame(game.userId, game.guildId, payout, 'Higher/Lower');
      higherLowerGames.delete(id);
      await interaction.update({ embeds: [gameEmbed('💰 HIGHER / LOWER • CASHED OUT', `You secured **${formatCurrency(payout, currency)}**.\n\n🎯 Predictions: **${game.moves}**\n📈 Multiplier: **${game.multiplier.toFixed(2)}×**`)], components: [] });
      return true;
    }
    const next = Math.floor(Math.random() * 100) + 1;
    const correct = action === 'higher' ? next > game.current : next < game.current;
    game.moves += 1;
    if (!correct) {
      higherLowerGames.delete(id);
      await interaction.update({ embeds: [gameEmbed('💥 HIGHER / LOWER • LOST', `**Miss!** 🎯\n\nPrevious: **${game.current}**\nNext: **${next}**\nPredictions: **${game.moves}**\nBet lost: **${formatCurrency(game.bet, currency)}**`)], components: [] });
      return true;
    }
    game.current = next;
    game.multiplier = Math.min(8, game.multiplier + 0.5);
    game.expiresAt = Date.now() + 5 * 60_000;
    const potential = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
    await interaction.update({ embeds: [gameEmbed('🎯 HIGHER / LOWER', `**Correct!** 🎯\n\nNew number: **${game.current}**\nPredictions: **${game.moves}**\nMultiplier: **${game.multiplier.toFixed(2)}×**\nCash-out value: **${formatCurrency(potential, currency)}**`)], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`hl:higher:${id}`).setLabel('Higher ⬆️').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`hl:lower:${id}`).setLabel('Lower ⬇️').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`hl:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success))] });
    return true;
  }

  if (parts[0] === 'mines') {
    const action = parts[1];
    const id = action === 'cell' ? parts.slice(2, -1).join(':') : parts.slice(2).join(':');
    const game = minesGames.get(id);
    if (!game || game.userId !== interaction.user.id) {
      await interaction.reply({ embeds: [warningEmbed('⏳ GAME EXPIRED', 'This Mines session is no longer active.')], ephemeral: true });
      return true;
    }
    const currency = wompy(interaction);
    if (action === 'cashout') {
      if (game.revealed.size < 1) {
        await interaction.reply({ embeds: [warningEmbed('⚠️ CASH OUT BLOCKED', 'Reveal at least **1 safe tile** before cashing out.')], ephemeral: true });
        return true;
      }
      const payout = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
      await payGame(game.userId, game.guildId, payout, 'Mines');
      await interaction.update({ embeds: [gameEmbed('💰 MINES • CASHED OUT', `You secured **${formatCurrency(payout, currency)}** 💎\n\n💣 Mines: **${game.mineCount}/25**\n💎 Gems found: **${game.revealed.size}**\n📈 Multiplier: **${game.multiplier.toFixed(2)}×**\n\nBoard settled • Session secured`)], components: [] });
      await settleMinesBoard(interaction, game, '💰 MINES • BOARD SETTLED', `💎 Round secured.\n\n💣 Mines: **${game.mineCount}/25**\n💎 Gems found: **${game.revealed.size}**\n📈 Multiplier: **${game.multiplier.toFixed(2)}×**\n\nBoard settled.`);
      if (game.cashoutMessageId && game.cashoutMessageId !== interaction.message.id) await editMessageById(interaction, game.channelId, game.cashoutMessageId, { components: [] });
      minesGames.delete(id);
      return true;
    }
    const index = Number(parts.at(-1));
    if (!Number.isInteger(index) || index < 0 || index >= 25 || game.revealed.has(index)) return true;
    game.revealed.add(index);
    if (game.mines.has(index)) {
      const safeCount = game.revealed.size - 1;
      await interaction.update({ embeds: [gameEmbed('💣 MINES • HIT', `**BOOM!** 💥\n\n💣 Mines: **${game.mineCount}/25**\n💎 Gems found: **${safeCount}**\n💰 Bet lost: **${formatCurrency(game.bet, currency)}**\n\nBoard settled • Session ended`)], components: [] });
      await settleMinesBoard(interaction, game, '💣 MINES • BOARD SETTLED', `💥 The round ended on a mine.\n\n💣 Mines: **${game.mineCount}/25**\n💎 Gems found: **${safeCount}**\n💰 Bet lost: **${formatCurrency(game.bet, currency)}**\n\nBoard settled.`);
      if (game.cashoutMessageId) await editMessageById(interaction, game.channelId, game.cashoutMessageId, { components: [] });
      minesGames.delete(id);
      return true;
    }
    game.multiplier = minesMultiplier(game.mineCount, game.revealed.size);
    game.expiresAt = Date.now() + 10 * 60_000;
    const potential = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
    const nextMultiplier = game.revealed.size < 25 - game.mineCount ? minesMultiplier(game.mineCount, game.revealed.size + 1) : game.multiplier;
    await interaction.update({ embeds: [gameEmbed('💎 MINES • SAFE', `**Safe tile!** 💎\n\n💎 Gems found: **${game.revealed.size}**\n💣 Mines: **${game.mineCount}/25**\n📈 Current multiplier: **${game.multiplier.toFixed(2)}×**\n💰 Cash-out value: **${formatCurrency(potential, currency)}**\n📈 Next multiplier: **${nextMultiplier.toFixed(2)}×**\n\n${25 - game.mineCount - game.revealed.size} safe tiles remain`)], components: minesRows(id, game.revealed, game.mines) });
    await syncMinesCashout(interaction, game, true);
    return true;
  }

  if (parts[0] === 'bot' && parts[1] === 'admin') {
    if (!interaction.memberPermissions?.has('Administrator')) {
      await interaction.reply({ embeds: [warningEmbed('🔒 ACCESS DENIED', 'You don’t have permission to open the private server snapshot.')], ephemeral: true });
      return true;
    }
    const bot = interaction.client.user;
    const app = interaction.client.application;
    const memory = process.memoryUsage();
    await interaction.reply({ content: `🔐 **WIMPLY PRIVATE SNAPSHOT**\nApplication ID: \`${app?.id ?? bot.id}\`\nBot ID: \`${bot.id}\`\nNode: ${process.version}\nMemory RSS: ${(memory.rss / 1024 / 1024).toFixed(1)} MB\nServers: ${interaction.client.guilds.cache.size}\nRuntime: Online`, ephemeral: true });
    return true;
  }

  return false;
}

async function transferPending(pending: { from: string; to: string; amount: string; guildId: string }) {
  const { transfer } = await import('../services/economyService.js');
  return transfer(pending.from, pending.guildId, pending.to, pending.amount);
}

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    try {
      if (interaction.isButton()) {
        if (await handleMiniGameButton(withPolishedResponses(interaction))) return;
        await handleBlackjackButtonInteraction(withPolishedResponses(interaction) as ButtonInteraction);
        return;
      }
      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands?.get(interaction.commandName);
        if (!command) {
          log.warn(`Command not found: ${interaction.commandName}`, 'Interaction');
          return;
        }
        const polished = withPolishedResponses(interaction);
        await command.execute(polished as any);
        if (interaction.guildId && (interaction.replied || interaction.deferred)) {
          try {
            const response = await interaction.fetchReply();
            await reactToMatchingMessage(response as Message, interaction.guildId, interaction.channelId, `${interaction.commandName} ${response.embeds.map(embed => `${embed.title ?? ''} ${embed.description ?? ''}`).join(' ')}`);
          } catch (error) {
            log.warn(`Failed to apply response reaction: ${error instanceof Error ? error.message : String(error)}`, 'Reaction');
          }
        }
      }
    } catch (error) {
      await handleInteractionError(interaction as any, error);
    }
  }
};
