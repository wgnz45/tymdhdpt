import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  GAME_HUB_APPS,
  GAME_HUB_FOLDER_STYLES,
  GAME_HUB_KEYS,
  GAME_HUB_MODAL_COPY,
  buildGameHubCardStyle,
  buildGameHubPreviewLayout,
} from '../src/pages/gameHubPreview.js';

const zh = (value) => JSON.parse(`"${value}"`);

describe('game hub preview layout', () => {
  it('uses a four-cell android pad preview with the fourth cell stacking the remaining icons', () => {
    const layout = buildGameHubPreviewLayout(true);

    expect(layout.gridClassName).toBe('grid-cols-2 grid-rows-2');
    expect(layout.directKeys).toEqual(['lotto', 'scratch', 'lianliankan']);
    expect(layout.stackedKeys).toEqual(['sticker', 'xiaoxiaole', 'flappy']);
    expect(layout.cellCount).toBe(4);
  });

  it('keeps the six-icon preview outside android pad mode', () => {
    const layout = buildGameHubPreviewLayout(false);

    expect(layout.gridClassName).toBe('grid-cols-3 grid-rows-2');
    expect(layout.directKeys).toEqual(GAME_HUB_KEYS);
    expect(layout.stackedKeys).toEqual([]);
    expect(layout.cellCount).toBe(6);
  });

  it('stretches android pad card width to its parent while preserving desktop sizing', () => {
    expect(buildGameHubCardStyle({ androidPadMode: true, gameButtonSize: 130 }).width).toBe('100%');
    expect(buildGameHubCardStyle({ androidPadMode: false, gameButtonSize: 170 }).width).toBeCloseTo(195.5);
  });

  it('uses Chinese-only iOS folder copy for the opened interaction center', () => {
    expect(GAME_HUB_MODAL_COPY.title).toBe(zh('\u4e50\u5c0f\u661f\u4e92\u52a8\u4e2d\u5fc3'));
    expect(GAME_HUB_MODAL_COPY.subtitle).toBe(zh('\u70b9\u51fb\u56fe\u6807\u8fdb\u5165\u4e92\u52a8\u4f53\u9a8c'));
    expect(`${GAME_HUB_MODAL_COPY.title} ${GAME_HUB_MODAL_COPY.subtitle}`).not.toMatch(/[A-Za-z]/);
  });

  it('uses an iOS-style folder glass panel style', () => {
    expect(GAME_HUB_FOLDER_STYLES.overlay.backdropFilter).toContain('blur(28px)');
    expect(GAME_HUB_FOLDER_STYLES.panel.backdropFilter).toContain('blur(52px)');
    expect(GAME_HUB_FOLDER_STYLES.panel.background).toContain('linear-gradient');
    expect(GAME_HUB_FOLDER_STYLES.panel.boxShadow).toContain('inset 0 1px 0');
  });

  it('uses centered plain iOS-folder typography with stronger subtitle contrast', () => {
    expect(GAME_HUB_MODAL_COPY.titleClassName).toContain('text-center');
    expect(GAME_HUB_MODAL_COPY.titleClassName).toContain('font-black');
    expect(GAME_HUB_MODAL_COPY.titleClassName).toContain('text-gray-900');
    expect(GAME_HUB_MODAL_COPY.titleClassName).toContain('tracking-tight');
    expect(GAME_HUB_MODAL_COPY.titleClassName).not.toContain('[text-shadow:');
    expect(GAME_HUB_MODAL_COPY.titleClassName).not.toContain('underline');
    expect(GAME_HUB_MODAL_COPY.titleClassName).not.toContain('decoration-cyan');
    expect(GAME_HUB_MODAL_COPY.titleClassName).not.toContain('bg-clip-text');
    expect(GAME_HUB_MODAL_COPY.titleClassName).not.toContain('text-transparent');
    expect(GAME_HUB_MODAL_COPY.subtitleClassName).toContain('text-slate-700');
    expect(GAME_HUB_MODAL_COPY.subtitleClassName).toContain('font-bold');
    expect(GAME_HUB_MODAL_COPY.subtitleClassName).not.toContain('bg-white/40');
  });

  it('keeps the original restrained iOS 26 folder glass background treatment', () => {
    expect(GAME_HUB_FOLDER_STYLES.overlay.background).toBe('rgba(10, 18, 30, 0.18)');
    expect(GAME_HUB_FOLDER_STYLES.overlay.backdropFilter).toContain('blur(28px)');
    expect(GAME_HUB_FOLDER_STYLES.overlay.backdropFilter).toContain('saturate(160%)');
    expect(GAME_HUB_FOLDER_STYLES.panel.background).toContain('rgba(255,255,255,0.46)');
    expect(GAME_HUB_FOLDER_STYLES.panel.backdropFilter).toContain('blur(52px)');
    expect(GAME_HUB_FOLDER_STYLES.panel.boxShadow).toContain('inset 0 1px 0');
  });

  it('defines the opened folder apps with stable keys and Chinese names', () => {
    expect(GAME_HUB_APPS.map((app) => app.key)).toEqual(GAME_HUB_KEYS);
    expect(GAME_HUB_APPS.map((app) => app.name)).toEqual([
      zh('\u5feb\u4e50\u900f\u968f\u673a\u9009\u53f7'),
      zh('\u9876\u5471\u522e\u5e78\u8fd0\u9009\u7968'),
      zh('\u4f53\u5f69\u8fde\u8fde\u4e50'),
      zh('\u4e50\u5c0f\u661f\u5927\u5934\u8d34'),
      zh('\u4f53\u5f69\u6d88\u6d88\u4e50'),
      zh('\u4e50\u5c0f\u661f\u5feb\u98de'),
    ]);
  });

  it('renders named, smaller game icons without a close circle or title icon in the opened folder', () => {
    const source = readFileSync('src/pages/PortalStyleSports.jsx', 'utf8');

    expect(source).toContain('GAME_HUB_APPS.map');
    expect(source).toContain('aria-label={`\\u6253\\u5f00${game.name}`}');
    expect(source).toContain('w-[clamp(82px,18vw,118px)]');
    expect(source).not.toContain('gameHubLiquidDrift');
    expect(source).not.toContain('gameHubSheen');
    expect(source).not.toContain('gameHubTitleHalo');
    expect(source).not.toContain("aria-hidden=\"true\">{'\\u2726'}</span>");
    expect(source).toContain('{game.name}');
    expect(source).not.toContain('<Gamepad2');
    expect(source).not.toContain('className="w-12 h-12 rounded-full');
  });
});
