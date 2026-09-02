import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { getOrCreateUser } from '../services/userService.js';
import { getWimplyLogo } from '../utils/presentation.js';

function levelStart(level: number) { return 100 * Math.max(0, level - 1) ** 2; }
function nextLevelXp(level: number) { return 100 * level ** 2; }

const command: Command = {
  data: new SlashCommandBuilder().setName('level').setDescription('View your Wimply level and XP progress'),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) return;
    const { user } = await getOrCreateUser(interaction.user.id, interaction.guildId);
    const start = levelStart(user.level);
    const next = nextLevelXp(user.level);
    const span = Math.max(1, next - start);
    const progress = Math.min(1, Math.max(0, (user.xp - start) / span));
    const filled = Math.round(progress * 12);
    const bar = `${'█'.repeat(filled)}${'░'.repeat(12 - filled)}`;
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`${getWimplyLogo(interaction.guild)} LEVEL ${user.level}`).setDescription(`**${interaction.user.username}**\n\n🏆 Current level: **${user.level}**\n✨ Current XP: **${user.xp.toLocaleString()}**\n📈 Next level: **${next.toLocaleString()} XP**\n🎯 XP remaining: **${Math.max(0, next - user.xp).toLocaleString()}**\n\n${bar} **${Math.round(progress * 100)}%**`)] });
  }
};

export default command;
