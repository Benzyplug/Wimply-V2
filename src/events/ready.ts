import { ActivityType } from 'discord.js';
import type { Client } from 'discord.js';
import { log } from '../utils/logger.js';

export default {
  name: 'clientReady',
  once: true,
  execute(client: Client) {
    client.user?.setPresence({
      status: 'dnd',
      activities: [{ name: 'Wimply Economy', type: ActivityType.Playing }]
    });
    log.info('=== Wimply Economy Bot ===', 'Ready');
    log.info(`Logged in as ${client.user?.tag}`, 'Ready');
    log.info(`Shard latency: ${client.ws.ping}ms`, 'Ready');
    log.info('Presence: DND', 'Ready');
  }
};
