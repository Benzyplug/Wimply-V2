import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Colors } from 'discord.js';
import type { ButtonInteraction, Interaction } from 'discord.js';
import { log } from '../utils/logger.js';
import { handleInteractionError } from '../utils/errorHandler.js';
import { handleBlackjackButtonInteraction } from '../services/blackjackService.js';
import { higherLowerGames, minesGames, payGame, cleanupExpiredGames } from '../services/miniGameService.js';
import { formatCurrency } from '../utils/format.js';

const footer = 'Wimply V2.0 • Built by SHAX ⚡';

function gameEmbed(title: string, description: string) {
  return new EmbedBuilder().setColor(Colors.Blurple).setTitle(title).setDescription(description).setTimestamp().setFooter({ text: footer });
}

function minesRows(id: string, revealed: Set<number>, mines?: Set<number>, cashout = true) {
  const rows = Array.from({ length: 5 }, (_, r) => {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 4; c++) {
      const index = r * 4 + c;
      const isMine = mines?.has(index);
      row.addComponents(new ButtonBuilder().setCustomId(`mines:cell:${id}:${index}`).setLabel(revealed.has(index) ? (isMine ? '💣' : '💎') : '▫️').setStyle(revealed.has(index) ? ButtonStyle.Secondary : ButtonStyle.Primary).setDisabled(revealed.has(index)));
    }
    return row;
  });
  if (cashout) rows[4].addComponents(new ButtonBuilder().setCustomId(`mines:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success));
  return rows;
}

async function handleMiniGameButton(interaction: ButtonInteraction) {
  cleanupExpiredGames();
  const parts = interaction.customId.split(':');

  if (parts[0] === 'hl') {
    const action = parts[1];
    const id = parts.slice(2).join(':');
    const game = higherLowerGames.get(id);
    if (!game || game.userId !== interaction.user.id) {
      await interaction.reply({ embeds: [gameEmbed('╭─〔 ⏳ GAME EXPIRED 〕─╮', '〢 This Higher/Lower game is no longer active.')], ephemeral: true });
      return true;
    }

    if (action === 'cashout') {
      const scaled = BigInt(Math.round(game.multiplier * 100));
      const payout = game.bet * scaled / 100n;
      await payGame(game.userId, game.guildId, payout, 'Higher/Lower');
      higherLowerGames.delete(id);
      await interaction.update({ embeds: [gameEmbed('╭─〔 💰 HIGHER / LOWER CASH OUT 〕─╮', `〢 You cashed out **${formatCurrency(payout, '🪙')}**.\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**\n\n╰─〔 🏦 Winnings secured 〕─╯`)], components: [] });
      return true;
    }

    const next = Math.floor(Math.random() * 100) + 1;
    const correct = action === 'higher' ? next > game.current : next < game.current;
    if (!correct) {
      higherLowerGames.delete(id);
      await interaction.update({ embeds: [gameEmbed('╭─〔 💥 HIGHER / LOWER LOST 〕─╮', `〢 Previous: **${game.current}**\n〢 Next: **${next}**\n〢 You picked **${action}** and missed.\n\n╰─〔 🪙 Bet lost: ${formatCurrency(game.bet, '🪙')} 〕─╯`)], components: [] });
      return true;
    }

    game.current = next;
    game.multiplier = Math.min(8, game.multiplier + 0.5);
    game.expiresAt = Date.now() + 5 * 60_000;
    const potential = game.bet * BigInt(Math.round(game.multiplier * 100)) / 100n;
    await interaction.update({ embeds: [gameEmbed('╭─〔 🎯 HIGHER / LOWER 〕─╮', `〢 **Correct!** 🎯\n〢 New number: **${game.current}**\n〢 Secured multiplier: **${game.multiplier.toFixed(2)}x**\n〢 Cash-out value: **${formatCurrency(potential, '🪙')}**\n\n╰─〔 💰 Keep going or cash out 〕─╯`)], components: [new ActionRowBuilder<ButtonBuilder>().addComponents(new ButtonBuilder().setCustomId(`hl:higher:${id}`).setLabel('Higher ⬆️').setStyle(ButtonStyle.Primary), new ButtonBuilder().setCustomId(`hl:lower:${id}`).setLabel('Lower ⬇️').setStyle(ButtonStyle.Secondary), new ButtonBuilder().setCustomId(`hl:cashout:${id}`).setLabel('Cash Out 💰').setStyle(ButtonStyle.Success))] });
    return true;
  }

  if (parts[0] === 'mines') {
    const action = parts[1];
    const id = action === 'cell' ? parts.slice(2, -1).join(':') : parts.slice(2).join(':');
    const game = minesGames.get(id);
    if (!game || game.userId !== interaction.user.id) {
      await interaction.reply({ embeds: [gameEmbed('╭─〔 ⏳ GAME EXPIRED 〕─╮', '〢 This Mines game is no longer active.')], ephemeral: true });
      return true;
    }

    if (action === 'cashout') {
      const scaled = BigInt(Math.round(game.multiplier * 100));
      const payout = game.bet * scaled / 100n;
      await payGame(game.userId, game.guildId, payout, 'Mines');
      minesGames.delete(id);
      await interaction.update({ embeds: [gameEmbed('╭─〔 💰 MINES CASH OUT 〕─╮', `〢 You secured **${formatCurrency(payout, '🪙')}** 💎\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**\n\n╰─〔 🏦 Winnings secured 〕─╯`)], components: [] });
      return true;
    }

    const index = Number(parts.at(-1));
    if (!Number.isInteger(index) || index < 0 || index >= 20 || game.revealed.has(index)) return true;
    game.revealed.add(index);

    if (game.mines.has(index)) {
      for (const mine of game.mines) game.revealed.add(mine);
      minesGames.delete(id);
      await interaction.update({ embeds: [gameEmbed('╭─〔 💣 MINES HIT 〕─╮', `〢 **BOOM!** 💥\n〢 You hit a mine at tile **${index + 1}**.\n〢 Bet lost: **${formatCurrency(game.bet, '🪙')}**\n\n╰─〔 Better luck next run 〕─╯`)], components: minesRows(id, game.revealed, game.mines, false) });
      return true;
    }

    game.multiplier = 1 + game.revealed.size * 0.35;
    const scaled = BigInt(Math.round(game.multiplier * 100));
    const potential = game.bet * scaled / 100n;
    await interaction.update({ embeds: [gameEmbed('╭─〔 💎 MINES SAFE 〕─╮', `〢 **Safe tile!** 💎\n〢 Gems found: **${game.revealed.size}**\n〢 Multiplier: **${game.multiplier.toFixed(2)}x**\n〢 Cash-out value: **${formatCurrency(potential, '🪙')}**\n\n╰─〔 Keep digging or cash out 💰 〕─╯`)], components: minesRows(id, game.revealed, game.mines) });
    return true;
  }

  return false;
}

export default {
  name: 'interactionCreate',
  once: false,
  async execute(interaction: Interaction) {
    try {
      if (interaction.isButton()) {
        if (await handleMiniGameButton(interaction)) return;
        await handleBlackjackButtonInteraction(interaction);
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = interaction.client.commands?.get(interaction.commandName);
        if (!command) {
          log.warn(`Command not found: ${interaction.commandName}`, 'Interaction');
          return;
        }
        await command.execute(interaction);
      }
    } catch (error) {
      await handleInteractionError(interaction as Parameters<typeof handleInteractionError>[0], error);
    }
  }
};
