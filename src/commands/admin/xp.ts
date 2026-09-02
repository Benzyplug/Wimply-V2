import { ChatInputCommandInteraction, PermissionFlagsBits, SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { prisma } from '../../services/database.js';
import { getOrCreateUser } from '../../services/userService.js';
import { AppError } from '../../utils/errors.js';
import { getWimplyLogo } from '../../utils/presentation.js';

function levelForXp(xp: number) { return Math.max(1, Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1); }
function levelStart(level: number) { return 100 * Math.max(0, level - 1) ** 2; }
function nextLevelXp(level: number) { return 100 * level ** 2; }
function xpProfileEmbed(interaction: ChatInputCommandInteraction, user: { xp: number; level: number }, username: string) {
  const start = levelStart(user.level);
  const next = nextLevelXp(user.level);
  const span = Math.max(1, next - start);
  const progress = Math.min(1, Math.max(0, (user.xp - start) / span));
  const filled = Math.round(progress * 10);
  const bar = `${'█'.repeat(filled)}${'░'.repeat(10 - filled)}`;
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${getWimplyLogo(interaction.guild)} XP PROFILE`)
    .setDescription(`**${username}**\n\n🏆 Level **${user.level}**\n✨ XP **${user.xp.toLocaleString()}**\n\n${bar} **${Math.round(progress * 100)}%**\n\n📈 Next level: **${next.toLocaleString()} XP**\n🎯 Remaining: **${Math.max(0, next - user.xp).toLocaleString()} XP**`);
}

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('View XP or manage member XP')
    .addStringOption(o => o.setName('action').setDescription('Administrator action').setRequired(false).addChoices(
      { name: 'Set XP', value: 'set' }, { name: 'Add XP', value: 'add' }, { name: 'Remove XP', value: 'remove' }, { name: 'Set Level', value: 'level' },
      { name: 'Enable level-up notices', value: 'notify-on' }, { name: 'Disable level-up notices', value: 'notify-off' }, { name: 'Change level-up message', value: 'message' }
    ))
    .addUserOption(o => o.setName('user').setDescription('Member (optional when viewing XP)').setRequired(false))
    .addIntegerOption(o => o.setName('amount').setDescription('XP amount or level').setRequired(false).setMinValue(0))
    .addStringOption(o => o.setName('text').setDescription('Message; use {user} and {level}').setRequired(false)),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const action = interaction.options.getString('action');

    if (!action) {
      const target = interaction.options.getUser('user') ?? interaction.user;
      const { user } = await getOrCreateUser(target.id, interaction.guildId);
      await interaction.reply({ embeds: [xpProfileEmbed(interaction, user, target.username)] });
      return;
    }

    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) throw new AppError('Only server administrators can manage XP.');

    if (action === 'notify-on' || action === 'notify-off' || action === 'message') {
      const data = action === 'notify-on' ? { levelUpEnabled: true } : action === 'notify-off' ? { levelUpEnabled: false } : { levelUpMessage: interaction.options.getString('text', true) };
      await prisma.guildConfig.update({ where: { guildId: interaction.guildId }, data });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${getWimplyLogo(interaction.guild)} XP NOTIFICATIONS`).setDescription(action === 'message' ? `Level-up message set to:\n${data.levelUpMessage}` : `Level-up notifications are now **${data.levelUpEnabled ? 'enabled' : 'disabled'}**.`)] });
      return;
    }

    const target = interaction.options.getUser('user');
    const amount = interaction.options.getInteger('amount');
    if (!target || amount === null) throw new AppError('Use: `#xp set @user 1000`, `#xp add @user 100`, `#xp remove @user 100`, or `#xp level @user 5`.');
    if (action === 'level' && amount < 1) throw new AppError('Level must be at least **1**.');

    const { user } = await getOrCreateUser(target.id, interaction.guildId);
    const xp = action === 'set' ? amount : action === 'add' ? user.xp + amount : action === 'remove' ? Math.max(0, user.xp - amount) : Math.max(0, (amount - 1) ** 2 * 100);
    const level = action === 'level' ? amount : levelForXp(xp);
    await prisma.user.update({ where: { id: user.id }, data: { xp, level } });
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${getWimplyLogo(interaction.guild)} XP UPDATED`).setDescription(`**${target.username}**\n\n✨ XP: **${xp.toLocaleString()}**\n🏆 Level: **${level}**\n\nAction: **${action}**`)] });
  }
};

export default command;
