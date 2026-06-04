import { describe, expect, it } from 'vitest';

import { getHeartbeatIntervalMs } from '../src/utils/performanceConfig.js';

describe('performanceConfig', () => {
  it('uses slower heartbeat cadence for box display mode', () => {
    expect(getHeartbeatIntervalMs({ isBoxMode: true })).toBe(30000);
  });

  it('keeps default heartbeat cadence for non-box mode', () => {
    expect(getHeartbeatIntervalMs({ isBoxMode: false })).toBe(15000);
  });
});
