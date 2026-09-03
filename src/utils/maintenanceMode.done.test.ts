import { describe, expect, it } from 'vitest';
import { MAINTENANCE_VERSION, buildMaintenanceMessage } from './maintenanceMode.js';

describe('maintenance mode', () => {
  it('builds the maintenance message without pinging the owner', () => {
    const message = buildMaintenanceMessage('Wimply_logo', 'https://example.com/banner.png');
    expect(MAINTENANCE_VERSION).toBe('Wimply V3.2.0');
    expect(message.allowedMentions).toEqual({ parse: [] });
  });
});
