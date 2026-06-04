import { describe, expect, it } from 'vitest';

import {
  getHomePollingIntervalMs,
  getPortalAnnouncementsIntervalMs,
  getPortalSourcesIntervalMs,
  getPortalStoreIntervalMs,
  getNoisePhaseIntervalMs,
} from '../src/utils/performanceConfig.js';

describe('polling intervals', () => {
  it('slows Home polling for box mode', () => {
    expect(getHomePollingIntervalMs({ isBoxMode: true })).toBe(180000);
  });

  it('slows Portal store polling for box mode', () => {
    expect(getPortalStoreIntervalMs({ isBoxMode: true })).toBe(30000);
  });

  it('slows Portal announcements polling for box mode', () => {
    expect(getPortalAnnouncementsIntervalMs({ isBoxMode: true })).toBe(60000);
  });

  it('slows Portal sources polling for box mode', () => {
    expect(getPortalSourcesIntervalMs({ isBoxMode: true })).toBe(120000);
  });

  it('slows noise animation cadence for box mode', () => {
    expect(getNoisePhaseIntervalMs({ isBoxMode: true })).toBe(120);
  });
});
