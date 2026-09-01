import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';
import { prisma } from '../../services/database.js';
import { getOrCreateUser } from '../../services/userService.js';

const BACKGROUNDS = [
  ['midnight', '🌑', 'Midnight', 'Dark blue / classic Wimply'],
  ['ocean', '🌊', 'Ocean', 'Deep blue / cyan'],
  ['royal', '👑', 'Royal', 'Purple / premium'],
  ['neon', '🟢', 'Neon', 'Emerald / cyber'],
  ['gold', '🪙', 'Gold', 'Black / gold']
] as const;

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('profilebackground')
    .setDescription('List or set your profile background')
    .addStringOption(option => option.setName('background').setDescription('Background to use').setRequired(false).addChoices(...BACKGROUNDS.map(([value, , name]) => ({ name, value })))),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) { await interaction.reply({ content: 'This command must be used in a guild.', ephemeral: true }); return; }
    const selected = interaction.options.getString('background');
    const { user } = await getOrCreateUser(interaction.user.id, interaction.guildId);
    if (selected) {
      await prisma.user.update({ where: { id: user.id }, data: { profileBackground: selected } });
      await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('🖼️ Profile Background Updated').setDescription(`Your profile now uses **${selected}**.\n\nUse \`/profile\` or \`#profile\` to view it.`)] });
      return;
    }
    const lines = BACKGROUNDS.map(([value, emoji, name, description]) => `${emoji} **${name}** — \`${value}\`\n└ ${description}${value === user.profileBackground ? '  ← **ACTIVE**' : ''}`).join('\n');
    await interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle('🖼️ Wimply Profile Backgrounds').setDescription(`${lines}\n\nUse \`/profilebackground background:<name>\` to change yours.`)] });
  }
};
export default command;
