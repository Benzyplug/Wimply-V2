import { ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import type { Command } from '../types/command.js';
const aliases: Record<string, string> = { higherlower: 'hl', snailgarden: 'sg', blackjack: 'bj', coinflip: 'cf', leaderboard: 'lb', inventory: 'inv', balance: 'bal', profile: 'p', shop: 'sh', eightball: '8b', roll: 'r', choose: 'pick', networth: 'nw', fortune: 'f', aviator: 'avi', achievements: 'ach', profilebackground: 'pbg', chickencrossroad: 'ccr' };
const categories = [
  ['💰 ECONOMY', ['balance','beg','crime','daily','deposit','leaderboard','monthly','networth','pay','rob','weekly','withdraw','work']],
  ['🎰 GAMES', ['aviator','blackjack','coinflip','dice','higherlower','mines','slot','snailgarden','chickencrossroad']],
  ['🎒 INVENTORY', ['inventory','give','drop','use','shop','buy','sell']],
  ['🎭 SOCIAL', ['achievements','aura','choose','eightball','fortune','profile','profilebackground','roll','ship']],
  ['⚙️ SERVER', ['config','dashboard','economy','item']],
  ['🤖 WIMPLY', ['bot','owner','ping','help']]
] as const;
function categoryText(commands: string[]) { return categories.map(([title, names]) => { const available = names.filter(name => commands.includes(name)); if (!available.length) return ''; const rows = available.map(name => `\`${aliases[name] ? `#${aliases[name]}` : `#${name}`}\`  **/${name}**`).join('\n'); return `**${title}**\n${rows}`; }).filter(Boolean).join('\n\n'); }
const command: Command = { data: new SlashCommandBuilder().setName('help').setDescription('Open the Wimply command center'), async execute(interaction: ChatInputCommandInteraction) { const commands = [...(interaction.client.commands?.keys() ?? [])].sort(); const embed = new EmbedBuilder().setColor(0x5865f2).setTitle('📖 WIMPLY HELP').setDescription(`**${commands.length} commands**  •  \`/\` slash  •  \`#\` prefix  •  \`!\` prefix\n\n${categoryText(commands)}\n\n**Quick start**\n\`#balance\`  ·  \`#daily\`  ·  \`#work\`  ·  \`#pay @user 1000\`\n\`#mines 1000 5\`  ·  \`#aviator 1000\`  ·  \`#blackjack 1000\``).setTimestamp().setFooter({ text: 'Wimply • Created & developed by ẞ€ÑZ¥' }); await interaction.reply({ embeds: [embed] }); } };
export default command;
