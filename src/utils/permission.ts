import { ChatInputCommandInteraction, PermissionsBitField } from 'discord.js';
import { AppError } from './errors.js';

export function isAdminInteraction(interaction: ChatInputCommandInteraction): boolean {
  return interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) ?? false;
}

export function isModeratorInteraction(interaction: ChatInputCommandInteraction): boolean {
  return (
    interaction.memberPermissions?.has(PermissionsBitField.Flags.ModerateMembers) ||
    interaction.memberPermissions?.has(PermissionsBitField.Flags.ManageMessages) ||
    isAdminInteraction(interaction)
  ) ?? false;
}

export function assertAdmin(interaction: ChatInputCommandInteraction): void {
  if (!isAdminInteraction(interaction)) {
    throw new AppError('🛡️ You need **Administrator** permission to use this command.');
  }
}

export function assertModerator(interaction: ChatInputCommandInteraction): void {
  if (!isModeratorInteraction(interaction)) {
    throw new AppError('🛡️ You need **Moderate Members**, **Manage Messages**, or **Administrator** permission.');
  }
}
