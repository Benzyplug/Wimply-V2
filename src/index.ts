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

function getFilePaths(folder: string): string[] {
  const entries = fs.readdirSync(folder, { withFileTypes: true });
  const paths: string[] = [];

  for (const entry of entries) {
    const absolutePath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      paths.push(...getFilePaths(absolutePath));
    } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
      paths.push(absolutePath);
    }
  }

  return paths;
}

async function loadCommands() {
  const commandsPath = path.join(__dirname, 'commands');
  const commandFiles = getFilePaths(commandsPath);

  for (const filePath of commandFiles) {
    const relativePath = `./${path.relative(__dirname, filePath).replace(/\\/g, '/')}`;
    const commandModule = await import(relativePath);
    const command = commandModule.default as Command;

    if (!command?.data || !command?.execute) {
      log.warn(`Skipped command file without required exports: ${path.basename(filePath)}`, 'Commands');
      continue;
    }

    client.commands.set(command.data.name, command);
    log.info(`Loaded /${command.data.name}`, 'Commands');
  }
}

async function loadEvents() {
  const eventsPath = path.join(__dirname, 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter((file: string) => file.endsWith('.ts') || file.endsWith('.js'));

  for (const file of eventFiles) {
    const eventModule = await import(`./events/${file}`);
    const event = eventModule.default;

    if (!event?.name || !event?.execute) {
      log.warn(`Skipped event file without required exports: ${file}`, 'Events');
      continue;
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

  if (env.GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID), { body: commands });
    log.info(`Registered ${commands.length} commands to guild ${env.GUILD_ID}`, 'Commands');
  } else {
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body: commands });
    log.info(`Registered ${commands.length} global commands`, 'Commands');
  }
}

async function bootstrap() {
  try {
    console.log("1. Connecting database...");
    await connectDatabase();

    console.log("2. Loading commands...");
    await loadCommands();

    console.log("3. Loading events...");
    await loadEvents();

    console.log("4. Registering commands...");
    await registerCommands();

    console.log("5. Logging into Discord...");
    await client.login(env.BOT_TOKEN);

    console.log("✅ BOT ONLINE");
  } catch (err) {
    console.error("BOOTSTRAP ERROR:");
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
