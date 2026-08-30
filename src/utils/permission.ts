import { AppError } from './errors.js';
import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';

export function isAdminInteraction(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) ?? false;
}

export function assertAdmin(interaction: ChatInputCommandInteraction): void {
  if (!isAdminInteraction(interaction)) {
    throw new AppError('You must have Administrator permissions to use this command.');
  }
}
