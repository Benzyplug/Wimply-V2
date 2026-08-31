import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { assertModerator } from '../../utils/permission.js';
import { createSuccessEmbed } from '../../utils/embeds.js';
import { AppError } from '../../utils/errors.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('mod')
    .setDescription('Moderation tools')
    .addSubcommand(sub => sub.setName('timeout').setDescription('Timeout a member').addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)).addIntegerOption(o => o.setName('minutes').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(10080)).addStringOption(o => o.setName('reason').setDescription('Reason')))
    .addSubcommand(sub => sub.setName('purge').setDescription('Delete recent messages').addIntegerOption(o => o.setName('amount').setDescription('1-100 messages').setRequired(true).setMinValue(1).setMaxValue(100)))
    .addSubcommand(sub => sub.setName('lock').setDescription('Lock the current channel'))
    .addSubcommand(sub => sub.setName('unlock').setDescription('Unlock the current channel')),
  async execute(interaction: ChatInputCommandInteraction) {
    assertModerator(interaction);
    const action = interaction.options.getSubcommand();

    if (action === 'timeout') {
      const user = interaction.options.getUser('user', true);
      const minutes = interaction.options.getInteger('minutes', true);
      const reason = interaction.options.getString('reason') ?? 'Wimply moderation action';
      const member = await interaction.guild?.members.fetch(user.id);
      if (!member?.moderatable) throw new AppError('🚫 I cannot timeout that member. Check my role hierarchy and permissions.');
      await member.timeout(minutes * 60_000, reason);
      await interaction.reply({ embeds: [createSuccessEmbed('⏱️ Member Timed Out', `〢 **User:** <@${user.id}>\n〢 **Duration:** ${minutes} minute(s)\n〢 **Reason:** ${reason}`)] });
      return;
    }

    if (action === 'purge') {
      const amount = interaction.options.getInteger('amount', true);
      if (!interaction.channel || !('bulkDelete' in interaction.channel)) throw new AppError('🚫 This channel does not support bulk deletion.');
      const deleted = await interaction.channel.bulkDelete(amount, true);
      await interaction.reply({ embeds: [createSuccessEmbed('🧹 Messages Cleared', `〢 Deleted **${deleted.size}** message(s).`)], ephemeral: true });
      return;
    }

    if (!interaction.channel || !('permissionOverwrites' in interaction.channel)) throw new AppError('🚫 This channel cannot be locked.');
    const everyone = interaction.guild?.roles.everyone;
    if (!everyone) throw new AppError('🚫 Server role data is unavailable.');
    await interaction.channel.permissionOverwrites.edit(everyone, { SendMessages: action === 'unlock' ? null : false });
    await interaction.reply({ embeds: [createSuccessEmbed(action === 'lock' ? '🔒 Channel Locked' : '🔓 Channel Unlocked', `〢 <#${interaction.channel.id}> is now **${action === 'lock' ? 'locked' : 'unlocked'}**.`)] });
  }
};

export default command;
