import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const MINES_BOARD_SIZE = 25;

export function minesRows(id: string, revealed: Set<number>, mines?: Set<number>, cashoutEnabled = false) {
  return Array.from({ length: 5 }, (_, r) => {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 5; c++) {
      const index = r * 5 + c;
      const isMine = mines?.has(index);
      const isRevealed = revealed.has(index);
      const isCashout = cashoutEnabled && r === 4 && c === 4;
      row.addComponents(new ButtonBuilder().setCustomId(isCashout ? `mines:cashout:${id}` : `mines:cell:${id}:${index}`).setLabel(isCashout ? '💰' : isRevealed ? (isMine ? '💣' : '💎') : '▫️').setStyle(isCashout ? ButtonStyle.Success : isRevealed ? ButtonStyle.Secondary : ButtonStyle.Primary).setDisabled(isCashout ? false : isRevealed));
    }
    return row;
  });
}
