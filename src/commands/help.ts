import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { createDefaultEmbed } from '../utils/embeds.js';

const command: Command = {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Open the Wimply command center'),
  async execute(interaction: ChatInputCommandInteraction) {
    const commands = [...(interaction.client.commands?.keys() ?? [])].sort();
    const categories = [
      { title: '💰 ECONOMY', names: ['balance', 'beg', 'crime', 'daily', 'deposit', 'leaderboard', 'monthly', 'pay', 'rob', 'weekly', 'withdraw', 'work'] },
      { title: '🎰 CASINO', names: ['blackjack', 'coinflip', 'dice', 'higherlower', 'mines', 'slot', 'snailgarden'] },
      { title: '🎒 INVENTORY', names: ['inventory', 'give', 'drop', 'use'] },
      { title: '🛒 SHOP', names: ['shop', 'buy', 'sell'] },
      { title: '🛡️ ADMIN', names: ['config', 'dashboard', 'economy', 'item', 'mod'] },
      { title: '🤖 SYSTEM', names: ['bot', 'owner', 'ping', 'help'] }
    ];

    const sections = categories.map(category => {
      const available = category.names.filter(name => commands.includes(name));
      return `╭〔 ${category.title} 〕╮\n〢 ${available.map(name => `**/${name}**`).join(' • ') || 'No commands loaded.'}`;
    }).join('\n\n');

    const embed = createDefaultEmbed()
      .setTitle('╭─〔 📖 WIMPLY COMMAND CENTER 〕─╮')
      .setDescription(`〢 **${commands.length} commands loaded**\n〢 **Slash:** \`/command\`\n〢 **Prefix:** \`#command\` or \`!command\`\n〢 Prefix and slash commands use the same backend logic.\n\n${sections}\n\n╰─〔 ⚡ Wimply V2.0 • Official Bot 〕─╯`)
      .setThumbnail(interaction.client.user.displayAvatarURL({ size: 256 }));

    await interaction.reply({ embeds: [embed] });
  }
};

export default command;
