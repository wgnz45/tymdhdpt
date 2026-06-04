import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('right-column welfare mini cards', () => {
  const source = readFileSync('src/pages/PortalStyleSports.jsx', 'utf8');

  it('defines a national welfare mini card that uses the same mini-card pattern as Fujian with a different color', () => {
    expect(source).toContain('const NationalWelfareMini');
    expect(source).toContain("{'\\u5168\\u56fd\\u4f53\\u5f69\\u516c\\u76ca\\u91d1'}");
    expect(source).toContain('from-blue-50');
    expect(source).toContain('text-blue-500');
    expect(source).toContain('border-blue-100');
  });

  it('renders national welfare above Fujian welfare in the right column when data exists', () => {
    const nationalIdx = source.indexOf('<NationalWelfareMini data={nationalList} />');
    const fujianIdx = source.indexOf('<FujianWelfareMini data={fujianList} />');

    expect(nationalIdx).toBeGreaterThan(-1);
    expect(fujianIdx).toBeGreaterThan(-1);
    expect(nationalIdx).toBeLessThan(fujianIdx);
    expect(source).toContain('nationalList.length > 0');
  });

  it('uses compact number rows for national welfare so long totals fit the android pad column', () => {
    expect(source).toContain('national-welfare-number-row');
    expect(source).toContain('min-w-0 flex-1 truncate');
    expect(source).toContain('text-[clamp(18px,2.35vw,22px)]');
    expect(source).toContain('tracking-[-0.05em]');
    expect(source).toContain('text-[10px] font-black text-blue-500/80 shrink-0');
  });

});
