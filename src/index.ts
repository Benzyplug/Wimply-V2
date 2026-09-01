import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client, Collection, GatewayIntentBits, REST, Routes } from 'discord.js';
import { env } from './config/env.js';
import { connectDatabase, prisma } from './services/database.js';
import { log } from './utils/logger.js';
import { handleProcessError } from './utils/errorHandler.js';
import type { Command } from './types/command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});
client.commands = new Collection<string, Command>();

function isLoadableModuleFile(name: string): boolean {
  if (name.endsWith('.d.ts')) return false;
  return name.endsWith('.ts') || name.endsWith('.js');
}

function getFilePaths(folder: string): string[] {
  const entries = fs.readdirSync(folder, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      paths.push(...getFilePaths(absolutePath));
    } else if (entry.isFile() && isLoadableModuleFile(entry.name)) {
      paths.push(absolutePath);
    }
  }

  return paths.sort((a, b) => a.localeCompare(b));
}

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = getFilePaths(commandsPath);
  const failed: string[] = [];

  for (const filePath of commandFiles) {
    const relativePath = `./${path.relative(__dirname, filePath).replace(/\\/g, '/')}`;
    try {
      const commandModule = await import(relativePath);
      const command = commandModule.default as Command;

      if (!command?.data || !command?.execute) {
        throw new Error('Missing default Command export with data and execute.');
      }

      const name = command.data.name;
      if (client.commands.has(name)) {
        throw new Error(`Duplicate command name "${name}". Command names must be unique.`);
      }

      client.commands.set(name, command);
      log.info(`Loaded /${name} ← ${path.relative(commandsPath, filePath)}`, 'Commands');
    } catch (error) {
      failed.push(`${path.relative(commandsPath, filePath)}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (failed.length) {
    throw new Error(`Command loading failed for ${failed.length} file(s):\n${failed.join('\n')}`);
  }

  log.info(`Command loader complete: ${client.commands.size} unique commands from ${commandFiles.length} files`, 'Commands');
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file: string) => isLoadableModuleFile(file)).sort();

  for (const file of eventFiles) {
    const eventModule = await import(`./events/${file}`);
    const event = eventModule.default;

    if (!event?.name || !event?.execute) {
      throw new Error(`Event file ${file} is missing required exports.`);
    }

    if (event.once) {
      client.once(event.name, (...args: unknown[]) => event.execute(...args));
    } else {
      client.on(event.name, (...args: unknown[]) => event.execute(...args));
    }

    log.info(`Registered event ${event.name}`, 'Events');
  }
}

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(env.BOT_TOKEN);
  const commands = client.commands.map((command: Command) => command.data.toJSON());

  if (commands.length > 100) {
    throw new Error(`Discord supports at most 100 global/guild slash commands. Wimply currently has ${commands.length}.`);
  }

  if (env.GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), { body: commands });
    log.info(`Registered ${commands.length} guild commands to ${env.GUILD_ID}`, 'Commands');

    // Clear stale global registrations so old global commands cannot appear
    // beside the current guild command set as duplicates.
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: [] });
    log.info('Cleared stale global command registrations', 'Commands');
  } else {
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: commands });
    log.info(`Registered ${commands.length} global commands`, 'Commands');
    log.warn('No GUILD_ID configured. Global command propagation can take time; use GUILD_ID for immediate server testing.', 'Commands');
  }

  log.info(`Command registry: ${commands.map((command: any) => `/${command.name}`).join(', ')}`, 'Commands');
}

async function bootstrap() {
  try {
    console.log('1. Connecting database...');
    await connectDatabase();

    console.log('2. Loading commands...');
    await loadCommands();

    console.log('3. Loading events...');
    await loadEvents();

    console.log('4. Registering commands...');
    await registerCommands();

    console.log('5. Logging into Discord...');
    await client.login(env.BOT_TOKEN);

    console.log(`✅ BOT ONLINE • ${client.commands.size} commands ready`);
  } catch (err) {
    console.error('BOOTSTRAP ERROR:');
    console.error(err);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => handleProcessError(reason, 'UnhandledRejection'));
process.on('uncaughtException', (error) => handleProcessError(error, 'UncaughtException'));
process.on('SIGINT', async () => {
  log.info('Shutting down gracefully', 'Bootstrap');
  await prisma.$disconnect();
  process.exit(0);
});

bootstrap();
