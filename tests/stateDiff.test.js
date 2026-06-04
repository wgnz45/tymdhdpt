import { describe, expect, it } from 'vitest';

import { shouldUpdateState } from '../src/utils/performanceConfig.js';

describe('shouldUpdateState', () => {
  it('returns false when the payload is deeply equal', () => {
    const current = { announcements: [{ id: 1, text: 'same' }], config: { rounds: 99 } };
    const next = { announcements: [{ id: 1, text: 'same' }], config: { rounds: 99 } };

    expect(shouldUpdateState(current, next)).toBe(false);
  });

  it('returns true when the payload changes', () => {
    const current = { announcements: [{ id: 1, text: 'same' }] };
    const next = { announcements: [{ id: 1, text: 'changed' }] };

    expect(shouldUpdateState(current, next)).toBe(true);
  });
});
