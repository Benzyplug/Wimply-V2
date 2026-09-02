import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export const MINES_BOARD_SIZE = 25;

export function minesRows(id: string, revealed: Set<number>, mines?: Set<number>) {
  return Array.from({ length: 5 }, (_, r) => {
    const row = new ActionRowBuilder<ButtonBuilder>();
    for (let c = 0; c < 5; c++) {
      const index = r * 5 + c;
      const isMine = mines?.has(index);
      const isRevealed = revealed.has(index);
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`mines:cell:${id}:${index}`)
          .setLabel(isRevealed ? (isMine ? '💣' : '💎') : '▫️')
          .setStyle(isRevealed ? ButtonStyle.Secondary : ButtonStyle.Primary)
          .setDisabled(isRevealed)
      );
    }
    return row;
  });
}

export function minesCashoutRow(id: string, enabled: boolean) {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`mines:cashout:${id}`)
        .setLabel('💰 Cash Out')
        .setStyle(ButtonStyle.Success)
        .setDisabled(!enabled)
    )
  ];
}
