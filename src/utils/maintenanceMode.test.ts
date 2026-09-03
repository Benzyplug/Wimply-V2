import { describe, expect, it } from 'vitest';
import { MAINTENANCE_VERSION, buildMaintenanceMessage } from './maintenanceMode.js';

describe('maintenance mode', () => {
  it('builds the Wimply development message with the next version and owner without a ping', () => {
    const message = buildMaintenanceMessage('Wimply_logo', 'https://example.com/banner.png');

    expect(MAINTENANCE_VERSION).toBe('Wimply V3.2.0');
    expect(message.embeds[0].title).toContain('Wimply');
    expect(message.embeds[0].description).toContain('V3.2.0');
    expect(message.embeds[0].description).toContain('ẞ€ÑZ¥');
    expect(message.embeds[0].description).toContain('beach break');
    expect(message.embeds[0].image).toBe('https://example.com/banner.png');
    expect(message.allowedMentions).toEqual({ parse: [] });
    expect(message.content).not.toContain('<@');
  });
});
