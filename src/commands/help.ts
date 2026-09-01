import { ChatInputCommandInteraction, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
import { createDefaultEmbed } from '../utils/embeds.js';
import { STYLE } from '../utils/presentation.js';

const aliases: Record<string, string> = {
  higherlower: 'hl', snailgarden: 'sg', blackjack: 'bj', coinflip: 'cf', leaderboard: 'lb',
  inventory: 'inv', balance: 'bal', profile: 'p', shop: 'sh', eightball: '8b', roll: 'r',
  choose: 'pick', networth: 'nw', fortune: 'f'
};

const categories = [
  { title: '💰 ECONOMY', names: ['balance','beg','crime','daily','deposit','leaderboard','monthly','networth','pay','rob','weekly','withdraw','work'] },
  { title: '🎰 CASINO', names: ['blackjack','coinflip','dice','higherlower','mines','slot','snailgarden'] },
  { title: '🎒 INVENTORY & SHOP', names: ['inventory','give','drop','use','shop','buy','sell'] },
  { title: '🎭 FUN & SOCIAL', names: ['choose','eightball','fortune','roll','ship'] },
  { title: '⚙️ SERVER', names: ['config','dashboard','economy','item'] },
  { title: '🤖 WIMPLY', names: ['bot','owner','ping','help'] }
];

function renderCategories(commands: string[]) {
  return categories.map(category => {
    const available = category.names.filter(name => commands.includes(name));
    if (!available.length) return '';
    const entries = available.map(name => `**/${name}**${aliases[name] ? ` · \`#${aliases[name]}\`` : ''}`).join('  •  ');
    return `╭─〔 ${category.title} 〕─╮\n〢 ${entries}\n╰─〔 ${available.length} command${available.length === 1 ? '' : 's'} 〕─╯`;
  }).filter(Boolean).join('\n\n');
}

const command: Command = {
  data: new SlashCommandBuilder().setName('help').setDescription('Open the Wimply command center'),
  async execute(interaction: ChatInputCommandInteraction) {
    const commands = [...(interaction.client.commands?.keys() ?? [])].sort();
    const uncategorized = commands.filter(name => !categories.some(category => category.names.includes(name)));
    const extra = uncategorized.length ? `\n\n╭─〔 🧩 MORE 〕─╮\n〢 ${uncategorized.map(name => `**/${name}**`).join('  •  ')}\n╰─〔 ${uncategorized.length} extra command${uncategorized.length === 1 ? '' : 's'} 〕─╯` : '';
    const embed = createDefaultEmbed()
      .setTitle(STYLE.title('📖', 'Wimply Command Center'))
      .setDescription(`〢 **${commands.length} commands loaded**\n〢 **Slash:** \`/command\`\n〢 **Prefix:** \`#command\` or \`!command\`\n〢 **Aliases:** quick shorthand is shown beside supported commands.\n\n${renderCategories(commands)}${extra}`)
      .setImage(interaction.client.user.bannerURL({ size: 1024 }) ?? interaction.client.user.displayAvatarURL({ size: 1024 }));
    await interaction.reply({ embeds: [embed] });
  }
};
export default command;
