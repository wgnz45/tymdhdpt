export const GAME_HUB_KEYS = ['lotto', 'scratch', 'lianliankan', 'sticker', 'xiaoxiaole', 'flappy'];

export const GAME_HUB_APPS = [
  { key: 'lotto', name: '快乐透随机选号', logoUrl: '/game-logos/lotto.png', route: 'lotto' },
  { key: 'scratch', name: '顶呱刮幸运选票', logoUrl: '/game-logos/scratch.png', route: 'scratch' },
  { key: 'lianliankan', name: '体彩连连乐', logoUrl: '/game-logos/lianliankan.png', route: 'lianliankan' },
  { key: 'sticker', name: '乐小星大头贴', logoUrl: '/game-logos/sticker.png', route: 'sticker' },
  { key: 'xiaoxiaole', name: '体彩消消乐', logoUrl: '/game-logos/xiaoxiaole.png', route: 'xiaoxiaole' },
  { key: 'flappy', name: '乐小星快飞', logoUrl: '/game-logos/flappy.png', route: 'flappy' },
];

export const GAME_HUB_MODAL_COPY = {
  title: '乐小星互动中心',
  subtitle: '点击图标进入互动体验',
  titleClassName: 'text-center font-black text-gray-900 text-[clamp(1.35rem,2.2vw,2rem)] tracking-tight leading-tight',
  subtitleClassName: 'text-center text-[12px] sm:text-sm text-slate-700 font-bold tracking-[0.12em] leading-none mt-2',
};

export const GAME_HUB_FOLDER_STYLES = {
  overlay: {
    background: 'rgba(10, 18, 30, 0.18)',
    backdropFilter: 'blur(28px) saturate(160%)',
    WebkitBackdropFilter: 'blur(28px) saturate(160%)',
  },
  panel: {
    background: 'linear-gradient(135deg, rgba(255,255,255,0.46), rgba(255,255,255,0.22))',
    backdropFilter: 'blur(52px) saturate(190%)',
    WebkitBackdropFilter: 'blur(52px) saturate(190%)',
    border: '1px solid rgba(255,255,255,0.48)',
    boxShadow: '0 34px 90px rgba(15,23,42,0.24), inset 0 1px 0 rgba(255,255,255,0.68), inset 0 -1px 0 rgba(255,255,255,0.16)',
  },
};

export function buildGameHubPreviewLayout(androidPadMode, orderedKeys) {
  var keys = orderedKeys || GAME_HUB_KEYS;
  if (androidPadMode) {
    return {
      gridClassName: 'grid-cols-2 grid-rows-2',
      directKeys: keys.slice(0, 3),
      stackedKeys: keys.slice(3),
      cellCount: 4,
    };
  }

  return {
    gridClassName: 'grid-cols-3 grid-rows-2',
    directKeys: keys,
    stackedKeys: [],
    cellCount: keys.length,
  };
}

export function buildGameHubCardStyle({ androidPadMode, gameButtonSize }) {
  return {
    width: androidPadMode ? '100%' : gameButtonSize * 1.15,
    height: 'auto',
    borderRadius: '24px',
  };
}
