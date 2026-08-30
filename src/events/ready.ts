import { ActivityType } from 'discord.js';
import type { Client } from 'discord.js';
import { log } from '../utils/logger.js';

const statuses = [
  '〢 👥 5,120 Members',
  '〢 🏠 {SERVERS} Servers',
  '〢 👑 Made by ẞ€ÑZ¥',
  '〢 🤝 Community Collaboration',
  '〢 🚀 Server Coming Soon',
  '〢 💎 Official WIMPLY',
  '〢 🛠️ Development in Progress',
  '〢 🌐 WIMPLY Community'
];

let statusIndex = 0;

export default {
  name: 'clientReady',
  once: true,

  execute(client: Client) {
    const updateStatus = async () => {
      try {
        const guilds = await client.guilds.fetch();
        const serverCount = guilds.size;

        const status = statuses[statusIndex].replace(
          '{SERVERS}',
          serverCount.toString()
        );

        client.user?.setPresence({
          activities: [
            {
              name: 'Custom Status',
              type: ActivityType.Custom,
              state: status
            }
          ],
          status: 'idle'
        });

        statusIndex = (statusIndex + 1) % statuses.length;
      } catch (error) {
        log.error(
          `Failed to update bot status: ${error instanceof Error ? error.message : String(error)}`,
          'Ready'
        );
      }
    };

    void updateStatus();

    setInterval(() => {
      void updateStatus();
    }, 3000);

    log.info('=== Wimply Economy Bot ===', 'Ready');
    log.info(`Logged in as ${client.user?.tag}`, 'Ready');
    log.info('Environment: development', 'Ready');
    log.info(`Shard latency: ${client.ws.ping}ms`, 'Ready');
  }
};