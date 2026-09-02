import { AttachmentBuilder, ChatInputCommandInteraction, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { deflateSync } from 'node:zlib';
import type { Command } from '../../types/command.js';
import { getOrCreateUser } from '../../services/userService.js';
import { getInventory } from '../../services/inventoryService.js';
import { prisma } from '../../services/database.js';
import { formatCurrency } from '../../utils/format.js';
import { STYLE } from '../../utils/presentation.js';

const FONT: Record<string, string[]> = {
  'A':['01110','10001','10001','11111','10001','10001','10001'],'B':['11110','10001','10001','11110','10001','10001','11110'],'C':['01111','10000','10000','10000','10000','10000','01111'],'D':['11110','10001','10001','10001','10001','10001','11110'],'E':['11111','10000','10000','11110','10000','10000','11111'],'F':['11111','10000','10000','11110','10000','10000','10000'],'G':['01111','10000','10000','10111','10001','10001','01111'],'H':['10001','10001','10001','11111','10001','10001','10001'],'I':['11111','00100','00100','00100','00100','00100','11111'],'J':['00111','00010','00010','00010','10010','10010','01100'],'K':['10001','10010','10100','11000','10100','10010','10001'],'L':['10000','10000','10000','10000','10000','10000','11111'],'M':['10001','11011','10101','10101','10001','10001','10001'],'N':['10001','11001','10101','10011','10001','10001','10001'],'O':['01110','10001','10001','10001','10001','10001','01110'],'P':['11110','10001','10001','11110','10000','10000','10000'],'Q':['01110','10001','10001','10001','10101','10010','01101'],'R':['11110','10001','10001','11110','10100','10010','10001'],'S':['01111','10000','10000','01110','00001','00001','11110'],'T':['11111','00100','00100','00100','00100','00100','00100'],'U':['10001','10001','10001','10001','10001','10001','01110'],'V':['10001','10001','10001','10001','10001','01010','00100'],'W':['10001','10001','10001','10101','10101','11011','10001'],'X':['10001','10001','01010','00100','01010','10001','10001'],'Y':['10001','10001','01010','00100','00100','00100','00100'],'Z':['11111','00001','00010','00100','01000','10000','11111'],
  '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'],
  ' ':['00000','00000','00000','00000','00000','00000','00000'], ':':['00000','00100','00100','00000','00100','00100','00000'], '-':['00000','00000','00000','11111','00000','00000','00000'], '.':['00000','00000','00000','00000','00000','00110','00110']
};
const THEMES: Record<string, { bg: [number,number,number]; panel: [number,number,number]; accent: [number,number,number] }> = {
  midnight: { bg:[10,16,30], panel:[18,28,48], accent:[88,101,242] }, ocean: { bg:[5,25,42], panel:[9,43,65], accent:[45,180,210] }, royal: { bg:[25,10,38], panel:[45,18,64], accent:[170,90,255] }, neon: { bg:[8,20,18], panel:[12,42,34], accent:[50,220,150] }, gold: { bg:[35,25,8], panel:[58,42,13], accent:[235,185,60] }
};
function crc32(buffer: Buffer) { let crc = 0xffffffff; for (const byte of buffer) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0); } return (crc ^ 0xffffffff) >>> 0; }
function chunk(type: string, data: Buffer) { const t = Buffer.from(type); const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); t.copy(out, 4); data.copy(out, 8); out.writeUInt32BE(crc32(Buffer.concat([t, data])), 8 + data.length); return out; }
function png(width: number, height: number, pixels: Buffer) { const raw = Buffer.alloc((width * 4 + 1) * height); for (let y = 0; y < height; y++) { raw[y * (width * 4 + 1)] = 0; pixels.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4); } const header = Buffer.alloc(13); header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4); header[8]=8; header[9]=6; return Buffer.concat([Buffer.from('\x89PNG\r\n\x1a\n','binary'), chunk('IHDR',header), chunk('IDAT',deflateSync(raw)), chunk('IEND',Buffer.alloc(0))]); }
function cardImage(name: string, level: number, xp: number, previousXp: number, nextXp: number, wallet: string, bank: string, inventory: number, themeName: string) {
  const theme = THEMES[themeName] ?? THEMES.midnight;
  const width=1000,height=560,pixels=Buffer.alloc(width*height*4);
  const set=(x:number,y:number,r:number,g:number,b:number,a=255)=>{if(x<0||y<0||x>=width||y>=height)return;const i=(y*width+x)*4;pixels[i]=r;pixels[i+1]=g;pixels[i+2]=b;pixels[i+3]=a;};
  const rect=(x:number,y:number,w:number,h:number,c:[number,number,number])=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)set(xx,yy,...c);};
  const text=(value:string,x:number,y:number,scale:number,c:[number,number,number])=>{let cx=x;for(const char of value.toUpperCase().slice(0,34)){const glyph=FONT[char]??FONT[' '];for(let gy=0;gy<7;gy++)for(let gx=0;gx<5;gx++)if(glyph[gy][gx]==='1')rect(cx+gx*scale,y+gy*scale,scale,scale,c);cx+=6*scale;}};
  rect(0,0,width,height,theme.bg); rect(24,24,width-48,height-48,theme.panel); rect(24,24,width-48,8,theme.accent);
  text('WIMPLY PROFILE',55,55,5,[240,244,255]); text(`LEVEL ${level}`,55,115,5,theme.accent); text(name,55,165,4,[255,255,255]);
  text('WALLET',55,245,3,[150,165,190]); text(wallet,55,275,4,[255,255,255]); text('BANK',500,245,3,[150,165,190]); text(bank,500,275,4,[255,255,255]);
  text(`INVENTORY ${inventory}`,55,350,3,[150,165,190]); text(`BACKGROUND ${themeName}`,500,350,3,[150,165,190]); text('XP',55,405,3,[150,165,190]);
  const progress=Math.max(0,Math.min(1,(xp-previousXp)/Math.max(1,nextXp-previousXp))); rect(55,440,890,22,[35,48,72]); rect(55,440,Math.floor(890*progress),22,theme.accent); text(`${xp} / ${nextXp}`,55,480,2,[220,228,245]);
  text('BADGES • ACHIEVEMENTS • GAME STATS',55,515,2,[170,185,205]); return png(width,height,pixels);
}
const command: Command = {
  data: new SlashCommandBuilder().setName('profile').setDescription('View a Wimply economy profile').addUserOption(o => o.setName('user').setDescription('User to view').setRequired(false)).addStringOption(o => o.setName('background').setDescription('Set your profile background').setRequired(false).addChoices({name:'Midnight',value:'midnight'},{name:'Ocean',value:'ocean'},{name:'Royal',value:'royal'},{name:'Neon',value:'neon'},{name:'Gold',value:'gold'})),
  async execute(interaction: ChatInputCommandInteraction) {
    if (!interaction.guildId) { await interaction.reply({ content: 'This command must be used in a guild.' }); return; }
    await interaction.deferReply();
    const requestedUser = interaction.options.getUser('user');
    const target = requestedUser ?? interaction.user;
    const selectedBackground = interaction.options.getString('background');
    if (selectedBackground && target.id !== interaction.user.id) { await interaction.editReply({ content: 'You can only change your own profile background. Use `/profile user:<member>` to view another profile.' }); return; }
    let { user, config } = await getOrCreateUser(target.id, interaction.guildId);
    if (selectedBackground && selectedBackground !== user.profileBackground) user = await prisma.user.update({ where: { id: user.id }, data: { profileBackground: selectedBackground } });
    const inventory = await getInventory(user);
    const transactions = await prisma.economyTransaction.findMany({ where: { userId: user.id, source: { in: ['blackjack','coinflip','dice','higherlower','mines','slot','snailgarden'] } }, select: { source: true, amount: true }, orderBy: { createdAt: 'desc' }, take: 5000 });
    const gameSources = ['blackjack','coinflip','dice','higherlower','mines','slot','snailgarden'];
    const gameStats = Object.fromEntries(gameSources.map(source => [source, { played: 0, wins: 0, profit: 0n }]));
    for (const transaction of transactions) { const stats = gameStats[transaction.source]; if (!stats) continue; if (transaction.amount < 0n) stats.played += 1; if (transaction.amount > 0n) stats.wins += 1; stats.profit += transaction.amount; }
    const totalPlayed = Object.values(gameStats).reduce((sum, stats) => sum + stats.played, 0);
    const totalWins = Object.values(gameStats).reduce((sum, stats) => sum + stats.wins, 0);
    const casinoProfit = Object.values(gameStats).reduce((sum, stats) => sum + stats.profit, 0n);
    const netWorth = user.wallet + user.bank;
    const previousXp = Math.pow(Math.max(0,user.level-1),2)*100;
    const nextXp = Math.pow(user.level,2)*100;
    const progress = Math.max(0,Math.min(100,((user.xp-previousXp)/Math.max(1,nextXp-previousXp))*100));
    const badges = [...new Set([...user.badges,...(user.level >= 5 ? ['🏅 Rising Star'] : []),...(netWorth >= 10_000n ? ['💰 Money Maker'] : []),...(totalWins >= 10 ? ['🎰 Lucky Winner'] : []),...(totalPlayed >= 50 ? ['🎮 Game Regular'] : [])])];
    const achievements = [user.level >= 2 ? '🌟 Reached Level 2' : null,netWorth >= 100_000n ? '💎 100K Net Worth' : null,totalWins >= 25 ? '🏆 25 Game Wins' : null,totalPlayed >= 100 ? '🎮 100 Games Played' : null,user.xp >= 1_000 ? '📊 1K XP Earned' : null].filter((value): value is string => value !== null);
    const attachment = new AttachmentBuilder(cardImage(target.username,user.level,user.xp,previousXp,nextXp,user.wallet.toLocaleString(),user.bank.toLocaleString(),inventory.length,user.profileBackground),{name:'wimply-profile.png'});
    const topGames = gameSources.filter(source => gameStats[source].played > 0).sort((a,b) => gameStats[b].played - gameStats[a].played).slice(0, 4).map(source => `${source === 'higherlower' ? 'Higher/Lower' : source[0].toUpperCase()+source.slice(1)}: **${gameStats[source].played}** played • **${gameStats[source].wins}** wins`).join('\n') || 'No casino games recorded yet.';
    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(STYLE.title('👤',`${target.username}'s Profile`)).setDescription(`〢 **Level ${user.level}** • **${Math.floor(progress)}% XP**\n〢 ${formatCurrency(user.wallet,config.currencyEmoji)} wallet • ${formatCurrency(user.bank,config.currencyEmoji)} bank\n〢 💰 Net worth: **${formatCurrency(netWorth,config.currencyEmoji)}**\n\n🏅 **Badges**\n${badges.length ? badges.join(' • ') : 'No badges yet.'}\n\n🏆 **Achievements**\n${achievements.length ? achievements.join('\n') : 'No achievements unlocked yet.'}`).setThumbnail(target.displayAvatarURL({ size: 256 })).addFields(
      { name:'📊 PROGRESS / XP', value:`Level **${user.level}**\nXP **${user.xp.toLocaleString()} / ${nextXp.toLocaleString()}**\nProgress **${Math.floor(progress)}%**`, inline:true },
      { name:'🎮 GAME STATS', value:`Games played: **${totalPlayed}**\nWins: **${totalWins}**\nNet game profit: **${formatCurrency(casinoProfit,config.currencyEmoji)}**`, inline:true },
      { name:'🎰 RECENT GAME RECORD', value:topGames, inline:false },
      { name:'🖼️ PROFILE BACKGROUND', value:`**${user.profileBackground}**\nUse \`#profile ${user.profileBackground === 'midnight' ? 'ocean' : 'midnight'}\` to switch.`, inline:true },
      { name:'🎒 INVENTORY', value:`**${inventory.length}** unique items`, inline:true }
    ).setImage('attachment://wimply-profile.png').setFooter({ text: STYLE.brand }).setTimestamp();
    await interaction.editReply({ embeds:[embed], files:[attachment] });
  }
};
export default command;
