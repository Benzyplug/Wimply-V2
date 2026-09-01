import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { createDefaultEmbed } from '../utils/embeds.js';
import { STYLE } from '../utils/presentation.js';

const aliases: Record<string, string> = {
  higherlower: 'hl',
  snailgarden: 'sg',
  blackjack: 'bj',
  coinflip: 'cf',
  leaderboard: 'lb',
  inventory: 'inv',
  balance: 'bal',
  profile: 'p',
  shop: 'sh'
};

const command: Command = {
  data: new SlashCommandBuilder().setName('help').setDescription('Open the Wimply command center'),
  async execute(interaction: ChatInputCommandInteraction) {
    const commands = [...(interaction.client.commands?.keys() ?? [])].sort();
    const categories = [
      { title: '💰 ECONOMY', names: ['balance','beg','crime','daily','deposit','leaderboard','monthly','pay','rob','weekly','withdraw','work'] },
      { title: '🎰 CASINO', names: ['blackjack','coinflip','dice','higherlower','mines','slot','snailgarden'] },
      { title: '🎒 INVENTORY', names: ['inventory','give','drop','use'] },
      { title: '🛒 SHOP', names: ['shop','buy','sell'] },
      { title: '⚙️ SERVER', names: ['config','dashboard','economy','item'] },
      { title: '🤖 WIMPLY', names: ['bot','owner','ping','help'] }
    ];
    const sections = categories.map(category => {
      const available = category.names.filter(name => commands.includes(name));
      const entries = available.map(name => `**/${name}**${aliases[name] ? ` · \`#${aliases[name]}\`` : ''}`).join(' • ');
      return `╭─〔 ${category.title} 〕─╮\n〢 ${entries || 'No commands loaded.'}\n╰─〔 ${available.length} command${available.length === 1 ? '' : 's'} 〕─╯`;
    }).join('\n\n');
    const embed = createDefaultEmbed()
      .setTitle(STYLE.title('📖', 'Wimply Command Center'))
      .setDescription(`〢 **${commands.length} commands**\n〢 **Slash:** \`/command\`\n〢 **Prefix:** \`#command\` or \`!command\`\n〢 **Quick aliases:** use the short forms shown beside supported commands.\n\n${sections}\n\n╰─〔 ⚡ ${STYLE.version} • ẞ€ÑZ¥ 〕─╯`)
      .setImage(interaction.client.user.bannerURL({ size: 1024 }) ?? interaction.client.user.displayAvatarURL({ size: 1024 }));
    await interaction.reply({ embeds: [embed] });
  }
};
export default command;
