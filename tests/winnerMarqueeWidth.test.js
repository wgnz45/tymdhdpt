import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('winner marquee width alignment', () => {
  const source = readFileSync('src/pages/PortalStyleSports.jsx', 'utf8');

  it('keeps the winner marquee in the left content column instead of spanning into the sidebar column', () => {
    const marker = '{/* 中奖喜报跑马灯 - 轮播下方 */}';
    const start = source.indexOf(marker);

    expect(start).toBeGreaterThan(-1);

    const snippet = source.slice(start, start + 500);

    expect(snippet).toContain('className="col-start-1 row-start-2');
    expect(snippet).not.toContain('col-span-2');
  });
});
