/**
 * Shared utility functions for admin pages.
 * Extracted from SuperAdmin.jsx and StoreConfig.jsx to eliminate duplication.
 */

export const DEFAULT_MANAGER_TITLES = ['店长', '先生', '女士'];
export const SURNAME_PATTERN = /^[\u4e00-\u9fa5]{1,2}$/;
export const PHONE_PATTERN = /^\d{11}$/;

export const sanitizeManagerTitles = (titles) => {
    const source = Array.isArray(titles) ? titles : [];
    const allowed = new Set(DEFAULT_MANAGER_TITLES);
    const finalList = source
        .map(item => String(item || '').trim())
        .filter(item => item && allowed.has(item))
        .filter((item, idx, arr) => arr.indexOf(item) === idx);
    return finalList.length > 0 ? finalList : [...DEFAULT_MANAGER_TITLES];
};

export const splitManagerText = (value, titles = DEFAULT_MANAGER_TITLES) => {
    const raw = String(value || '').trim();
    if (!raw) return { surname: '', title: titles[0] || DEFAULT_MANAGER_TITLES[0] };
    const validTitles = sanitizeManagerTitles(titles);
    for (const title of validTitles) {
        if (raw.endsWith(title)) {
            return { surname: raw.slice(0, -title.length), title };
        }
    }
    return { surname: raw, title: validTitles[0] || DEFAULT_MANAGER_TITLES[0] };
};

export const clampRgb = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(255, Math.round(n)));
};

export const parseColorToRgb = (input) => {
    const raw = String(input || '').trim();
    const rgbMatch = raw.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (rgbMatch) {
        return {
            r: clampRgb(rgbMatch[1]),
            g: clampRgb(rgbMatch[2]),
            b: clampRgb(rgbMatch[3])
        };
    }
    const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
        const hex = hexMatch[1].length === 3
            ? hexMatch[1].split('').map(ch => ch + ch).join('')
            : hexMatch[1];
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    }
    return null;
};

export const toRgbString = (rgb) => `rgb(${clampRgb(rgb?.r)}, ${clampRgb(rgb?.g)}, ${clampRgb(rgb?.b)})`;

export const normalizeColorToRgb = (color, fallback = 'rgb(59, 130, 246)') => {
    const parsed = parseColorToRgb(color);
    if (!parsed) return fallback;
    return toRgbString(parsed);
};

export const rgbaFromColor = (color, alpha = 1) => {
    const parsed = parseColorToRgb(color);
    if (!parsed) return `rgba(148, 163, 184, ${alpha})`;
    return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
};

export const getTagColor = (tag, availableTags = []) => {
    if (typeof tag === 'object' && tag.color) return tag.color;
    const name = String(typeof tag === 'string' ? tag : tag?.name || '').trim();

    const found = Array.isArray(availableTags) ? availableTags.find(t => String(t?.name || '').trim() === name) : null;
    if (found) return found.color;

    const map = {
        '福州': 'rgb(59, 130, 246)',
        '厦门': 'rgb(239, 68, 68)',
        '莆田': 'rgb(249, 115, 22)',
        '三明': 'rgb(16, 185, 129)',
        '泉州': 'rgb(16, 185, 129)',
        '漳州': 'rgb(139, 92, 246)',
        '南平': 'rgb(6, 182, 212)',
        '龙岩': 'rgb(245, 158, 11)',
        '宁德': 'rgb(148, 163, 184)',
        '最新': 'rgb(255, 65, 108)',
        '聚焦': 'rgb(0, 122, 255)',
        '行业': 'rgb(175, 82, 222)',
        '福建': 'rgb(52, 199, 89)',
        '活动': 'rgb(255, 149, 0)',
        '动态': 'rgb(142, 142, 147)',
        '全省投放': 'rgb(249, 115, 22)',
    };
    return map[name] || 'rgb(255, 255, 255)';
};

/** Display label for channel values (tv → 电视盒子, android → PC端) */
export const getChannelLabel = (channel) => {
    const labels = { tv: '电视盒子', android: 'PC端', announcement: '公告' };
    return labels[channel] || channel || '未知';
};
