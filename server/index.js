const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
const crypto = require('crypto');
const QRCode = require('qrcode');
const compression = require('compression');
const { fetchAllDrawHistories } = require('./drawHistory.js');

const upload = multer({ storage: multer.memoryStorage() });
const { stitchParts, SCRATCH_IMG_DIR, crawlScratchCards, runAllCrawlers } = require('./crawler.js');
const puppeteer = require('puppeteer');

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

const app = express();
if (!global.globalDeviceStatus) global.globalDeviceStatus = {};
const PORT = process.env.PORT || 3366;
const HISTORY_FETCH_SIZE = 50;

app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' })); // Increase limit for image DataURLs
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Force serving data.json from public to ensure updates are live (skipping dist cache)
app.get('/data.json', (req, res) => {
    // Disable caching for this file
    res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.header('Expires', '-1');
    res.header('Pragma', 'no-cache');
    res.sendFile(path.join(__dirname, '../dist/data.json'));
});

// Serve static files from the React app
// Serve static files from the React app with No-Cache for index.html
app.use(express.static(path.join(__dirname, '../dist'), {
    etag: false,
    lastModified: false,
    setHeaders: (res, requestPath) => {
        if (requestPath.endsWith('.html') || requestPath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        } else {
            // JS/CSS 文件名含 hash，缓存 1 小时即可（hash 变了自动用新文件）
            res.setHeader('Cache-Control', 'public, max-age=3600');
        }
    }
}));

// 小游戏静态文件路由
app.use('/games', express.static(path.join(__dirname, '../games'), {
    etag: true,
    setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
            // 图片等资源：本地缓存但每次使用前向服务器验证，有变动则拉新的
            res.setHeader('Cache-Control', 'no-cache');
        }
    }
}));

// 服务器本地合成票面图片静态路由
if (!fs.existsSync(SCRATCH_IMG_DIR)) fs.mkdirSync(SCRATCH_IMG_DIR, { recursive: true });
app.get('/api/scratch-image/:file', (req, res) => {
    const filePath = path.join(SCRATCH_IMG_DIR, path.basename(req.params.file));
    if (!fs.existsSync(filePath)) return res.status(404).send('Not found');
    res.sendFile(filePath);
});

// 中奖大头贴边框 PNG 上传目录与静态路由（持久化，构建时不会被清空）
const PHOTO_FRAME_DIR = path.join(__dirname, '../uploads/photo-frames');
if (!fs.existsSync(PHOTO_FRAME_DIR)) fs.mkdirSync(PHOTO_FRAME_DIR, { recursive: true });
app.use('/photo-frames', express.static(PHOTO_FRAME_DIR, {
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=86400');
    }
}));

// 互动中心游戏Logo 上传目录与静态路由
const GAME_LOGO_DIR = path.join(__dirname, '../uploads/game-logos');
if (!fs.existsSync(GAME_LOGO_DIR)) fs.mkdirSync(GAME_LOGO_DIR, { recursive: true });
app.use('/game-logos', express.static(GAME_LOGO_DIR, {
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=86400');
    }
}));

// Database — SQLite via db.js
const { getDB, saveDB, initDatabase, getStmts } = require('./db');
const rbacRouter = require('./rbac');
const { authMiddleware, superKeyOrAuth, adminLog, getClientIP } = require('./auth');
const FUJIAN_CITIES = ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'];
const DEFAULT_MANAGER_TITLE_TEMPLATES = ['店长', '先生', '女士'];
const DEFAULT_ANNOUNCEMENT_TAGS = [
    { name: '全省投放', color: 'rgb(249, 115, 22)' },
    { name: '福州', color: 'rgb(59, 130, 246)' },
    { name: '厦门', color: 'rgb(239, 68, 68)' },
    { name: '泉州', color: 'rgb(16, 185, 129)' },
    { name: '待办', color: 'rgb(148, 163, 184)' }
];

const escapeRegExp = (text) => String(text || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const clampRgb = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(255, Math.round(n)));
};

const parseColorToRgb = (input) => {
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

const normalizeColorToRgb = (input) => {
    const parsed = parseColorToRgb(input);
    if (!parsed) return '';
    return `rgb(${parsed.r}, ${parsed.g}, ${parsed.b})`;
};

const normalizeManagerTitleTemplates = (input) => {
    const allowed = new Set(DEFAULT_MANAGER_TITLE_TEMPLATES);
    const source = Array.isArray(input) ? input : [];
    const finalList = [];

    source.forEach((item) => {
        const value = String(item || '').trim();
        if (!value || !allowed.has(value)) return;
        if (!finalList.includes(value)) finalList.push(value);
    });

    return finalList.length ? finalList : [...DEFAULT_MANAGER_TITLE_TEMPLATES];
};

const normalizeAnnouncementTags = (input) => {
    const source = Array.isArray(input) ? input : [];
    const finalTags = [];
    source.forEach((item) => {
        const name = String(item?.name || '').trim();
        const color = normalizeColorToRgb(item?.color);
        if (!name || !color) return;
        if (finalTags.find(tag => tag.name === name)) return;
        finalTags.push({ name, color });
    });
    return finalTags.length ? finalTags : [...DEFAULT_ANNOUNCEMENT_TAGS];
};

const ensureManagerTitleTemplates = (db) => {
    if (!db.superConfig || typeof db.superConfig !== 'object') {
        db.superConfig = {};
    }
    const normalized = normalizeManagerTitleTemplates(db.superConfig.managerTitleTemplates);
    const current = Array.isArray(db.superConfig.managerTitleTemplates) ? db.superConfig.managerTitleTemplates : [];
    const changed = JSON.stringify(current) !== JSON.stringify(normalized);
    if (changed) {
        db.superConfig.managerTitleTemplates = normalized;
    }
    return { changed, templates: normalized };
};

const normalizePhone11 = (value) => String(value || '').replace(/\D/g, '').slice(0, 11);
const isValidPhone11 = (value) => {
    const raw = String(value ?? '').trim();
    if (!raw) return true;
    return /^\d{11}$/.test(raw);
};

const isValidManagerByTemplates = (manager, templates = DEFAULT_MANAGER_TITLE_TEMPLATES) => {
    const raw = String(manager || '').trim();
    if (!raw) return true;
    const titleList = normalizeManagerTitleTemplates(templates);
    const titlePattern = titleList.map(escapeRegExp).join('|');
    const re = new RegExp(`^[\\u4e00-\\u9fa5]{1,2}(?:${titlePattern})$`);
    return re.test(raw);
};

initDatabase();

// ── 内置大头贴边框种子化（把 public/ 下的两张 PNG 复制到 uploads 并写入 DB）──
(function seedBuiltinFrames() {
    const SEED_FRAMES = [
        { id: 'builtin-1', label: '中奖款', src: 'photo-sticker-frame.png' },
        { id: 'builtin-2', label: '体彩款', src: 'photo-sticker-frame-2.png' },
    ];
    const db = getDB();
    if (!db.photoFrames) db.photoFrames = [];
    let changed = false;
    for (const seed of SEED_FRAMES) {
        if (db.photoFrames.some(f => f.id === seed.id)) continue; // 已存在则跳过
        // 将 public/ 下的文件复制到 uploads/photo-frames/
        const srcFile = path.join(__dirname, '../public', seed.src);
        const destFile = path.join(PHOTO_FRAME_DIR, seed.src);
        try {
            if (fs.existsSync(srcFile) && !fs.existsSync(destFile)) {
                fs.copyFileSync(srcFile, destFile);
            }
        } catch (e) {
            console.warn('[PhotoFrame] seed copy failed:', seed.src, e.message);
        }
        db.photoFrames.push({
            id: seed.id,
            label: seed.label,
            url: `/photo-frames/${seed.src}`,
            filename: seed.src,
            builtin: true,
            createdAt: new Date().toISOString(),
        });
        changed = true;
    }
    if (changed) saveDB(db);
})();

// ── 互动中心游戏Logo种子化（把 互动logo/ 下的6张PNG复制到 uploads/game-logos/）──
(function seedGameLogos() {
    const SEEDS = [
        { key: 'lotto',       label: '大乐透随机选号', src: '大乐透随机选号logo.png',  dest: 'lotto.png'       },
        { key: 'scratch',     label: '顶呱刮幸运选票', src: '顶呱刮幸运选票logo.png', dest: 'scratch.png'     },
        { key: 'lianliankan', label: '体彩连连乐',     src: '体彩连连乐logo.png',     dest: 'lianliankan.png' },
        { key: 'sticker',     label: '乐小星大头贴',   src: '乐小星大头贴logo.png',   dest: 'sticker.png'     },
        { key: 'xiaoxiaole',  label: '体彩消消乐',     src: '体彩消消乐logo.png',     dest: 'xiaoxiaole.png'  },
        { key: 'flappy',      label: '乐小星快飞',     src: '乐小星快飞logo.png',     dest: 'flappy.png'      },
    ];
    const db = getDB();
    if (!db.gameLogos) db.gameLogos = {};
    let changed = false;
    for (const s of SEEDS) {
        if (db.gameLogos[s.key]) continue; // 已存在则跳过
        const srcFile = path.join(__dirname, '../互动logo', s.src);
        const destFile = path.join(GAME_LOGO_DIR, s.dest);
        try {
            if (fs.existsSync(srcFile) && !fs.existsSync(destFile))
                fs.copyFileSync(srcFile, destFile);
        } catch (e) {
            console.warn('[GameLogos] seed copy failed:', s.src, e.message);
        }
        db.gameLogos[s.key] = {
            key: s.key,
            label: s.label,
            url: `/game-logos/${s.dest}`,
            filename: s.dest,
            updatedAt: new Date().toISOString(),
        };
        changed = true;
    }
    if (changed) saveDB(db);
    console.log('[GameLogos] seed done, keys:', Object.keys(db.gameLogos).join(', '));
})();

// Mount RBAC API routes
app.use('/api/rbac', rbacRouter);

const DEFAULT_WINNER_CENTER = {
    maxReports: 15,
    templates: [
        {
            id: 'scratch_big',
            label: '顶呱刮中奖喜报',
            pattern: '恭喜{city}彩民刮中顶呱刮「{ticket_name}」{amount}大奖',
            variables: ['city', 'ticket_name', 'amount'],
            enabled: true
        },
        {
            id: 'lotto_rank',
            label: '乐透中奖喜报',
            pattern: '恭喜{city}彩民中出{lottery_game}{prize_level}{bet_count}，奖金{amount}',
            variables: ['city', 'lottery_game', 'prize_level', 'bet_count', 'amount'],
            enabled: true
        },
        {
            id: 'preset_line',
            label: '常用喜报短句',
            pattern: '{preset_line}',
            variables: ['preset_line'],
            enabled: true
        }
    ],
    variableOptions: {
        city: ['福州', '厦门', '泉州', '漳州', '莆田', '龙岩', '三明', '南平', '宁德'],
        ticket_name: ['瑞龙星祥', '超级幸运', '好运十倍', '锦鲤', '点石成金'],
        amount: ['5万元', '10万元', '25万元', '50万元', '68万元', '100万元'],
        lottery_game: ['大乐透', '排列5', '7星彩', '排列3'],
        prize_level: ['一等奖', '二等奖', '三等奖'],
        bet_count: ['1注', '2注', '3注'],
        preset_line: [
            '恭喜福州彩民中出大乐透二等奖。',
            '恭喜厦门彩民喜中排列5一等奖。',
            '恭喜泉州彩民刮中顶呱刮大奖。',
            '福建体彩近期中奖喜讯持续更新中。',
            '排列玩法近期活跃，欢迎咨询。',
            '顶呱刮互动体验区人气提升。',
            '恭喜漳州彩民中出7星彩二等奖。',
            '恭喜莆田彩民喜中大乐透三等奖。',
            '恭喜龙岩彩民刮中顶呱刮好运十倍25万元。',
            '恭喜宁德彩民中出排列3一等奖。'
        ]
    }
};

const DEFAULT_WINNER_SENSITIVE_WORDS = ['必中', '保中', '稳赚', '包赚', '内幕', '代投', '返利'];

const toStringArrayUnique = (arr) => {
    if (!Array.isArray(arr)) return [];
    const set = new Set();
    arr.forEach((item) => {
        const v = String(item || '').trim();
        if (v) set.add(v);
    });
    return Array.from(set);
};

const extractTemplateVariables = (pattern) => {
    const vars = [];
    if (!pattern) return vars;
    const re = /\{([a-zA-Z0-9_]+)\}/g;
    let m = null;
    while ((m = re.exec(pattern)) !== null) {
        if (m[1] && !vars.includes(m[1])) vars.push(m[1]);
    }
    return vars;
};

const normalizeWinnerCenter = (input) => {
    const source = input && typeof input === 'object' ? input : {};
    const fallbackTemplates = DEFAULT_WINNER_CENTER.templates;
    const templates = (Array.isArray(source.templates) ? source.templates : fallbackTemplates)
        .map((tpl, idx) => {
            const pattern = String(tpl?.pattern || '').trim();
            const variables = toStringArrayUnique(Array.isArray(tpl?.variables) ? tpl.variables : extractTemplateVariables(pattern));
            const id = String(tpl?.id || `template_${idx + 1}`).trim();
            if (!id || !pattern) return null;
            return {
                id,
                label: String(tpl?.label || id).trim(),
                pattern,
                variables,
                enabled: tpl?.enabled !== false
            };
        })
        .filter(Boolean);
    const templateMap = new Map(templates.map((tpl) => [tpl.id, true]));
    fallbackTemplates.forEach((tpl) => {
        if (templateMap.has(tpl.id)) return;
        templates.push({
            id: String(tpl.id),
            label: String(tpl.label || tpl.id),
            pattern: String(tpl.pattern || ''),
            variables: toStringArrayUnique(Array.isArray(tpl.variables) ? tpl.variables : extractTemplateVariables(tpl.pattern)),
            enabled: tpl.enabled !== false
        });
    });

    const variableOptionsRaw = source.variableOptions && typeof source.variableOptions === 'object'
        ? source.variableOptions
        : DEFAULT_WINNER_CENTER.variableOptions;
    const variableOptions = {};
    Object.entries(variableOptionsRaw).forEach(([key, values]) => {
        const cleanKey = String(key || '').trim();
        if (!cleanKey) return;
        variableOptions[cleanKey] = toStringArrayUnique(values);
    });
    Object.entries(DEFAULT_WINNER_CENTER.variableOptions || {}).forEach(([key, values]) => {
        if (!Object.prototype.hasOwnProperty.call(variableOptions, key)) {
            variableOptions[key] = toStringArrayUnique(values);
        }
    });

    // Ensure all template variables have corresponding option arrays.
    templates.forEach((tpl) => {
        (tpl.variables || []).forEach((vKey) => {
            if (!Object.prototype.hasOwnProperty.call(variableOptions, vKey)) {
                variableOptions[vKey] = [];
            }
        });
    });

    const maxReportsRaw = Number(source.maxReports);
    const maxReports = Number.isNaN(maxReportsRaw) ? DEFAULT_WINNER_CENTER.maxReports : Math.min(20, Math.max(1, Math.floor(maxReportsRaw)));

    return {
        maxReports,
        templates: templates.length ? templates : fallbackTemplates,
        variableOptions
    };
};

const extractSourceWinnerLines = (sources) => {
    if (!sources || !Array.isArray(sources.winners)) return [];
    const lines = sources.winners.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') return item.text;
        return '';
    });
    return toStringArrayUnique(lines);
};

const ensureWinnerCenterConfig = (db) => {
    let changed = false;
    if (!db.superConfig || typeof db.superConfig !== 'object') {
        db.superConfig = {};
        changed = true;
    }

    const normalizedCenter = normalizeWinnerCenter(db.superConfig.winnerCenter);

    // Keep currently displayed winner lines visible in super-admin template options.
    const sourceWinnerLines = extractSourceWinnerLines(db.sources);
    if (sourceWinnerLines.length > 0) {
        const currentPreset = toStringArrayUnique(normalizedCenter.variableOptions?.preset_line || []);
        const mergedPreset = toStringArrayUnique([...currentPreset, ...sourceWinnerLines]);
        if (JSON.stringify(currentPreset) !== JSON.stringify(mergedPreset)) {
            normalizedCenter.variableOptions = {
                ...(normalizedCenter.variableOptions || {}),
                preset_line: mergedPreset
            };
        }
    }

    const currentCenterText = JSON.stringify(db.superConfig.winnerCenter || {});
    const nextCenterText = JSON.stringify(normalizedCenter);
    if (currentCenterText !== nextCenterText) {
        db.superConfig.winnerCenter = normalizedCenter;
        changed = true;
    }

    if (!Array.isArray(db.superConfig.winnerSensitiveWords)) {
        db.superConfig.winnerSensitiveWords = [...DEFAULT_WINNER_SENSITIVE_WORDS];
        changed = true;
    } else {
        db.superConfig.winnerSensitiveWords = toStringArrayUnique(db.superConfig.winnerSensitiveWords);
    }

    return {
        changed,
        center: db.superConfig.winnerCenter,
        sensitiveWords: db.superConfig.winnerSensitiveWords
    };
};

const containsSensitiveWord = (text, words = []) => {
    const source = String(text || '').toLowerCase();
    return (words || []).find((word) => {
        const w = String(word || '').trim().toLowerCase();
        return w && source.includes(w);
    }) || null;
};

const renderWinnerText = (pattern, values) => {
    return String(pattern || '').replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(values?.[key] || ''));
};

const validateAndBuildWinnerReports = (reports, center, sensitiveWords = []) => {
    if (!Array.isArray(reports)) return [];
    const templateMap = new Map((center.templates || []).map((tpl) => [tpl.id, tpl]));
    const maxReports = Number(center.maxReports) || 10;

    const finalReports = reports
        .slice(0, maxReports)
        .map((item, idx) => {
            if (!item || item.enabled === false) return null;
            const templateId = String(item.templateId || '').trim();
            const template = templateMap.get(templateId);
            if (!template || template.enabled === false) {
                throw new Error(`第${idx + 1}条喜报模板无效`);
            }

            const values = {};
            (template.variables || []).forEach((varKey) => {
                const value = String(item?.values?.[varKey] || '').trim();
                if (!value) throw new Error(`第${idx + 1}条喜报缺少变量：${varKey}`);
                const allowed = center.variableOptions?.[varKey] || [];
                if (allowed.length > 0 && !allowed.includes(value)) {
                    throw new Error(`第${idx + 1}条喜报变量“${varKey}”不在可选项中`);
                }
                const hit = containsSensitiveWord(value, sensitiveWords);
                if (hit) throw new Error(`第${idx + 1}条喜报命中敏感词：${hit}`);
                values[varKey] = value;
            });

            const text = renderWinnerText(template.pattern, values).trim();
            if (!text) throw new Error(`第${idx + 1}条喜报渲染结果为空`);
            const hit = containsSensitiveWord(text, sensitiveWords);
            if (hit) throw new Error(`第${idx + 1}条喜报命中敏感词：${hit}`);

            return {
                id: item.id || `wr-${Date.now()}-${idx}`,
                templateId: template.id,
                values,
                text,
                enabled: true,
                updatedAt: new Date().toISOString()
            };
        })
        .filter(Boolean);

    return finalReports;
};

let drawHistoryRefreshing = false;
const hasHistoryData = (data) => {
    if (!data || !Array.isArray(data.games)) return false;
    return data.games.some(game => Array.isArray(game.history) && game.history.length > 0);
};
const refreshDrawHistoryInBackground = async () => {
    if (drawHistoryRefreshing) return;
    drawHistoryRefreshing = true;
    try {
        const db = getDB();
        const data = await fetchAllDrawHistories(HISTORY_FETCH_SIZE);
        if (hasHistoryData(data)) {
            db.drawHistory = data;
            saveDB(db);
        }
    } catch (e) {
        console.error('Draw history background refresh error:', e.message);
    } finally {
        drawHistoryRefreshing = false;
    }
};

// --- API Routes ---

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
});



// 2. Validate Admin Key (Admin Login)
app.post('/api/store/login', (req, res) => {
    const { id, adminKey } = req.body;
    const db = getDB();
    const store = db.stores.find(s => s.id === id);
    if (store && store.adminKey === adminKey) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid Admin Key' });
    }
});

// 3. Update Store Config (Targeted - with Key Check)
app.post('/api/store/update', (req, res) => {
    const db = getDB();
    let { id, adminKey, superKey, config } = req.body;

    console.log('[Update Store] Request:', { id, adminKey, superKeyPresent: !!superKey }); // Do not log actual superKey for security in prod, but here it's okay for debug

    const storeIndex = db.stores.findIndex(s => s.id === id);
    if (storeIndex === -1) return res.status(404).json({ error: 'Store not found' });

    // Auth check: Allow if adminKey matches STORE key OR superKey matches SUPER key
    const isStoreAdmin = db.stores[storeIndex].adminKey === adminKey;
    const isSuperAdmin = superKey && superKey === db.superConfig.superKey;

    console.log('[Update Store] Auth Check:', {
        isStoreAdmin, isSuperAdmin,
        storeKey: db.stores[storeIndex].adminKey,
        receivedKey: adminKey,
        serverSuper: db.superConfig.superKey,
        compSuper: superKey
    });

    if (!isStoreAdmin && !isSuperAdmin) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { changed: managerTplChanged, templates: managerTitleTemplates } = ensureManagerTitleTemplates(db);
    if (managerTplChanged) {
        saveDB(db);
    }

    if (config && typeof config === 'object') {
        // Keep backward compatibility: contact/phone mirror each other.
        if (Object.prototype.hasOwnProperty.call(config, 'contact')) {
            const normalized = normalizePhone11(config.contact);
            config.contact = normalized;
            config.phone = normalized;
            if (!isValidPhone11(normalized)) {
                return res.status(400).json({ error: '\u8054\u7cfb\u7535\u8bdd\u53ea\u80fd\u8f93\u516511\u4f4d\u6570\u5b57' });
            }
        } else if (Object.prototype.hasOwnProperty.call(config, 'phone')) {
            const normalized = normalizePhone11(config.phone);
            config.phone = normalized;
            config.contact = normalized;
            if (!isValidPhone11(normalized)) {
                return res.status(400).json({ error: '\u8054\u7cfb\u7535\u8bdd\u53ea\u80fd\u8f93\u516511\u4f4d\u6570\u5b57' });
            }
        }

        if (Object.prototype.hasOwnProperty.call(config, 'manager')) {
            config.manager = String(config.manager || '').trim();
            if (!isValidManagerByTemplates(config.manager, managerTitleTemplates)) {
                return res.status(400).json({ error: '\u8054\u7cfb\u4eba\u683c\u5f0f\u53ea\u80fd\u4e3aX\u5e97\u957f\u3001X\u5148\u751f\u6216X\u5973\u58eb\uff08X\u4e3a\u59d3\u6c0f\uff09' });
            }
        }
    }

    const { center: winnerCenter, sensitiveWords, changed: winnerCenterChanged } = ensureWinnerCenterConfig(db);
    if (winnerCenterChanged) {
        saveDB(db);
    }

    if (config && Object.prototype.hasOwnProperty.call(config, 'winnerReports')) {
        try {
            const validatedReports = validateAndBuildWinnerReports(config.winnerReports, winnerCenter, sensitiveWords);
            config = { ...config, winnerReports: validatedReports };
        } catch (e) {
            return res.status(400).json({ error: e.message || 'Winner report validation failed' });
        }
    }

    // Update with deep merge for config to avoid overwriting unrelated fields if config is partial
    // But here we usually send full config form. 
    // Important: config from body might contain 'features' and 'gameConfig' 

    db.stores[storeIndex] = { ...db.stores[storeIndex], ...config };
    // Explicitly handle city if provided in config or body root
    if (config && config.city) db.stores[storeIndex].city = config.city;

    saveDB(db);
    res.json({ success: true, store: db.stores[storeIndex] });
});

// 3.1 Get Store Analytics (Store Admin)
app.get('/api/store/analytics', (req, res) => {
    const { id, adminKey } = req.query;
    const db = getDB();
    const store = db.stores.find(s => s.id === id);

    console.log('[Store Analytics] Request:', { id, adminKey, storeFound: !!store, match: store?.adminKey === adminKey });

    if (!store || store.adminKey !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    // Return only this store's analytics
    // Structure in db.analytics is { storeId: { ...stats } }
    const stats = (db.analytics && db.analytics[id]) ? { [id]: db.analytics[id] } : {};
    res.json(stats);
});

// 3.2 Get Store Tickets (Store Admin)
app.get('/api/store/tickets', (req, res) => {
    const { id, adminKey, period } = req.query;
    const db = getDB();
    // Auto Update Status
    autoResultCheck(db); // Caller saves if needed. autoResultCheck saves internally.
    const store = db.stores.find(s => s.id === id);

    if (!store || store.adminKey !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    let result = db.tickets || [];
    // Filter by THIS store
    result = result.filter(t => t.storeId === id);

    if (period) {
        result = result.filter(t => t.period === period);
    }
    // Sort buy latest
    result.sort((a, b) => b.timestamp - a.timestamp);

    res.json(result);
});


// 1. Get Store Config (Public - NO adminKey) - MOVED DOWN to avoid shadowing specific routes
app.get('/api/store/:id', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const db = getDB();
    const store = db.stores.find(s => s.id === req.params.id);
    if (!store) return res.status(404).json({ error: 'Store not found' });

    // Safety: strip sensitive info for public view
    const { adminKey, winnerReports, ...publicConfig } = store;
    // Only include winnerReports if store actually has configured reports
    if (Array.isArray(winnerReports) && winnerReports.length > 0) {
        publicConfig.winnerReports = winnerReports;
    }
    const { changed: managerTplChanged, templates: managerTitleTemplates } = ensureManagerTitleTemplates(db);
    if (managerTplChanged) saveDB(db);

    // Keep backward compatibility between legacy "contact" and display field "phone"
    if (!publicConfig.contact && publicConfig.phone) publicConfig.contact = publicConfig.phone;
    if (!publicConfig.phone && publicConfig.contact) publicConfig.phone = publicConfig.contact;

    // --- NEW: Android Channel Override ---
    if (publicConfig.channel === 'android') {
        publicConfig.qrCode = ''; // Hide QR Code
        // Use global preset (from default store)
        const defaultStore = db.stores.find(s => s.id === 'default');
        if (defaultStore && defaultStore.gameConfig) {
            publicConfig.gameConfig = defaultStore.gameConfig;
        } else {
            publicConfig.gameConfig = { regulars: [], packages: [] };
        }
    }

    // Ensure features and gameConfig exist in response even if not in DB (backward compat)
    const defaults = {
        features: { regular: true, package: true },
        gameConfig: { regulars: [], packages: [] },
        marquees: [],
        managerTitleTemplates,
        showCalculator: db.superConfig.showCalculator !== false, // Global setting
        animationDuration: db.superConfig.animationDuration || 5000, // Global setting
        packageDuration: db.superConfig.packageDuration || 30000 // Global setting
    };

    // Global overrides Store config
    res.json({
        ...defaults,
        ...publicConfig,
        animationDuration: db.superConfig.animationDuration || 5000,
        packageDuration: db.superConfig.packageDuration || 30000
    });
});

app.get('/api/announcements/:storeId', (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const db = getDB();
    const storeId = req.params.storeId;
    const store = db.stores.find(s => s.id === storeId);
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const city = store.city || '福州';
    const announcements = Array.isArray(db.centralAnnouncements)
        ? db.centralAnnouncements.filter(a => a && a.status === true && (a.scope === 'ALL' || a.scope === city))
        : [];

    res.json({
        announcements,
        availableTags: normalizeAnnouncementTags(db.superConfig?.availableTags),
        config: db.superConfig.announcementConfig || { duration: 15, interval: 60, speed: 25, rounds: 99, intervalUnit: 's', type: 'RESIDENT' }
    });
});

// ── Store Log Helper ─────────────────────────────────────────
const ONLINE_TIMEOUT_MS = 30000; // 30s no heartbeat = offline

function storeLog(storeId, event, detail = '') {
    try {
        const s = getStmts();
        if (s && s.insertLog) {
            s.insertLog.run(storeId, event, typeof detail === 'string' ? detail : JSON.stringify(detail), Date.now());
        }
    } catch (e) {
        console.error('[StoreLog] Write failed:', e.message);
    }
}

// 1.5 Client Heartbeat (Online Status)
app.post('/api/store/:id/heartbeat', (req, res) => {
    const id = req.params.id;
    const { currentPage, deviceInfo, perfSnapshot } = req.body;
    const now = Date.now();
    if (!global.globalDeviceStatus) global.globalDeviceStatus = {};

    const prev = global.globalDeviceStatus[id];
    const wasOffline = !prev || !prev.lastPing || (now - prev.lastPing > ONLINE_TIMEOUT_MS);

    if (!global.globalDeviceStatus[id]) {
        global.globalDeviceStatus[id] = {};
    }
    global.globalDeviceStatus[id].lastPing = now;
    global.globalDeviceStatus[id].currentPage = currentPage || 'unknown';

    // Store device hardware info (sent every ~5 min from client)
    if (deviceInfo && typeof deviceInfo === 'object') {
        global.globalDeviceStatus[id].deviceInfo = deviceInfo;
        global.globalDeviceStatus[id].deviceInfoAt = now;
    }

    // Store real-time performance snapshot (sent every heartbeat)
    if (perfSnapshot && typeof perfSnapshot === 'object') {
        global.globalDeviceStatus[id].perfSnapshot = perfSnapshot;
    }

    // Log online event if transitioning from offline
    if (wasOffline) {
        storeLog(id, 'online', `页面: ${currentPage || 'unknown'}`);
        console.log(`[Heartbeat] 门店 ${id} 上线，页面=${currentPage || 'unknown'}`);
    }

    // Log page navigation changes
    if (prev && prev.currentPage && prev.currentPage !== (currentPage || 'unknown') && !wasOffline) {
        storeLog(id, 'navigate', `${prev.currentPage} → ${currentPage}`);
    }

    // Consume pending command if any（保留60秒，让同门店所有设备都能收到）
    let command = null;
    if (global.globalDeviceStatus[id].pendingCommand) {
        const cmd = global.globalDeviceStatus[id].pendingCommand;
        if (now - (cmd.timestamp || 0) < 60000) {
            command = cmd;
            storeLog(id, 'command', `执行命令: ${cmd.action}`);
            console.log(`[Heartbeat] 门店 ${id} 收到命令:`, command);
        } else {
            console.log(`[Heartbeat] 门店 ${id} 命令已过期，清除`);
            delete global.globalDeviceStatus[id].pendingCommand;
        }
    }

    // Fetch active central announcements for this store's city
    const db = getDB();
    const store = db.stores.find(s => s.id === id);
    let activeAnnouncements = [];
    if (store && db.centralAnnouncements) {
        activeAnnouncements = db.centralAnnouncements.filter(a =>
            a.status === true && (a.scope === 'ALL' || a.scope === store.city)
        );
    }

    res.json({
        success: true,
        command,
        announcements: activeAnnouncements,
        availableTags: normalizeAnnouncementTags(db.superConfig?.availableTags),
        announcementConfig: db.superConfig.announcementConfig || { duration: 15, interval: 60, speed: 25, type: 'RESIDENT' }
    });
});

// 1.5b Client Error Report (crash / JS error logging)
app.post('/api/store/:id/error-report', (req, res) => {
    const id = req.params.id;
    const { type, message, stack, url, memory, timestamp } = req.body;
    const detail = [
        `[${type || 'error'}] ${message || 'unknown'}`,
        url ? `URL: ${url}` : '',
        memory ? `内存: ${JSON.stringify(memory)}` : '',
        stack ? `Stack: ${String(stack).slice(0, 500)}` : '',
    ].filter(Boolean).join(' | ');
    storeLog(id, 'client_error', detail);
    console.log(`[ClientError] 门店 ${id}: ${detail.slice(0, 200)}`);
    res.json({ success: true });
});

// 1.5c Last-breath snapshot (page close/crash, sent via sendBeacon)
app.post('/api/store/:id/last-breath', (req, res) => {
    const id = req.params.id;
    const { type, reason, perfSnapshot, url, timestamp } = req.body;
    // Attach last known deviceInfo from memory
    const statusObj = global.globalDeviceStatus && global.globalDeviceStatus[id];
    const deviceInfo = statusObj?.deviceInfo || null;
    // Store as structured JSON for the frontend to render a detail panel
    const detail = JSON.stringify({
        reason: reason || 'unknown',
        perf: perfSnapshot || null,
        deviceInfo,
        url: url || '',
        timestamp: timestamp || Date.now(),
    });
    storeLog(id, 'page_close', detail);
    const perf = perfSnapshot || {};
    const mem = perf.memory;
    const brief = `[${reason}] FPS:${perf.fps ?? '-'} 内存:${mem ? mem.jsHeapUsed + '/' + mem.jsHeapLimit + 'MB' : '-'} DOM:${perf.domNodes ?? '-'}`;
    console.log(`[LastBreath] 门店 ${id}: ${brief}`);
    res.json({ success: true });
});

// 1.6 SuperAdmin Force Command Push
app.post('/api/super/store/:id/command', (req, res) => {
    const id = req.params.id;
    const { superKey, command } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (!global.globalDeviceStatus) global.globalDeviceStatus = {};
    if (!global.globalDeviceStatus[id]) global.globalDeviceStatus[id] = {};

    global.globalDeviceStatus[id].pendingCommand = command;
    storeLog(id, 'command_push', `推送指令: ${command?.action || 'unknown'}`);
    res.json({ success: true });
});

// 1.7 SuperAdmin Force Refresh All Client Pages
app.post('/api/super/refresh-all-pages', (req, res) => {
    const { superKey } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (!global.globalDeviceStatus) global.globalDeviceStatus = {};
    const allIds = Object.keys(global.globalDeviceStatus);
    console.log(`[RefreshAll] 已注册门店: ${allIds.join(', ') || '(无)'}`);
    const refreshCmd = { action: 'refresh', timestamp: Date.now() };
    let count = 0;
    for (const id of allIds) {
        // 只对最近 5 分钟内有心跳的在线设备下发
        if (Date.now() - (global.globalDeviceStatus[id].lastPing || 0) < 300000) {
            global.globalDeviceStatus[id].pendingCommand = refreshCmd;
            count++;
        }
    }
    console.log(`[SuperAdmin] 刷新所有页面指令已下发，在线设备: ${count}`);
    res.json({ success: true, count });
});

// --- Layout Asset Library API ---
app.get('/api/super/layout/library', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    res.json(db.layoutLibrary || []);
});

app.post('/api/super/layout/upload', (req, res) => {
    const { superKey, name, url, imageDataUrl } = req.body;
    let db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    let finalUrl = url;
    let type = 'EXTERNAL';
    if (imageDataUrl) {
        finalUrl = imageDataUrl;
        type = 'LOCAL';
    } else if (!url) {
        return res.status(400).json({ error: 'URL or File is required' });
    }

    if (!db.layoutLibrary) db.layoutLibrary = [];
    const newAsset = {
        id: `img-${Date.now()}`,
        name: name || '未命名图片',
        url: finalUrl,
        type,
        createdAt: new Date().toISOString()
    };
    db.layoutLibrary.unshift(newAsset);
    saveDB(db);
    res.json({ success: true, asset: newAsset });
});

app.post('/api/super/layout/delete', (req, res) => {
    const { superKey, id } = req.body;
    let db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (!db.layoutLibrary) return res.status(404).json({ error: 'Library empty' });
    const initialLength = db.layoutLibrary.length;
    db.layoutLibrary = db.layoutLibrary.filter(asset => asset.id !== id);
    if (db.layoutLibrary.length === initialLength) {
        return res.status(404).json({ error: 'Asset not found' });
    }
    saveDB(db);
    res.json({ success: true });
});

app.post('/api/super/layout/update', (req, res) => {
    const { superKey, id, name, url, imageDataUrl } = req.body;
    let db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (!db.layoutLibrary) return res.status(404).json({ error: 'Library empty' });
    const idx = db.layoutLibrary.findIndex(asset => asset.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Asset not found' });

    if (name !== undefined) db.layoutLibrary[idx].name = name;
    if (imageDataUrl) {
        db.layoutLibrary[idx].url = imageDataUrl;
        db.layoutLibrary[idx].type = 'LOCAL';
    } else if (url !== undefined) {
        db.layoutLibrary[idx].url = url;
        db.layoutLibrary[idx].type = 'EXTERNAL';
    }

    saveDB(db);
    res.json({ success: true, asset: db.layoutLibrary[idx] });
});

// --- Photo Sticker Frame Library API (中奖大头贴边框) ---
// GET  /api/photo-frames                公开，APK/网页拉取边框列表
// POST /api/photo-frames/upload         超管上传新边框（base64 PNG）
// POST /api/photo-frames/delete         超管删除边框
// POST /api/photo-frames/update         超管修改边框名称
// 内置边框在 initDatabase 后已自动种子化写入 db.photoFrames

app.get('/api/photo-frames', (req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    const db = getDB();
    res.json({ frames: db.photoFrames || [] });
});

app.post('/api/photo-frames/upload', (req, res) => {
    const { superKey, label, imageDataUrl } = req.body || {};
    const db = getDB();
    if (!superKey || superKey !== db.superConfig.superKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
        return res.status(400).json({ error: 'imageDataUrl required (data:image/...;base64,...)' });
    }

    try {
        // 解析 data URL
        const m = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!m) return res.status(400).json({ error: 'Invalid imageDataUrl' });
        const ext = (m[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
        const buffer = Buffer.from(m[2], 'base64');

        const id = `frame-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const filename = `${id}.${ext}`;
        const filepath = path.join(PHOTO_FRAME_DIR, filename);
        fs.writeFileSync(filepath, buffer);

        const frame = {
            id,
            label: label || '未命名边框',
            url: `/photo-frames/${filename}`,
            filename,
            createdAt: new Date().toISOString()
        };

        if (!db.photoFrames) db.photoFrames = [];
        db.photoFrames.unshift(frame);
        saveDB(db);

        res.json({ success: true, frame });
    } catch (e) {
        console.error('[PhotoFrame] Upload Error:', e);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/photo-frames/delete', (req, res) => {
    const { superKey, id } = req.body || {};
    const db = getDB();
    if (!superKey || superKey !== db.superConfig.superKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!db.photoFrames) return res.status(404).json({ error: 'Library empty' });

    const idx = db.photoFrames.findIndex(f => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Frame not found' });

    const target = db.photoFrames[idx];
    db.photoFrames.splice(idx, 1);
    saveDB(db);

    // 物理删除文件（best-effort）
    try {
        if (target.filename) {
            const fp = path.join(PHOTO_FRAME_DIR, target.filename);
            if (fs.existsSync(fp)) fs.unlinkSync(fp);
        }
    } catch (e) {
        console.warn('[PhotoFrame] Failed to delete file:', e.message);
    }

    res.json({ success: true });
});

app.post('/api/photo-frames/update', (req, res) => {
    const { superKey, id, label, imageDataUrl } = req.body || {};
    const db = getDB();
    if (!superKey || superKey !== db.superConfig.superKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!db.photoFrames) return res.status(404).json({ error: 'Library empty' });
    const idx = db.photoFrames.findIndex(f => f.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Frame not found' });

    if (typeof label === 'string') db.photoFrames[idx].label = label;

    // 替换图片
    if (imageDataUrl && imageDataUrl.startsWith('data:image/')) {
        try {
            const m = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
            if (!m) return res.status(400).json({ error: 'Invalid imageDataUrl' });
            const ext = (m[1] || 'png').toLowerCase().replace('jpeg', 'jpg');
            const buffer = Buffer.from(m[2], 'base64');

            // 删除旧文件（best-effort）
            if (db.photoFrames[idx].filename) {
                const oldPath = path.join(PHOTO_FRAME_DIR, db.photoFrames[idx].filename);
                try { if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath); } catch (_) {}
            }

            const newFilename = `${id}-${Date.now()}.${ext}`;
            fs.writeFileSync(path.join(PHOTO_FRAME_DIR, newFilename), buffer);
            db.photoFrames[idx].url = `/photo-frames/${newFilename}`;
            db.photoFrames[idx].filename = newFilename;
        } catch (e) {
            console.error('[PhotoFrame] Replace image error:', e);
            return res.status(500).json({ error: '图片替换失败: ' + e.message });
        }
    }

    saveDB(db);
    res.json({ success: true, frame: db.photoFrames[idx] });
});

// --- 福建体彩二维码（支持后台配置：抓取 / 手动上传） ---
const FUJIAN_QR_CACHE_PATH = path.join(__dirname, '../uploads/fujian-lottery-qr.png');
const FUJIAN_QR_UPLOAD_PATH = path.join(__dirname, '../uploads/fujian-lottery-qr-custom.png');
const FUJIAN_QR_DEFAULT_SOURCE = 'https://fjsenresource.fjsen.com/jyresource/templateRes/202403/21/61821/61821/code1.png';
const FUJIAN_QR_MAX_AGE = 24 * 60 * 60 * 1000;

function getQRConfig() {
    const db = getDB();
    if (!db.superConfig.qrConfig) {
        db.superConfig.qrConfig = {
            label: '福建体彩服务号',
            sourceUrl: FUJIAN_QR_DEFAULT_SOURCE,
            mode: 'auto', // 'auto' = 从 sourceUrl 抓取, 'manual' = 手动上传
            enabled: true,
        };
        saveDB(db);
    }
    return db.superConfig.qrConfig;
}

async function refreshFujianQR() {
    const cfg = getQRConfig();
    if (cfg.mode === 'manual') return; // 手动上传模式不抓取
    const url = cfg.sourceUrl || FUJIAN_QR_DEFAULT_SOURCE;
    try {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
        fs.writeFileSync(FUJIAN_QR_CACHE_PATH, Buffer.from(res.data));
        console.log('[FujianQR] 缓存已更新');
    } catch (e) {
        console.warn('[FujianQR] 抓取失败:', e.message);
    }
}

// 启动时如果没有缓存或超期，立即抓取
(function initFujianQR() {
    const cfg = getQRConfig();
    if (cfg.mode === 'manual') return;
    let needFetch = true;
    try {
        if (fs.existsSync(FUJIAN_QR_CACHE_PATH)) {
            const stat = fs.statSync(FUJIAN_QR_CACHE_PATH);
            if (Date.now() - stat.mtimeMs < FUJIAN_QR_MAX_AGE && stat.size > 0) needFetch = false;
        }
    } catch (_) {}
    if (needFetch) refreshFujianQR();
})();

// 前端获取二维码图片
app.get('/api/fujian-lottery-qr', (req, res) => {
    const cfg = getQRConfig();
    if (!cfg.enabled) return res.status(404).json({ error: '二维码已禁用' });

    // 手动模式优先使用上传的文件
    const filePath = (cfg.mode === 'manual' && fs.existsSync(FUJIAN_QR_UPLOAD_PATH))
        ? FUJIAN_QR_UPLOAD_PATH
        : FUJIAN_QR_CACHE_PATH;

    try {
        if (fs.existsSync(filePath)) {
            if (cfg.mode === 'auto') {
                const stat = fs.statSync(filePath);
                if (Date.now() - stat.mtimeMs > FUJIAN_QR_MAX_AGE) refreshFujianQR();
            }
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=3600');
            return res.sendFile(path.resolve(filePath));
        }
    } catch (_) {}
    // 无缓存：同步抓取
    refreshFujianQR().then(() => {
        if (fs.existsSync(FUJIAN_QR_CACHE_PATH)) {
            res.setHeader('Content-Type', 'image/png');
            return res.sendFile(path.resolve(FUJIAN_QR_CACHE_PATH));
        }
        res.status(404).json({ error: '二维码暂不可用' });
    });
});

// 前端获取二维码配置（label 等）
app.get('/api/fujian-lottery-qr/config', (req, res) => {
    const cfg = getQRConfig();
    res.json({ label: cfg.label, enabled: cfg.enabled, mode: cfg.mode, sourceUrl: cfg.sourceUrl || '' });
});

// 后台获取完整配置
app.get('/api/super/qr-config', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    const cfg = getQRConfig();
    // 检查当前文件信息
    let currentFile = null;
    const filePath = (cfg.mode === 'manual' && fs.existsSync(FUJIAN_QR_UPLOAD_PATH))
        ? FUJIAN_QR_UPLOAD_PATH
        : FUJIAN_QR_CACHE_PATH;
    try {
        if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath);
            currentFile = { size: stat.size, updatedAt: stat.mtimeMs, path: filePath };
        }
    } catch (_) {}
    res.json({ ...cfg, currentFile });
});

// 后台更新配置
app.post('/api/super/qr-config', (req, res) => {
    const { superKey, label, sourceUrl, mode, enabled } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    const cfg = getQRConfig();
    if (label !== undefined) cfg.label = String(label).trim() || '福建体彩服务号';
    if (sourceUrl !== undefined) cfg.sourceUrl = String(sourceUrl).trim();
    if (mode !== undefined && ['auto', 'manual'].includes(mode)) cfg.mode = mode;
    if (enabled !== undefined) cfg.enabled = !!enabled;
    db.superConfig.qrConfig = cfg;
    saveDB(db);
    // 如果切回 auto 模式，立即刷新
    if (cfg.mode === 'auto') refreshFujianQR();
    console.log('[QRConfig] Updated:', cfg);
    res.json({ success: true, config: cfg });
});

// 后台上传自定义二维码
app.post('/api/super/qr-upload', upload.single('qrImage'), (req, res) => {
    const { superKey } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    if (!req.file || !req.file.buffer) return res.status(400).json({ error: '请选择图片' });
    try {
        fs.writeFileSync(FUJIAN_QR_UPLOAD_PATH, req.file.buffer);
        // 自动切换到手动模式
        const cfg = getQRConfig();
        cfg.mode = 'manual';
        db.superConfig.qrConfig = cfg;
        saveDB(db);
        console.log('[QRConfig] 自定义二维码已上传');
        res.json({ success: true, mode: 'manual' });
    } catch (e) {
        res.status(500).json({ error: '上传失败: ' + e.message });
    }
});

// --- Super Admin API ---

// 4. Create New Store (Super Only)
app.post('/api/super/create-store', (req, res) => {
    const { superKey, storeData } = req.body;
    const db = getDB();

    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Invalid Super Key' });

    const newStore = {
        id: storeData.id || `shop-${Date.now()}`,
        adminKey: storeData.adminKey || '888888',
        name: storeData.name || '新开智慧门店',
        channel: storeData.channel || 'tv',
        city: storeData.city || '福州',
        slogan: storeData.slogan || '快乐购彩，理性投注',
        address: storeData.address || '',
        manager: storeData.manager || '',
        contact: '',
        phone: '',
        theme: 'default',
        status: 'open',
        qrCode: '',
        watermarkText: '幸运号码',
        features: { regular: true, package: true },
        gameConfig: {
            regulars: [], // Empty by default for new stores, or copy from default? Let's keep empty or copy default structure if needed
            packages: []
        }
    };

    // Optional: Copy default gameConfig to new store
    const defaultStore = db.stores.find(s => s.id === 'default');
    if (defaultStore && defaultStore.gameConfig) {
        newStore.gameConfig = JSON.parse(JSON.stringify(defaultStore.gameConfig));
    }

    db.stores.push(newStore);
    saveDB(db);
    res.json({ success: true, store: newStore });
});

// 5. List All Stores (Super Only)
app.get('/api/super/stores', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    // Inject online status, current page, and lastPing
    const storesWithStatus = db.stores.map(s => {
        const statusObj = global.globalDeviceStatus && global.globalDeviceStatus[s.id] ? global.globalDeviceStatus[s.id] : null;
        const isOnline = statusObj && (Date.now() - statusObj.lastPing < ONLINE_TIMEOUT_MS);
        return {
            ...s,
            isOnline: !!isOnline,
            lastPing: statusObj ? statusObj.lastPing : null,
            currentPage: isOnline ? statusObj.currentPage : 'offline',
            deviceInfo: statusObj?.deviceInfo || null,
            perfSnapshot: statusObj?.perfSnapshot || null,
        };
    });

    res.json(storesWithStatus);
});

// 6. Delete Store (Super Only)
app.post('/api/super/delete-store', (req, res) => {
    const { superKey, storeId } = req.body;
    const db = getDB();

    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Invalid Super Key' });
    if (storeId === 'default') return res.status(400).json({ error: 'Cannot delete default store' });

    const initialLength = db.stores.length;
    db.stores = db.stores.filter(s => s.id !== storeId);

    // Cascading Delete: Remove associated items
    // 1. Remove Tickets
    if (db.tickets) {
        const initialTickets = db.tickets.length;
        db.tickets = db.tickets.filter(t => t.storeId !== storeId);
        console.log(`[Delete Store] Removed ${initialTickets - db.tickets.length} tickets for store ${storeId}`);
    }

    // 2. Remove Analytics
    if (db.analytics && db.analytics[storeId]) {
        delete db.analytics[storeId];
        console.log(`[Delete Store] Removed analytics for store ${storeId}`);
    }

    // 3. Remove store logs
    try {
        const s = getStmts();
        if (s && s.deleteLogsByStore) s.deleteLogsByStore.run(storeId);
        console.log(`[Delete Store] Removed logs for store ${storeId}`);
    } catch (e) { console.error('[Delete Store] Log cleanup failed:', e.message); }

    if (db.stores.length === initialLength) {
        return res.status(404).json({ error: 'Store not found' });
    }

    saveDB(db);
    res.json({ success: true });
});

// 6.1 Get Store Logs (Super Only)
app.get('/api/super/store/:id/logs', (req, res) => {
    const { superKey, limit: limitStr, since } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const storeId = req.params.id;
    const maxRows = Math.min(parseInt(limitStr) || 200, 1000);
    try {
        const s = getStmts();
        let rows;
        if (since) {
            rows = s.getLogsByStoreAndTime.all(storeId, parseInt(since), maxRows);
        } else {
            rows = s.getLogsByStore.all(storeId, maxRows);
        }
        res.json({ success: true, logs: rows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6.2 Get All Logs (Super Only)
app.get('/api/super/logs', (req, res) => {
    const { superKey, limit: limitStr } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const maxRows = Math.min(parseInt(limitStr) || 200, 1000);
    try {
        const s = getStmts();
        const rows = s.getAllLogs.all(maxRows);
        const countRow = s.countLogs.get();
        res.json({ success: true, logs: rows, totalCount: countRow ? countRow.cnt : 0 });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 6.3 Clean Logs (Super Only)
app.post('/api/super/clean-logs', (req, res) => {
    const { superKey, olderThanDays } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const days = parseInt(olderThanDays) || db.superConfig.logRetentionDays || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    try {
        const s = getStmts();
        const info = s.deleteOldLogs.run(cutoff);
        storeLog('system', 'clean_logs', `手动清理 ${days} 天前日志，删除 ${info.changes} 条`);
        res.json({ success: true, deleted: info.changes });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// (Moved catchall to end of file)

// 7. Manual Force Refresh (Super Only)
app.post('/api/super/refresh-data', (req, res) => {
    const { superKey } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    console.log('[Manual] Force refreshing lottery data...');
    fetchLotteryData(); // Trigger the function
    res.json({ success: true, message: 'Data refresh triggered' });
    res.json({ success: true, message: 'Data refresh triggered' });
});

// 8. Update Super Config (Super Only)
app.post('/api/super/update-config', (req, res) => {
    const { superKey, cronConfig, showCalculator, animationDuration, packageDuration, drawHistorySize, scrollHoldMs, drawLogoMap, drawLogoOpacity, managerTitleTemplates, logRetentionDays } = req.body;
    let db = getDB();

    if (superKey !== db.superConfig.superKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    if (logRetentionDays !== undefined) {
        const parsed = Number(logRetentionDays);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 365) {
            db.superConfig.logRetentionDays = Math.floor(parsed);
        }
    }

    if (cronConfig) {
        db.superConfig.cronConfig = cronConfig;
    }

    if (showCalculator !== undefined) {
        db.superConfig.showCalculator = showCalculator;
    }

    if (animationDuration !== undefined) {
        db.superConfig.animationDuration = animationDuration;
    }

    if (packageDuration !== undefined) {
        db.superConfig.packageDuration = packageDuration;
    }
    if (drawHistorySize !== undefined) {
        const parsed = Number(drawHistorySize);
        if (!Number.isNaN(parsed) && parsed > 0) {
            db.superConfig.drawHistorySize = Math.min(50, Math.max(1, Math.floor(parsed)));
        }
    }
    if (scrollHoldMs !== undefined) {
        const parsed = Number(scrollHoldMs);
        if (!Number.isNaN(parsed) && parsed > 0) {
            db.superConfig.scrollHoldMs = Math.min(10000, Math.max(1000, Math.floor(parsed)));
        }
    }

    if (drawLogoMap !== undefined) {
        if (drawLogoMap && typeof drawLogoMap === 'object' && !Array.isArray(drawLogoMap)) {
            db.superConfig.drawLogoMap = drawLogoMap;
        } else if (drawLogoMap === null) {
            db.superConfig.drawLogoMap = {};
        }
    }
    if (drawLogoOpacity !== undefined) {
        const parsed = Number(drawLogoOpacity);
        if (!Number.isNaN(parsed)) {
            db.superConfig.drawLogoOpacity = Math.min(1, Math.max(0, parsed));
        }
    }
    if (managerTitleTemplates !== undefined) {
        db.superConfig.managerTitleTemplates = normalizeManagerTitleTemplates(managerTitleTemplates);
    }

    console.log('[Super Config] Updated:', db.superConfig);
    saveDB(db);
    res.json({ success: true, config: db.superConfig });
});

app.get('/api/super/config', superKeyOrAuth, (req, res) => {
    const db = getDB();
    const { changed: managerTplChanged, templates: managerTitleTemplates } = ensureManagerTitleTemplates(db);
    if (managerTplChanged) saveDB(db);

    // Ensure defaults if missing
    const cronConfig = db.superConfig.cronConfig || {
        days: [1, 3, 6], startHour: 21, startMinute: 25, endHour: 22, endMinute: 0, interval: 5, enabled: true
    };

    const safeHistorySize = Number(db.superConfig.drawHistorySize);
    const safeScrollHold = Number(db.superConfig.scrollHoldMs);
    res.json({
        ...db.superConfig,
        drawHistorySize: Number.isNaN(safeHistorySize) ? 6 : safeHistorySize,
        scrollHoldMs: Number.isNaN(safeScrollHold) ? 3000 : safeScrollHold,
        cronConfig,
        managerTitleTemplates,
        drawLogoMap: db.superConfig.drawLogoMap || {},
        drawLogoOpacity: typeof db.superConfig.drawLogoOpacity === 'number' ? db.superConfig.drawLogoOpacity : 0.18
    });
});

app.get('/api/super/winner-config', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const { center, sensitiveWords, changed } = ensureWinnerCenterConfig(db);
    if (changed) saveDB(db);
    res.json({ success: true, data: { ...center, sensitiveWords } });
});

app.post('/api/super/winner-config/update', (req, res) => {
    const { superKey, winnerCenter, sensitiveWords } = req.body || {};
    const db = getDB();
    if (superKey !== db.superConfig.superKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const normalizedCenter = normalizeWinnerCenter(winnerCenter);
    db.superConfig.winnerCenter = normalizedCenter;
    if (Array.isArray(sensitiveWords)) {
        db.superConfig.winnerSensitiveWords = toStringArrayUnique(sensitiveWords);
    } else if (!Array.isArray(db.superConfig.winnerSensitiveWords)) {
        db.superConfig.winnerSensitiveWords = [...DEFAULT_WINNER_SENSITIVE_WORDS];
    }

    res.json({
        success: true,
        data: { ...normalizedCenter, sensitiveWords: db.superConfig.winnerSensitiveWords }
    });
});

// --- Central Announcements API ---
app.get('/api/super/announcements', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    res.json({
        announcements: db.centralAnnouncements || [],
        availableTags: normalizeAnnouncementTags(db.superConfig?.availableTags),
        config: db.superConfig.announcementConfig || { duration: 15, interval: 60, speed: 25, type: 'RESIDENT' }
    });
});

app.post('/api/super/announcements/batch-update', (req, res) => {
    const { superKey, announcements, config, availableTags } = req.body;
    let db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (Array.isArray(announcements)) {
        db.centralAnnouncements = announcements.map(a => ({
            ...a,
            id: a.id || `ann-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
        }));
    }
    if (config) {
        db.superConfig.announcementConfig = {
            duration: parseInt(config.duration) || 15,
            interval: parseInt(config.interval) || 60,
            speed: parseInt(config.speed) || 25,
            rounds: (config.rounds !== undefined && config.rounds !== null) ? parseInt(config.rounds) : 99,
            intervalUnit: config.intervalUnit || 's',
            type: config.type || 'RESIDENT'
        };
    }
    if (Array.isArray(availableTags)) {
        db.superConfig.availableTags = normalizeAnnouncementTags(availableTags);
    } else if (!Array.isArray(db.superConfig.availableTags)) {
        db.superConfig.availableTags = [...DEFAULT_ANNOUNCEMENT_TAGS];
    }

    saveDB(db);
    res.json({ success: true });
});

app.post('/api/super/announcements/update', (req, res) => {
    const { superKey, announcement } = req.body;
    let db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (!db.centralAnnouncements) db.centralAnnouncements = [];

    if (announcement.id) {
        // Update
        const idx = db.centralAnnouncements.findIndex(a => a.id === announcement.id);
        if (idx !== -1) {
            db.centralAnnouncements[idx] = {
                ...db.centralAnnouncements[idx],
                ...announcement,
                duration: parseInt(announcement.duration) || 10,
                interval: parseInt(announcement.interval) || 60,
                speed: parseInt(announcement.speed) || 25
            };
        } else {
            db.centralAnnouncements.push({
                ...announcement,
                id: `ann-${Date.now()}`,
                duration: parseInt(announcement.duration) || 10,
                interval: parseInt(announcement.interval) || 60,
                speed: parseInt(announcement.speed) || 25,
                createdAt: new Date().toISOString()
            });
        }
    } else {
        // Create
        db.centralAnnouncements.push({
            ...announcement,
            id: `ann-${Date.now()}`,
            duration: parseInt(announcement.duration) || 10,
            interval: parseInt(announcement.interval) || 60,
            speed: parseInt(announcement.speed) || 25,
            createdAt: new Date().toISOString()
        });
    }

    saveDB(db);
    res.json({ success: true });
});

app.post('/api/super/announcements/delete', (req, res) => {
    const { superKey, id } = req.body;
    let db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (db.centralAnnouncements) {
        db.centralAnnouncements = db.centralAnnouncements.filter(a => a.id !== id);
        saveDB(db);
    }
    res.json({ success: true });
});

app.post('/api/super/winner-broadcast', (req, res) => {
    const { superKey, winnerReports, targetStoreIds } = req.body || {};
    const db = getDB();
    if (superKey !== db.superConfig.superKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    const { center, sensitiveWords, changed } = ensureWinnerCenterConfig(db);
    let validatedReports = [];
    try {
        validatedReports = validateAndBuildWinnerReports(winnerReports, center, sensitiveWords);
    } catch (e) {
        return res.status(400).json({ error: e.message || 'Winner report validation failed' });
    }

    const targetSet = Array.isArray(targetStoreIds) && targetStoreIds.length > 0
        ? new Set(targetStoreIds.map(id => String(id || '').trim()).filter(Boolean))
        : null;

    let updatedStores = 0;
    db.stores = (db.stores || []).map((store) => {
        if (!store || !store.id) return store;
        if (targetSet && !targetSet.has(store.id)) return store;
        updatedStores += 1;
        return {
            ...store,
            winnerReports: validatedReports.map((item, idx) => ({
                ...item,
                id: `${item.id || 'wr'}-${store.id}-${idx + 1}`
            }))
        };
    });

    if (changed || updatedStores > 0) {
        saveDB(db);
    }

    res.json({
        success: true,
        updatedStores,
        reports: validatedReports
    });
});


// --- Layout Library Management ---
app.get('/api/super/layout/library', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    res.json(db.layoutLibrary || []);
});

app.post('/api/super/layout/upload', (req, res) => {
    const { superKey, name, url, imageDataUrl } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const newAsset = {
        id: Date.now().toString(),
        name: name || '未命名素材',
        url: url || imageDataUrl, // If local upload, url is base64
        type: url ? 'external' : 'local',
        createdAt: new Date().toISOString()
    };
    if (!db.layoutLibrary) db.layoutLibrary = [];
    db.layoutLibrary.push(newAsset);
    saveDB(db);
    res.json({ success: true, asset: newAsset });
});

app.post('/api/super/layout/delete', (req, res) => {
    const { superKey, id } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    db.layoutLibrary = (db.layoutLibrary || []).filter(a => a.id !== id);
    saveDB(db);
    res.json({ success: true });
});

app.post('/api/super/layout/update', (req, res) => {
    const { superKey, id, name, url, imageDataUrl } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (!db.layoutLibrary) return res.status(404).json({ error: 'Library empty' });
    const idx = db.layoutLibrary.findIndex(asset => asset.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Asset not found' });

    if (name !== undefined) db.layoutLibrary[idx].name = name;
    if (imageDataUrl) {
        db.layoutLibrary[idx].url = imageDataUrl;
        db.layoutLibrary[idx].type = 'local';
    } else if (url !== undefined) {
        db.layoutLibrary[idx].url = url;
        db.layoutLibrary[idx].type = 'external';
    }

    saveDB(db);
    res.json({ success: true, asset: db.layoutLibrary[idx] });
});

app.post('/api/super/layout/download-external', async (req, res) => {
    const { superKey, id } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (!db.layoutLibrary) return res.status(404).json({ error: 'Library empty' });
    const idx = db.layoutLibrary.findIndex(asset => asset.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Asset not found' });

    const asset = db.layoutLibrary[idx];
    if (asset.type !== 'external' && asset.type !== 'EXTERNAL') return res.status(400).json({ error: 'Not an external asset' });

    try {
        const axios = require('axios');
        const https = require('https');

        // Use a permissive HTTPS agent to bypass strict TLS or certificate issues
        const agent = new https.Agent({
            rejectUnauthorized: false,
            keepAlive: true
        });

        const fetchConfig = {
            responseType: 'arraybuffer',
            timeout: 15000,
            httpsAgent: agent,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'Connection': 'keep-alive'
            }
        };

        let response;
        try {
            response = await axios.get(asset.url, fetchConfig);
        } catch (initialErr) {
            console.log(`[Download External] Direct fetch failed for ${asset.url} (${initialErr.message}). Initiating wsrv.nl fallback relay...`);
            const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(asset.url)}`;
            response = await axios.get(proxyUrl, fetchConfig);
        }

        const contentType = response.headers['content-type'] || 'image/png';
        const base64 = Buffer.from(response.data).toString('base64');
        const dataUrl = `data:${contentType};base64,${base64}`;

        db.layoutLibrary[idx].url = dataUrl;
        db.layoutLibrary[idx].type = 'LOCAL';

        saveDB(db);
        res.json({ success: true, asset: db.layoutLibrary[idx] });
    } catch (e) {
        console.error('[Download External] Fetch failed:', e.message);
        res.status(502).json({ error: 'Failed to download image: ' + e.message });
    }
});


// --- End of Logo/Layout Library Management (Scratch Card APIs moved to section below) ---



// --- Consolidated Scratch Card APIs ---



// --- Scratch card APIs consolidated below ---

// --- Prize Calculation Logic ---
class PrizeCalculator {
    constructor() {
        this.PRIZES = [
            { level: 1, match: '5+2', amount: 0, label: '一等奖' }, // Floating
            { level: 2, match: '5+1', amount: 0, label: '二等奖' }, // Floating
            { level: 3, match: '5+0', amount: 10000, label: '三等奖' },
            { level: 4, match: '4+2', amount: 3000, label: '四等奖' },
            { level: 5, match: '4+1', amount: 300, label: '五等奖' },
            { level: 6, match: '3+2', amount: 200, label: '六等奖' },
            { level: 7, match: '4+0', amount: 100, label: '七等奖' },
            { level: 8, match: '3+1', amount: 15, label: '八等奖' },
            { level: 8, match: '2+2', amount: 15, label: '八等奖' },
            { level: 9, match: '3+0', amount: 5, label: '九等奖' },
            { level: 9, match: '1+2', amount: 5, label: '九等奖' },
            { level: 9, match: '2+1', amount: 5, label: '九等奖' },
            { level: 9, match: '0+2', amount: 5, label: '九等奖' },
        ];
    }

    // Helper: Combinations
    getCombinations(arr, k) {
        const result = [];
        function backtrack(start, current) {
            if (current.length === k) {
                result.push([...current]);
                return;
            }
            for (let i = start; i < arr.length; i++) {
                current.push(arr[i]);
                backtrack(i + 1, current);
                current.pop();
            }
        }
        backtrack(0, []);
        return result;
    }

    // Calculate single bet
    checkSingle(betRed, betBlue, drawRed, drawBlue) {
        const redHits = betRed.filter(r => drawRed.includes(r)).length;
        const blueHits = betBlue.filter(b => drawBlue.includes(b)).length;
        const key = `${redHits}+${blueHits}`;

        for (const prize of this.PRIZES) {
            if (prize.match === key) return { ...prize };
        }
        return null;
    }

    // Main Calculator Function
    calculate(ticket, drawResult) {
        // drawResult: { reds: ['01',...], blues: ['01',...] }
        // ticket.numbers can be array (batch) or object (single/duplex)

        // Normalize to array of bets
        let bets = [];
        if (Array.isArray(ticket.numbers)) {
            // It's a batch of single bets? Or complex structure? 
            // Logic in current frontend for "Batch" puts array of objects? 
            // Let's assume standard format: { red:[], blue:[] }
            // If ticket.mode === 'package', numbers might be array of bets.
            bets = ticket.numbers;
        } else {
            bets = [ticket.numbers];
        }

        let totalWin = 0;
        let winDetails = [];

        for (const bet of bets) {
            // Unpack bets (Standard or Duplex)
            // Duplex: reds length > 5 or blues length > 2
            // We need to expand to all single combinations
            const redCombs = this.getCombinations(bet.red, 5);
            const blueCombs = this.getCombinations(bet.blue, 2);

            for (const r of redCombs) {
                for (const b of blueCombs) {
                    const win = this.checkSingle(r, b, drawResult.reds, drawResult.blues);
                    if (win) {
                        totalWin += win.amount;
                        winDetails.push(win.label);
                    }
                }
            }
        }

        // De-duplicate details for summary
        const uniqueDetails = [...new Set(winDetails)];
        // Ideally we count them: "九等奖x5"
        const detailCounts = winDetails.reduce((acc, curr) => {
            acc[curr] = (acc[curr] || 0) + 1;
            return acc;
        }, {});

        const finalDetails = Object.entries(detailCounts).map(([k, v]) => `${k}x${v}`);

        return {
            winAmount: totalWin,
            winLevel: finalDetails,
            isWin: totalWin > 0
        };
    }
}

const calculator = new PrizeCalculator();


// 9. Analytics: Track Click
app.post('/api/track/click', (req, res) => {
    const { storeId, type, count } = req.body; // count is number of bets
    console.log('[TRACK CLICK]', storeId, type, count);
    const db = getDB();

    // Ensure analytics structure exists
    if (!db.analytics) db.analytics = {};
    if (!db.analytics[storeId]) db.analytics[storeId] = {
        click_regular: 0, click_package: 0, share_count: 0, share_amount: 0
    };

    const numCount = parseInt(count) || 1;
    if (type === 'regular') db.analytics[storeId].click_regular += numCount;
    if (type === 'package') db.analytics[storeId].click_package += numCount;

    storeLog(storeId, 'draw', `${type === 'package' ? '套餐' : '单式'}投注 ×${numCount}`);

    saveDB(db);
    res.json({ success: true });
});

// 10. Analytics: Track Share (Create Ticket)
app.post('/api/track/share', (req, res) => {
    const { storeId, period, totalPrice, tickets } = req.body;
    console.log('[TRACK SHARE]', storeId, period);
    const db = getDB();

    if (!db.tickets) db.tickets = [];
    if (!db.analytics) db.analytics = {};
    if (!db.analytics[storeId]) db.analytics[storeId] = {
        click_regular: 0, click_package: 0, share_count: 0, share_amount: 0
    };

    // Update Stats
    // share_count logic: is it number of *Actions* or number of *Bets*? 
    // User requirement: "Front-end click tracking should be based on bets... Share tracking... based on store/period".
    // Let's track Total Bets Shared and Total Amount.
    // "tickets" here is the array from frontend.

    let totalBets = 0;
    const newTickets = tickets.map(t => {
        totalBets += (t.count || 1);
        return {
            id: require('crypto').randomUUID(),
            storeId,
            period,
            mode: t.mode,
            type: t.type,
            numbers: t.numbers,
            count: t.count,
            price: t.price,
            timestamp: Date.now(),
            status: 'pending',
            winAmount: 0,
            winLevel: []
        };
    });

    db.tickets.push(...newTickets);

    // Update Analytics
    db.analytics[storeId].share_count += totalBets;
    db.analytics[storeId].share_amount += (totalPrice || 0);

    storeLog(storeId, 'share', `出票 ${totalBets} 注，金额 ¥${totalPrice || 0}，期号 ${period}`);

    saveDB(db);
    res.json({ success: true });
});

// 11. Get Analytics Data (Super Only)
app.get('/api/super/analytics', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    res.json(db.analytics);
});

// 12. Get All Tickets (Super Only - with Filters)
app.get('/api/super/tickets', (req, res) => {
    const { superKey, period, storeId } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    // Auto Update Status
    autoResultCheck(db);

    let result = db.tickets || [];
    if (period) {
        result = result.filter(t => t.period === period);
    }
    if (storeId) {
        result = result.filter(t => t.storeId === storeId);
    }
    // Sort buy latest
    result.sort((a, b) => b.timestamp - a.timestamp);

    res.json(result);
});

// 13. Clear All Tickets (Super Only)
app.post('/api/super/clear-tickets', (req, res) => {
    const { superKey } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    db.tickets = [];
    db.analytics = {};
    saveDB(db);
    res.json({ success: true });
});

// 13.1 Clear Store Tickets (Store Admin)
app.post('/api/store/clear-tickets', (req, res) => {
    const { id, adminKey } = req.body;
    const db = getDB();
    const store = db.stores.find(s => s.id === id);

    if (!store || store.adminKey !== adminKey) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    // Clear tickets for this store only
    if (db.tickets) {
        const before = db.tickets.filter(t => t.storeId === id).length;
        db.tickets = db.tickets.filter(t => t.storeId !== id);
        storeLog(id, 'clear_tickets', `清除 ${before} 张票据`);
    }

    // Reset analytics for this store
    if (db.analytics && db.analytics[id]) {
        // Reset to 0 instead of delete, or delete? 
        // If we delete, the dashboard might show empty state vs 0 row. 
        // Let's reset to zeros to keep the "row" visible as per recent fixes.
        db.analytics[id] = {
            click_regular: 0, click_package: 0, share_count: 0, share_amount: 0
        };
    }

    saveDB(db);
    res.json({ success: true });
});


// ====== SCRATCH CARD (顶呱刮) API ======

// Tier config: ticket max count per book
const SCRATCH_TIERS = {
    10: { label: '10元', maxCount: 60 },
    20: { label: '20元', maxCount: 30 },
    30: { label: '30元', maxCount: 20 },
    50: { label: '50元', maxCount: 20 }
};

// SA-1: Upload scratch ticket image (superKey required)
// Body: { superKey, tier: 10|20|30|50, name, url, imageDataUrl }
app.post('/api/super/scratch/upload', (req, res) => {
    const { superKey, tier, name, url, imageDataUrl } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    if (!SCRATCH_TIERS[tier]) return res.status(400).json({ error: 'Invalid tier. Use 10, 20, 30 or 50.' });
    if (!imageDataUrl && !url) return res.status(400).json({ error: 'imageDataUrl or url required' });

    if (!db.scratchLibrary) db.scratchLibrary = [];
    const id = `sc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    db.scratchLibrary.push({
        id,
        tier: parseInt(tier),
        name: name || `${tier}元票面`,
        url: url || imageDataUrl,
        imageDataUrl: imageDataUrl || '',
        type: url ? 'external' : 'local',
        enabled: true,
        createdAt: Date.now()
    });
    saveDB(db);
    res.json({ success: true, id });
});

// SA-2: List scratch library (superKey required)
app.get('/api/super/scratch/library', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    res.json(db.scratchLibrary || []);
});

// SA-3: Update scratch image (enable/disable/rename/details) (superKey required)
app.post('/api/super/scratch/update', (req, res) => {
    const { superKey, id, enabled, name, imageDataUrl, url, tier, intro, maxPrize, frontUrl, backUrl } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const library = db.scratchLibrary || [];
    const idx = library.findIndex(i => i.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Image not found' });

    const item = library[idx];
    if (enabled !== undefined) item.enabled = enabled;
    if (name !== undefined) item.name = name;
    if (tier !== undefined) item.tier = Number(tier);
    if (intro !== undefined) item.intro = intro;
    if (maxPrize !== undefined) item.maxPrize = maxPrize;

    // 保护：不再从前端覆盖 frontUrl/backUrl，防止顺序错乱
    if (frontUrl !== undefined) item.frontUrl = frontUrl;
    if (backUrl !== undefined) item.backUrl = backUrl;

    if (imageDataUrl) {
        item.url = imageDataUrl;
        item.type = 'local';
    } else if (url !== undefined) {
        item.url = url;
    }

    saveDB(db);
    res.json({ success: true, image: item });
});

// SA-4: Delete scratch image (superKey required)
app.post('/api/super/scratch/delete', (req, res) => {
    const { superKey, id } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const library = db.scratchLibrary || [];
    const targetItem = library.find(i => i.id === id);
    if (!targetItem) return res.status(404).json({ error: 'Image not found' });

    // 物理清理本地文件
    const cleanLocalFile = (url) => {
        if (url && url.startsWith('/api/scratch-image/')) {
            const filename = url.replace('/api/scratch-image/', '');
            const filePath = path.join(SCRATCH_IMG_DIR, filename);
            if (fs.existsSync(filePath)) {
                try {
                    fs.unlinkSync(filePath);
                    console.log('[Cleanup] Deleted local file:', filePath);
                } catch (e) {
                    console.error('[Cleanup] Failed to delete file:', e.message);
                }
            }
        }
    };

    // 清理所有相关属性中的本地图片
    cleanLocalFile(targetItem.url);
    cleanLocalFile(targetItem.frontUrl);
    cleanLocalFile(targetItem.backUrl);
    cleanLocalFile(targetItem.scratchFaceUrl);

    db.scratchLibrary = library.filter(i => i.id !== id);

    // Cleanup: Remove this ID from all stores' selected lists
    if (db.stores) {
        db.stores.forEach(store => {
            if (store.scratchConfig && store.scratchConfig.selected) {
                Object.keys(store.scratchConfig.selected).forEach(tier => {
                    store.scratchConfig.selected[tier] = (store.scratchConfig.selected[tier] || []).filter(sid => sid !== id);
                });
            }
        });
    }

    saveDB(db);
    res.json({ success: true });
});

// SA-5: Batch delete scratch images
app.post('/api/super/scratch/delete-batch', (req, res) => {
    const { superKey, ids } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No ids provided' });

    const library = db.scratchLibrary || [];
    const idSet = new Set(ids);

    // 物理清理本地文件
    const cleanLocalFile = (url) => {
        if (url && url.startsWith('/api/scratch-image/')) {
            const filename = url.replace('/api/scratch-image/', '');
            const filePath = path.join(SCRATCH_IMG_DIR, filename);
            if (fs.existsSync(filePath)) {
                try { fs.unlinkSync(filePath); } catch (e) { }
            }
        }
    };

    library.forEach(item => {
        if (idSet.has(item.id)) {
            cleanLocalFile(item.url);
            cleanLocalFile(item.frontUrl);
            cleanLocalFile(item.backUrl);
            cleanLocalFile(item.scratchFaceUrl);
        }
    });

    const before = library.length;
    db.scratchLibrary = library.filter(img => !idSet.has(img.id));
    const deleted = before - db.scratchLibrary.length;

    // Cleanup: Remove deleted IDs from all stores' selected lists
    if (db.stores) {
        db.stores.forEach(store => {
            if (store.scratchConfig && store.scratchConfig.selected) {
                Object.keys(store.scratchConfig.selected).forEach(tier => {
                    store.scratchConfig.selected[tier] = (store.scratchConfig.selected[tier] || []).filter(sid => !idSet.has(sid));
                });
            }
        });
    }
    saveDB(db);
    res.json({ success: true, deleted });
});

// SA-5.1: Batch update scratch images
app.post('/api/super/scratch/update-batch', (req, res) => {
    const { superKey, ids, enabled } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'No ids provided' });

    const library = db.scratchLibrary || [];
    let updatedCount = 0;
    const idSet = new Set(ids);

    for (const item of library) {
        if (idSet.has(item.id)) {
            if (enabled !== undefined) item.enabled = enabled;
            updatedCount++;
        }
    }

    saveDB(db);
    res.json({ success: true, updated: updatedCount });
});

// SA-6: Trigger official scratch card crawling
app.post('/api/super/scratch/crawl', async (req, res) => {
    const { superKey } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    try {
        console.log('[Crawler] Starting automated scratch card capture...');
        const tiers = ['10元', '20元', '30元', '50元'];
        let allResults = [];

        for (const t of tiers) {
            try {
                const results = await crawlScratchCards(t);
                allResults = [...allResults, ...results];
            } catch (e) {
                console.error(`[Crawler] Failed for tier ${t}:`, e.message);
            }
        }

        if (allResults.length > 0) {
            if (!db.scratchLibrary) db.scratchLibrary = [];

            let updatedCount = 0, addedCount = 0;
            for (const newItem of allResults) {
                // Match by stable ID first
                let existingIdx = db.scratchLibrary.findIndex(item => item.id === newItem.id);

                // Fallback: match by name & tier for migration from unstable IDs
                if (existingIdx === -1) {
                    existingIdx = db.scratchLibrary.findIndex(
                        item => item.name && item.name.trim() === newItem.name.trim() && item.tier === newItem.tier
                    );
                }

                if (existingIdx !== -1) {
                    // Update existing item while preserving 'enabled' status (human manual override)
                    const wasEnabled = db.scratchLibrary[existingIdx].enabled;
                    db.scratchLibrary[existingIdx] = {
                        ...newItem,
                        enabled: (wasEnabled !== undefined) ? wasEnabled : newItem.enabled
                    };
                    updatedCount++;
                } else {
                    db.scratchLibrary.push(newItem);
                    addedCount++;
                }
            }
            saveDB(db);
            res.json({ success: true, added: addedCount, updated: updatedCount, total: allResults.length });
        } else {
            res.status(500).json({ error: 'No scratch data captured from official site' });
        }
    } catch (err) {
        console.error('[Crawler] Global crawl error:', err);
        res.status(500).json({ error: err.message });
    }
});

// SA-7: Download external image to local server (Enhanced with Auto-Stitch)
app.post('/api/super/scratch/download-external', async (req, res) => {
    const { superKey, id } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    if (!db.scratchLibrary) return res.status(404).json({ error: 'Library empty' });
    const idx = db.scratchLibrary.findIndex(asset => asset.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Asset not found' });

    const asset = db.scratchLibrary[idx];
    // Allow both external and those that need local stitching (even if marked local, they might need parts download)
    // Actually, usually it's used when asset.type is external.

    try {
        const axios = require('axios');
        const agent = new (require('https')).Agent({ rejectUnauthorized: false, keepAlive: true });
        const fetchConfig = {
            responseType: 'arraybuffer',
            timeout: 20000,
            httpsAgent: agent,
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
        };

        const downloadToDataUrl = async (url) => {
            if (!url || url.startsWith('data:') || url.startsWith('/api/')) return url;
            try {
                let resp;
                try {
                    resp = await axios.get(url, fetchConfig);
                } catch {
                    const proxyUrl = `https://wsrv.nl/?url=${encodeURIComponent(url)}`;
                    resp = await axios.get(proxyUrl, fetchConfig);
                }
                const contentType = resp.headers['content-type'] || 'image/png';
                return `data:${contentType};base64,${Buffer.from(resp.data).toString('base64')}`;
            } catch (err) {
                console.warn(`[Download] Failed to download component: ${url}`, err.message);
                return url;
            }
        };

        console.log(`[Manual Download] Processing ${asset.name} (${asset.id})...`);

        // 1. Download basic components to DataURL
        if (asset.frontUrl) asset.frontUrl = await downloadToDataUrl(asset.frontUrl);
        if (asset.backUrl) asset.backUrl = await downloadToDataUrl(asset.backUrl);

        // 2. Download parts for stitching
        if (asset.parts && asset.parts.length > 0) {
            asset.parts = await Promise.all(asset.parts.map(p => downloadToDataUrl(p)));
        }

        // 3. Trigger stitching if parts exists
        if (asset.parts && asset.parts.length > 1) {
            console.log(`[Manual Download] Triggering stitch for ${asset.name}...`);
            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
            try {
                // Layout logic fallback: assume column (vertical) for manual unless specified
                const direction = asset.layout === 1 ? 'row' : 'column';
                const stitchedPath = await stitchParts(browser, asset.parts, asset.name, direction, asset.frontUrl);
                if (stitchedPath) {
                    asset.scratchFaceUrl = stitchedPath;
                    asset.stitchedUrl = stitchedPath;
                }
            } finally {
                await browser.close();
            }
        }

        // 4. Update the primary display URL
        // User expected: One full size (frontUrl), One stitched size (scratchFaceUrl)
        // We set .url to frontUrl (the colorful one) by default, and provide scratchFaceUrl as the experience layer.
        asset.url = asset.frontUrl;
        asset.type = 'local-server';

        db.scratchLibrary[idx] = asset;
        saveDB(db);

        console.log(`[Manual Download] Success: ${asset.name}`);
        res.json({ success: true, asset });
    } catch (e) {
        console.error('[Download External] Failed:', e.message);
        res.status(502).json({ error: 'Failed to download and process: ' + e.message });
    }
});

// Helper: 挑选票面展示图。
// 优先级：url (用户在后台手动点的) → scratchFaceUrl (合成的效果图) → frontUrl (封面艺术图)
const bestUrl = (img) => img.url || img.scratchFaceUrl || img.frontUrl || img.imageDataUrl || '';

// ST-1: Get store scratch config (store admin)
// Query: { id, adminKey }
app.get('/api/store/scratch/config', (req, res) => {
    const { id, adminKey } = req.query;
    const db = getDB();
    const store = db.stores.find(s => s.id === id);
    if (!store || store.adminKey !== adminKey) return res.status(403).json({ error: 'Unauthorized' });
    res.json({
        scratchConfig: store.scratchConfig || { selected: {}, tierDrawCounts: {} }
    });
});

// ST-2: Update store scratch config (store admin or super admin)
// Body: { id, adminKey?, superKey?, scratchConfig: { selected: {10:[ids], 20:[ids]...}, tierDrawCounts: {10:1,...} } }
app.post('/api/store/scratch/update', (req, res) => {
    const { id, adminKey, superKey, scratchConfig } = req.body;
    const db = getDB();
    const storeIndex = db.stores.findIndex(s => s.id === id);
    if (storeIndex === -1) return res.status(404).json({ error: 'Store not found' });
    const isStoreAdmin = db.stores[storeIndex].adminKey === adminKey;
    const isSuperAdmin = superKey && superKey === db.superConfig.superKey;
    if (!isStoreAdmin && !isSuperAdmin) return res.status(403).json({ error: 'Unauthorized' });

    // Clean up ghost IDs before saving
    const library = db.scratchLibrary || [];
    const validIds = new Set(library.map(img => img.id));
    if (scratchConfig.selected) {
        Object.keys(scratchConfig.selected).forEach(tier => {
            if (Array.isArray(scratchConfig.selected[tier])) {
                scratchConfig.selected[tier] = scratchConfig.selected[tier].filter(id => validIds.has(id));
            }
        });
    }

    db.stores[storeIndex].scratchConfig = scratchConfig;
    saveDB(db);
    res.json({ success: true });
});

// PUB-1: Get public scratch data for a store (no auth needed, for frontend game)
// Returns only enabled images that the store has selected
app.get('/api/store/:id/scratch', (req, res) => {
    const db = getDB();
    const id = req.params.id;
    const store = db.stores.find(s => s.id === id);
    if (!store) return res.status(404).json({ error: 'Store not found' });

    const library = db.scratchLibrary || [];
    const scratchConfig = store.scratchConfig || { selected: {}, tierDrawCounts: {} };

    // Auto-cleanup ghosts for this store in-memory for the game
    const validIds = new Set(library.map(img => img.id));

    const tiers = {};
    [10, 20, 30, 50].forEach(tier => {
        const selectedIds = (scratchConfig.selected && scratchConfig.selected[tier]) || [];
        const images = library.filter(img =>
            img.tier === tier &&
            img.enabled &&
            selectedIds.includes(img.id) &&
            validIds.has(img.id) // Ensure ID still exists in library
        ).map(img => ({
            id: img.id,
            name: img.name,
            tier: img.tier,
            imageDataUrl: bestUrl(img) // keep field name for backwards compat
        }));

        tiers[tier] = {
            images,
            drawCount: scratchConfig.tierDrawCounts?.[tier] || 1,
            label: `${tier}元`,
            maxCount: tier === 10 ? 60 : (tier === 20 ? 30 : 20)
        };
    });

    res.json({
        storeName: store.name,
        scratchConfig,
        tiers
    });
});

// ====== LAYOUT ASSET LIBRARY API (Super Admin) ======

// LA-1: Get full layout library
app.get('/api/super/layout/library', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    res.json(db.layoutLibrary || []);
});

// LA-2: Upload/Add layout asset
app.post('/api/super/layout/upload', (req, res) => {
    const { superKey, name, type, url, imageDataUrl } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const newAsset = {
        id: 'layout_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name || '未命名素材',
        type: type || 'other',
        url: url || imageDataUrl, // Use direct URL or Base64 data
        createdAt: Date.now()
    };

    if (!db.layoutLibrary) db.layoutLibrary = [];
    db.layoutLibrary.unshift(newAsset);
    saveDB(db);
    res.json({ success: true, asset: newAsset });
});

// LA-3: Delete layout asset
app.post('/api/super/layout/delete', (req, res) => {
    const { superKey, id } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const before = (db.layoutLibrary || []).length;
    db.layoutLibrary = (db.layoutLibrary || []).filter(i => i.id !== id);
    const after = db.layoutLibrary.length;

    if (after === before) {
        return res.status(404).json({ error: 'Asset not found' });
    }

    saveDB(db);
    res.json({ success: true });
});

// ====== END LAYOUT ASSET LIBRARY API ======

// ====== START CAROUSEL ASSET LIBRARY API ======

// CA-1: Get full carousel library
app.get('/api/super/carousel/library', (req, res) => {
    const { superKey } = req.query;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });
    res.json(db.carouselLibrary || []);
});

// CA-2: Upload/Add carousel asset
app.post('/api/super/carousel/upload', (req, res) => {
    const { superKey, name, type, url, imageDataUrl, badge, title, sub, level, cities, duration, enabled, priority } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const newAsset = {
        id: 'carousel_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        name: name || '未命名轮播图',
        type: type || 'external',
        url: url || imageDataUrl,
        createdAt: Date.now(),
        badge: badge || '',
        title: title || '',
        sub: sub || '',
        level: level || 'province',
        cities: Array.isArray(cities) ? cities : [],
        duration: Number(duration) || 8000,
        enabled: enabled !== false,
        priority: Number(priority) || 0,
    };

    if (!db.carouselLibrary) db.carouselLibrary = [];
    db.carouselLibrary.unshift(newAsset);
    saveDB(db);
    res.json({ success: true, asset: newAsset });
});

// CA-3: Delete carousel asset
app.post('/api/super/carousel/delete', (req, res) => {
    const { superKey, id } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const before = (db.carouselLibrary || []).length;
    db.carouselLibrary = (db.carouselLibrary || []).filter(i => i.id !== id);
    const after = db.carouselLibrary.length;

    if (after === before) {
        return res.status(404).json({ error: 'Asset not found' });
    }

    saveDB(db);
    res.json({ success: true });
});

// CA-4: Update carousel asset
app.post('/api/super/carousel/update', (req, res) => {
    const { superKey, id, name, url, badge, title, sub, level, cities, duration, enabled, priority } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    const item = (db.carouselLibrary || []).find(i => i.id === id);
    if (!item) return res.status(404).json({ error: 'Asset not found' });

    if (name !== undefined) item.name = name;
    if (url !== undefined) item.url = url;
    if (badge !== undefined) item.badge = badge;
    if (title !== undefined) item.title = title;
    if (sub !== undefined) item.sub = sub;
    if (level !== undefined) item.level = level;
    if (cities !== undefined) item.cities = Array.isArray(cities) ? cities : [];
    if (duration !== undefined) item.duration = Number(duration) || 8000;
    if (enabled !== undefined) item.enabled = !!enabled;
    if (priority !== undefined) item.priority = Number(priority) || 0;

    saveDB(db);
    res.json({ success: true, asset: item });
});

// ====== END CAROUSEL ASSET LIBRARY API ======

// ====== END SCRATCH CARD API ======

// QR Code Generation API
app.post('/api/generate-qr', async (req, res) => {
    try {
        const { dataUrl } = req.body;
        if (!dataUrl) {
            return res.status(400).json({ success: false, error: 'dataUrl required' });
        }

        // Extract base64 image data
        const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        // Create temp directory if not exists
        const tempDir = path.join(__dirname, '../dist/temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Save image with unique filename
        const filename = `share-${Date.now()}.png`;
        const filepath = path.join(tempDir, filename);
        fs.writeFileSync(filepath, buffer);

        // Generate URL for the saved image
        const imageUrl = `${req.protocol}://${req.get('host')}/temp/${filename}`;

        // Generate QR code from the URL
        const qrCodeDataUrl = await QRCode.toDataURL(imageUrl, {
            errorCorrectionLevel: 'M',
            type: 'image/png',
            width: 300,
            margin: 2
        });

        // Clean up old temp files (older than 1 hour)
        const files = fs.readdirSync(tempDir);
        const now = Date.now();
        files.forEach(file => {
            const filePath = path.join(tempDir, file);
            const stats = fs.statSync(filePath);
            const age = now - stats.mtimeMs;
            if (age > 3600000) { // 1 hour
                fs.unlinkSync(filePath);
            }
        });

        res.json({ success: true, qrCode: qrCodeDataUrl });
    } catch (error) {
        console.error('[QR] Generation Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});


// --- HELPER: Auto Check Wins ---
const autoResultCheck = (db) => {
    try {
        const dataPath = path.join(__dirname, '../public/data.json');
        if (!fs.existsSync(dataPath)) return 0;

        const drawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        const history = drawData.history || [];
        let allResults = [...history];

        // Also check latest
        if (drawData.latest && drawData.latest.period) {
            const latPeriod = drawData.latest.period.replace(/[^\d]/g, '');
            const pExists = allResults.find(r => String(r.period) === String(latPeriod));
            if (!pExists) {
                allResults.unshift({
                    period: latPeriod,
                    reds: drawData.latest.reds,
                    blues: drawData.latest.blues
                });
            }
        }

        let updatedCount = 0;
        db.tickets.forEach(ticket => {
            if (ticket.status !== 'pending') return;

            // Find draw result for this ticket's period
            // ticket.period is string e.g "26012"
            const result = allResults.find(r => String(r.period) === String(ticket.period));
            if (!result) return; // Not drawn yet

            // Calculate Win Logic
            let totalWin = 0;
            let winLevels = []; // e.g. ["九等奖"]

            // Helper for simple Check (Partial Simulation)
            // Real DLT logic involves combinations. Here we implement Simplified Rule:
            // Match Reds/Blues count -> Lookup Prize.
            // Assuming ticket.numbers is simple bet.
            const bets = Array.isArray(ticket.numbers) ? ticket.numbers : [ticket.numbers];

            bets.forEach(bet => {
                const r = bet.red || bet.reds || [];
                const b = bet.blue || bet.blues || [];

                const rHit = r.filter(n => result.reds.includes(String(n).padStart(2, '0'))).length;
                const bHit = b.filter(n => result.blues.includes(String(n).padStart(2, '0'))).length;

                // Prize Table (Standard)
                // 5+2 => 1 (1000w)
                // 5+1 => 2 (10w)
                // 5+0 => 3 (10000)
                // 4+2 => 4 (3000)
                // 4+1 => 5 (300)
                // 3+2 => 6 (200)
                // 4+0 => 7 (100)
                // 3+1 => 8 (15)
                // 2+2 => 8 (15)
                // 3+0 => 9 (5)
                // 2+1 => 9 (5)
                // 1+2 => 9 (5)
                // 0+2 => 9 (5)

                let prize = 0;
                let level = '';

                if (rHit === 5 && bHit === 2) { prize = 10000000; level = '一等奖'; }
                else if (rHit === 5 && bHit === 1) { prize = 100000; level = '二等奖'; }
                else if (rHit === 5 && bHit === 0) { prize = 10000; level = '三等奖'; }
                else if (rHit === 4 && bHit === 2) { prize = 3000; level = '四等奖'; }
                else if (rHit === 4 && bHit === 1) { prize = 300; level = '五等奖'; }
                else if (rHit === 3 && bHit === 2) { prize = 200; level = '六等奖'; }
                else if (rHit === 4 && bHit === 0) { prize = 100; level = '七等奖'; }
                else if ((rHit === 3 && bHit === 1) || (rHit === 2 && bHit === 2)) { prize = 15; level = '八等奖'; }
                else if ((rHit === 3 && bHit === 0) || (rHit === 2 && bHit === 1) || (rHit === 1 && bHit === 2) || (rHit === 0 && bHit === 2)) { prize = 5; level = '九等奖'; }

                if (prize > 0) {
                    totalWin += prize;
                    winLevels.push(level);
                }
            });

            if (totalWin > 0) {
                ticket.status = 'won';
                ticket.winAmount = totalWin;
                ticket.winLevel = [...new Set(winLevels)];
                updatedCount++;
            } else {
                ticket.status = 'lost';
                ticket.winAmount = 0;
                ticket.winLevel = [];
                updatedCount++; // Mark lost as updated
            }
        });

        if (updatedCount > 0) {
            console.log(`[Auto Check] Updated ${updatedCount} tickets.`);
            saveDB(db);
        }
        return updatedCount;
    } catch (e) {
        console.error("Auto Check Failed:", e);
        return 0;
    }
};


// 8. Manual Draw Input (Super Only) - UPDATED with Prize Calc
app.post('/api/super/manual-draw', (req, res) => {
    const { superKey, drawData } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    try {
        const dataPath = path.join(__dirname, '../public/data.json');

        // ... (Existing File Write Logic) ...
        let currentData = { latest: {}, history: [] };
        if (fs.existsSync(dataPath)) {
            currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        }

        // Shift current latest to history
        if (currentData.latest && currentData.latest.period) {
            const oldLatest = { ...currentData.latest };
            const historyItem = {
                period: oldLatest.period.replace('第', '').replace('期', ''),
                // ... other fields
                date: oldLatest.date.split(' ')[0],
                reds: oldLatest.reds,
                blues: oldLatest.blues
            };
            currentData.history.unshift(historyItem);
            currentData.history = currentData.history.slice(0, 50);
        }

        const periodNum = drawData.period; // e.g. "26011"

        currentData.latest = {
            period: `第${periodNum}期`,
            date: drawData.date,
            reds: drawData.reds,
            blues: drawData.blues,
            pool: drawData.pool,
            drawOrder: drawData.reds.join(' ') + ' + ' + drawData.blues.join(' ')
        };
        currentData.updateTime = new Date().toLocaleString('zh-CN', { hour12: false });
        fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2));

        // --- TRIGGER PRIZE CALCULATION ---
        // Use unified auto-check logic
        autoResultCheck(db);

        console.log(`[Manual] Data manually updated to period ${drawData.period}`);
        res.json({ success: true, message: 'Data updated and Prizes Calculated' });
    } catch (e) {
        console.error('Manual update failed:', e);
        res.status(500).json({ error: e.message });
    }
});

// 9. Update Global Super Config
app.post('/api/super/update-config', (req, res) => {
    const { superKey, cronConfig, showCalculator, animationDuration, packageDuration, drawHistorySize, scrollHoldMs, drawLogoMap, drawLogoOpacity, managerTitleTemplates, logRetentionDays } = req.body;
    const db = getDB();
    if (superKey !== db.superConfig.superKey) return res.status(403).json({ error: 'Unauthorized' });

    // Update fields if present
    if (typeof logRetentionDays !== 'undefined') {
        const parsed = Number(logRetentionDays);
        if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= 365) {
            db.superConfig.logRetentionDays = Math.floor(parsed);
        }
    }
    if (cronConfig) db.superConfig.cronConfig = cronConfig;
    if (typeof showCalculator !== 'undefined') db.superConfig.showCalculator = showCalculator;
    if (typeof animationDuration !== 'undefined') db.superConfig.animationDuration = animationDuration;
    if (typeof packageDuration !== 'undefined') db.superConfig.packageDuration = packageDuration;
    if (typeof drawHistorySize !== 'undefined') {
        const parsed = Number(drawHistorySize);
        if (!Number.isNaN(parsed) && parsed > 0) {
            db.superConfig.drawHistorySize = Math.min(50, Math.max(1, Math.floor(parsed)));
        }
    }
    if (typeof scrollHoldMs !== 'undefined') {
        const parsed = Number(scrollHoldMs);
        if (!Number.isNaN(parsed) && parsed > 0) {
            db.superConfig.scrollHoldMs = Math.min(10000, Math.max(1000, Math.floor(parsed)));
        }
    }
    if (typeof drawLogoMap !== 'undefined') {
        if (drawLogoMap && typeof drawLogoMap === 'object' && !Array.isArray(drawLogoMap)) {
            db.superConfig.drawLogoMap = drawLogoMap;
        } else if (drawLogoMap === null) {
            db.superConfig.drawLogoMap = {};
        }
    }
    if (typeof drawLogoOpacity !== 'undefined') {
        const parsed = Number(drawLogoOpacity);
        if (!Number.isNaN(parsed)) {
            db.superConfig.drawLogoOpacity = Math.min(1, Math.max(0, parsed));
        }
    }
    if (typeof managerTitleTemplates !== 'undefined') {
        db.superConfig.managerTitleTemplates = normalizeManagerTitleTemplates(managerTitleTemplates);
    }

    saveDB(db);
    res.json({ success: true });
});

// --- Auto Fetch Lottery Data (Every 1 Hour) ---
// --- Configurable Auto Fetch Lottery Data ---
const isCronTime = (config, now) => {
    if (!config?.enabled) return false;
    const day = now.getDay(); // 0-6
    const hour = now.getHours();
    const minute = now.getMinutes();

    if (!config.days.includes(day)) return false;

    const nowTime = hour * 60 + minute;
    const startTime = config.startHour * 60 + config.startMinute;
    const endTime = config.endHour * 60 + config.endMinute;
    if (nowTime < startTime || nowTime > endTime) return false;

    if (minute % config.interval !== 0) return false;
    return true;
};
const fetchLotteryData = (force = false) => {
    const db = getDB();
    const config = db.superConfig?.cronConfig || {
        days: [1, 3, 5], startHour: 21, startMinute: 25, endHour: 22, endMinute: 0, interval: 5, enabled: true
    };

    const now = new Date();

    // Convert to China Time for consistent checking (Server might be UTC)
    // Actually, local time on server is usually what we care about if configured correctly.
    // But let's assume server time is correct or mapped to target timezone.
    // For 114.55.243.23 (Aliyun), it's likely CST.

    if (!force) {
        if (!isCronTime(config, now)) return;

        // 4. Check if today's data already exists
        // Load partial data from public/data.json to avoid full DB read if possible, but we have DB.
        // Actually public/data.json is the source of truth for "current draw".
        try {
            const dataPath = path.join(__dirname, '../public/data.json');
            if (fs.existsSync(dataPath)) {
                const currentData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
                if (currentData.latest && currentData.latest.date) {
                    // Check if date matches today.
                    // Format: "MM-DD" or "MM月DD日 ..."
                    // Let's rely on updateTime or similar?
                    // Better: extract M-D from date and compare.
                    const todayStr = `${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
                    // currentData.latest.date "01-27"
                    // If it matches today, we have data. STOP.
                    // HOWEVER, verify if "date" in json is draw date or fetch date?
                    // It is draw date.
                    // If today IS draw day, and we have data for today, we are done.

                    // Simple check:
                    if (currentData.latest.date.includes(todayStr) || currentData.latest.date.includes(`${now.getMonth() + 1}月${now.getDate()}日`)) {
                        console.log('[AutoCron] Today\'s data already exists. Skipping.');
                        return;
                    }
                }
            }
        } catch (e) {
            // Ignore error, proceed to fetch
        }
    }

    const API_URL = 'https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=85&provinceId=0&pageSize=30&isVerify=1&pageNo=1';
    const https = require('https');

    console.log(`[AutoCron] Fetching data... (Force: ${force}, Time: ${now.toLocaleTimeString()})`);
    https.get(API_URL, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0',
            'Referer': 'https://www.lottery.gov.cn/',
            'Origin': 'https://www.lottery.gov.cn',
            'Host': 'webapi.sporttery.cn',
            'Accept': 'application/json, text/javascript, */*; q=0.01',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8'
        }
    }, (res) => {
        let rawData = '';
        res.on('data', (chunk) => { rawData += chunk; });
        res.on('end', () => {
            try {
                const parsedData = JSON.parse(rawData);
                if (parsedData.success && parsedData.value && parsedData.value.list) {
                    const list = parsedData.value.list;
                    const latest = list[0];
                    const numbers = latest.lotteryDrawResult.split(' ');
                    const reds = numbers.slice(0, 5);
                    const blues = numbers.slice(5);

                    const formatDate = (dateStr, isShort = false) => {
                        const date = new Date(dateStr);
                        const m = (date.getMonth() + 1).toString().padStart(2, '0');
                        const d = date.getDate().toString().padStart(2, '0');
                        const WEEK_MAP = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                        const week = WEEK_MAP[date.getDay()];
                        return isShort ? `${m}-${d}` : `${m}月${d}日 ${week}`;
                    };

                    const finalData = {
                        latest: {
                            period: `第${latest.lotteryDrawNum}期`,
                            date: formatDate(latest.lotteryDrawTime),
                            reds: reds,
                            blues: blues,
                            pool: latest.poolBalanceAfterdraw.toLocaleString(),
                            drawOrder: reds.join(' ') + ' + ' + blues.join(' ')
                        },
                        history: list.slice(1, 6).map(item => {
                            const nums = item.lotteryDrawResult.split(' ');
                            return {
                                period: item.lotteryDrawNum,
                                date: formatDate(item.lotteryDrawTime, true),
                                reds: nums.slice(0, 5),
                                blues: nums.slice(5)
                            };
                        }),
                        updateTime: new Date().toLocaleString('zh-CN', { hour12: false, month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
                    };

                    // Write to ../public/data.json
                    const dataPath = path.join(__dirname, '../public/data.json');
                    if (!fs.existsSync(path.dirname(dataPath))) fs.mkdirSync(path.dirname(dataPath), { recursive: true });

                    // Check again before writing during auto-fetch? 
                    // No, invalidation is fine.

                    fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
                    console.log(`[AutoCron] Data updated successfully at ${finalData.updateTime}`);
                }
            } catch (e) {
                console.error('[AutoCron] Failed to parse/write data:', e.message);
            }
        });
    }).on('error', (e) => console.error(`[AutoCron] Request failed: ${e.message}`));
};

const refreshSourcesAndHistory = async (historySize = HISTORY_FETCH_SIZE) => {
    const newData = await runAllCrawlers(historySize);
    const db = getDB();
    try {
        const fetchedHistory = await fetchAllDrawHistories(historySize);
        if (hasHistoryData(fetchedHistory)) {
            newData.drawHistory = fetchedHistory;
        } else {
            newData.drawHistory = db.drawHistory || fetchedHistory || { timestamp: new Date().toISOString(), games: [] };
        }
    } catch (e) {
        console.error('Draw history refresh error:', e.message);
        newData.drawHistory = db.drawHistory || { timestamp: new Date().toISOString(), games: [] };
    }

    db.sources = newData;
    if (newData.drawHistory) {
        db.drawHistory = newData.drawHistory;
    }
    saveDB(db);
    return newData;
};

const autoRefreshSources = async (force = false) => {
    const db = getDB();
    const config = db.superConfig?.cronConfig || {
        days: [1, 3, 5], startHour: 21, startMinute: 25, endHour: 22, endMinute: 0, interval: 5, enabled: true
    };
    const now = new Date();
    if (!force && !isCronTime(config, now)) return;
    console.log(`[AutoCron] Refreshing sources... (Force: ${force}, Time: ${now.toLocaleTimeString()})`);
    await refreshSourcesAndHistory(HISTORY_FETCH_SIZE);
};

const cron = require('node-cron');

// Run immediately on start (Safe check)
// fetchLotteryData(true); // Don't force on start, let it check config or user force. 
// Actually user might want immediate check on restart. 
// Let's just log startup.
console.log('Server started. Cron scheduled.');

// Schedule task to run EVERY MINUTE to check for time window
cron.schedule('* * * * *', () => {
    // console.log('[Cron] Tick...'); // Too verbose
    autoRefreshSources(false);
});

// (Moved catchall to end)
// ----------------------------------------------------
// SOURCES & CRAWLER (Data Feed Simulation)
// ----------------------------------------------------

// GET /api/system/sources
app.get('/api/system/sources', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    let db = getDB();
    if (!db.sources) {
        db.sources = {
            timestamp: new Date().toISOString(),
            status: 'uninitialized'
        };
    }
    if (!db.drawHistory || !db.drawHistory.games || db.drawHistory.games.length === 0) {
        refreshDrawHistoryInBackground();
    }
    const responseData = {
        ...db.sources,
        availableTags: normalizeAnnouncementTags(db.superConfig?.availableTags),
        drawHistorySize: Number(db.superConfig?.drawHistorySize) || 6,
        scrollHoldMs: Number(db.superConfig?.scrollHoldMs) || 3000,
        layoutLibrary: db.layoutLibrary || [],
        drawLogoMap: db.superConfig?.drawLogoMap || {},
        drawLogoOpacity: typeof db.superConfig?.drawLogoOpacity === 'number' ? db.superConfig.drawLogoOpacity : 0.18
    };
    if (db.drawHistory) {
        responseData.drawHistory = db.drawHistory;
    }
    // Carousel: filter by store city, province-level first
    const storeId = req.query.storeId;
    let carouselItems = (db.carouselLibrary || []).filter(item => item.enabled !== false);
    if (storeId) {
        const store = db.stores.find(s => s.id === storeId);
        const city = store?.city || '';
        carouselItems = carouselItems.filter(item => {
            if (!item.level || item.level === 'province') return true;
            if (item.level === 'city' && Array.isArray(item.cities) && item.cities.includes(city)) return true;
            return false;
        });
    }
    carouselItems.sort((a, b) => {
        const aP = (!a.level || a.level === 'province') ? 0 : 1;
        const bP = (!b.level || b.level === 'province') ? 0 : 1;
        if (aP !== bP) return aP - bP;
        const aPri = a.priority || 0;
        const bPri = b.priority || 0;
        return bPri - aPri;
    });
    responseData.carousel = carouselItems;
    res.json({ success: true, data: responseData });
});

app.get('/api/system/winner-config', (req, res) => {
    const db = getDB();
    const { center, changed } = ensureWinnerCenterConfig(db);
    if (changed) saveDB(db);
    res.json({ success: true, data: center });
});

// GET /api/system/image-proxy?url=
app.get('/api/system/image-proxy', async (req, res) => {
    const { url } = req.query;
    if (!url || !/^https?:\/\//.test(url)) {
        return res.status(400).json({ error: 'Invalid url' });
    }
    try {
        const response = await axios.get(url, {
            responseType: 'arraybuffer',
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; TYMDHDPT/1.0)',
                'Accept': 'image/*,*/*;q=0.8'
            }
        });
        const contentType = response.headers['content-type'] || 'image/png';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Cache-Control', 'public, max-age=3600');
        res.send(Buffer.from(response.data));
    } catch (e) {
        console.error('[Image Proxy] Fetch failed:', e.message);
        res.status(502).json({ error: 'Image fetch failed' });
    }
});

// GET /api/system/draw-history
app.get('/api/system/draw-history', async (req, res) => {
    let db = getDB();
    const size = Math.max(HISTORY_FETCH_SIZE, Math.min(200, Number(req.query.size) || HISTORY_FETCH_SIZE));
    const force = req.query.force === 'true';
    // Return cached history if available and not forced
    if (db.drawHistory && !force) {
        // If cached games count matches or is enough, return it
        if (db.drawHistory.games && db.drawHistory.games.length > 0) {
            return res.json({ success: true, data: db.drawHistory });
        }
    }

    try {
        const data = await fetchAllDrawHistories(size);
        // Update DB only when we have real history
        if (hasHistoryData(data)) {
            db = getDB(); // re-read to be safe
            db.drawHistory = data;
            saveDB(db);
            return res.json({ success: true, data });
        }
        if (db.drawHistory) {
            return res.json({ success: true, data: db.drawHistory, warning: 'Fetch empty, using cache' });
        }
        res.json({ success: true, data });
    } catch (e) {
        console.error('Draw history fetch error:', e.message);
        // Fallback to cache even on error if possible
        if (db.drawHistory) {
            return res.json({ success: true, data: db.drawHistory, warning: 'Fetch failed, using cache' });
        }
        res.status(500).json({ success: false, error: e.message });
    }
});


// POST /api/system/sources/refresh
app.post('/api/system/sources/refresh', async (req, res) => {
    try {
        const newData = await refreshSourcesAndHistory(HISTORY_FETCH_SIZE);
        res.json({ success: true, data: newData });
    } catch (e) {
        console.error('Crawler Refresh Error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get(/^(?!\/api).+/, (req, res) => {
    // Disable caching for index.html to ensure clients get new deployments
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    // Simplified: sendFile once
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ── HTTPS 支持（自签名证书，用于 APK 摄像头等安全上下文） ──
const https = require('https');
const HTTPS_PORT = 3367;
const certDir = path.join(__dirname, 'certs');
if (!fs.existsSync(certDir)) fs.mkdirSync(certDir, { recursive: true });
const certPath = path.join(certDir, 'server.crt');
const keyPath = path.join(certDir, 'server.key');

// 如果证书不存在，用 selfsigned 库生成，然后启动 HTTPS
(async function startHTTPS() {
    if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
        try {
            const selfsigned = require('selfsigned');
            const attrs = [{ name: 'commonName', value: '192.168.15.218' }];
            const pems = await selfsigned.generate(attrs, {
                days: 3650,
                keySize: 2048,
                extensions: [
                    { name: 'subjectAltName', altNames: [{ type: 7, ip: '192.168.15.218' }] }
                ]
            });
            fs.writeFileSync(keyPath, pems.private);
            fs.writeFileSync(certPath, pems.cert);
            console.log('[HTTPS] 自签名证书已生成');
        } catch (e) {
            console.warn('[HTTPS] 无法生成证书，HTTPS 不可用:', e.message);
            return;
        }
    }
    try {
        const httpsOptions = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath),
        };
        https.createServer(httpsOptions, app).listen(HTTPS_PORT, '0.0.0.0', () => {
            console.log(`HTTPS server running on https://0.0.0.0:${HTTPS_PORT}`);
        });
    } catch (e) {
        console.warn('[HTTPS] 启动失败:', e.message);
    }
})();

// ── 游戏配置管理 ──
const DEFAULT_GAME_CONFIG = {
    xiaoxiaole: {
        STAR_TARGET: 9, MOVES: 30, INITIAL_STARS: 4,
        STAR_SPAWN_INTERVAL: 4, MAX_TOOLS: 99,
        toolCounts: [1, 1, 1, 1],
        matchScores: { '3': 30, '4': 80, '5': 200, 'L_T': 200, 'cross4': 300, 'cross5': 500 },
        bgmVol: 0.025,
    },
    'flappy-bird': {
        GRAVITY: 0.45, FLAP_POWER: -7.5, PIPE_INTERVAL: 160,
        BASE_GAP: 125, MIN_GAP: 100, BASE_SPEED: 2.2, MAX_SPEED: 3.8,
        medals: { bronze: 10, silver: 20, gold: 40 },
    },
    lianliankan: {
        TIME: 120, ROWS: 7, COLS: 10,
        BASE_SCORE: 10, MAX_COMBO: 7, COMBO_BONUS_MULTIPLIER: 10,
    },
};

// 公开接口：游戏客户端读取配置（无需鉴权）
app.get('/api/game-config', (req, res) => {
    const db = getDB();
    const stored = db.superConfig.gameConfig || {};
    const merged = {};
    for (const game of Object.keys(DEFAULT_GAME_CONFIG)) {
        merged[game] = { ...DEFAULT_GAME_CONFIG[game], ...(stored[game] || {}) };
    }
    res.json(merged);
});

// 管理接口：读取配置（需鉴权）
app.get('/api/super/game-config', superKeyOrAuth, (req, res) => {
    const db = getDB();
    const stored = db.superConfig.gameConfig || {};
    const merged = {};
    for (const game of Object.keys(DEFAULT_GAME_CONFIG)) {
        merged[game] = { ...DEFAULT_GAME_CONFIG[game], ...(stored[game] || {}) };
    }
    res.json({ success: true, defaults: DEFAULT_GAME_CONFIG, config: merged });
});

// 管理接口：保存单个游戏配置
app.post('/api/super/game-config', (req, res) => {
    const { superKey, game, config } = req.body || {};
    const db = getDB();
    // 鉴权
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (superKey !== db.superConfig.superKey && !token) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!DEFAULT_GAME_CONFIG[game]) {
        return res.status(400).json({ error: '未知游戏: ' + game });
    }
    if (!db.superConfig.gameConfig) db.superConfig.gameConfig = {};
    db.superConfig.gameConfig[game] = { ...config };
    saveDB(db);
    console.log(`[GameConfig] Updated ${game}:`, JSON.stringify(config));
    res.json({ success: true });
});

// 管理接口：恢复某个游戏的默认配置
app.post('/api/super/game-config/reset', (req, res) => {
    const { superKey, game } = req.body || {};
    const db = getDB();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (superKey !== db.superConfig.superKey && !token) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    if (!DEFAULT_GAME_CONFIG[game]) {
        return res.status(400).json({ error: '未知游戏: ' + game });
    }
    if (db.superConfig.gameConfig) {
        delete db.superConfig.gameConfig[game];
        saveDB(db);
    }
    res.json({ success: true, defaults: DEFAULT_GAME_CONFIG[game] });
});

// ── 互动中心配置 API ──────────────────────────────────────────────────────────

const DEFAULT_GAME_HUB_CONFIG = [
    { key: 'lotto',       name: '大乐透随机选号',   displayName: '大乐透随机选号',   enabled: true, order: 0 },
    { key: 'scratch',     name: '顶呱刮运选票', displayName: '顶呱刮运选票', enabled: true, order: 1 },
    { key: 'lianliankan', name: '体彩连连乐',   displayName: '体彩连连乐',   enabled: true, order: 2 },
    { key: 'sticker',     name: '乐小星大头贴', displayName: '乐小星大头贴', enabled: true, order: 3 },
    { key: 'xiaoxiaole',  name: '体彩消消乐',   displayName: '体彩消消乐',   enabled: true, order: 4 },
    { key: 'flappy',      name: '乐小星快飞',   displayName: '乐小星快飞',   enabled: true, order: 5 },
];

// GET /api/game-hub-config — 公开，前台读取游戏配置
app.get('/api/game-hub-config', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = getDB();
    const hubConfig = db.superConfig?.gameHubConfig;
    res.json({ games: hubConfig?.games || DEFAULT_GAME_HUB_CONFIG });
});

// GET /api/super/game-hub-config — 后台读取配置
app.get('/api/super/game-hub-config', superKeyOrAuth, (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = getDB();
    const hubConfig = db.superConfig?.gameHubConfig;
    console.log('[GameHubConfig] GET admin config, games:', hubConfig?.games?.map(g => `${g.key}(order:${g.order})`).join(', ') || 'DEFAULT');
    res.json({
        success: true,
        config: hubConfig || { games: DEFAULT_GAME_HUB_CONFIG },
        defaults: { games: DEFAULT_GAME_HUB_CONFIG },
    });
});

// POST /api/super/game-hub-config — 后台保存配置
app.post('/api/super/game-hub-config', superKeyOrAuth, (req, res) => {
    const { games } = req.body || {};
    const VALID_KEYS = ['lotto', 'scratch', 'lianliankan', 'sticker', 'xiaoxiaole', 'flappy'];
    if (!Array.isArray(games)) {
        return res.status(400).json({ error: 'games must be an array' });
    }
    for (const g of games) {
        if (!VALID_KEYS.includes(g.key)) {
            return res.status(400).json({ error: '无效的游戏key: ' + g.key });
        }
    }
    console.log('[GameHubConfig] Saving games order:', games.map(g => `${g.key}(order:${g.order})`).join(', '));
    const db = getDB();
    if (!db.superConfig.gameHubConfig) db.superConfig.gameHubConfig = {};
    db.superConfig.gameHubConfig.games = games;
    saveDB(db);
    res.json({ success: true });
});

// ── 互动中心游戏Logo API ──────────────────────────────────────────────────────

// GET /api/game-logos — 公开，返回全部6项（前端互动中心弹窗使用）
app.get('/api/game-logos', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const db = getDB();
    res.json({ logos: db.gameLogos || {} });
});

// POST /api/game-logos/update — 替换某个游戏的Logo图片
app.post('/api/game-logos/update', (req, res) => {
    const { superKey, key, imageDataUrl } = req.body || {};
    const db = getDB();
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (superKey !== db.superConfig.superKey && !token) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    const VALID_KEYS = ['lotto', 'scratch', 'lianliankan', 'sticker', 'xiaoxiaole', 'flappy'];
    if (!VALID_KEYS.includes(key)) {
        return res.status(400).json({ error: '无效的游戏key: ' + key });
    }
    if (!imageDataUrl || !imageDataUrl.startsWith('data:image/')) {
        return res.status(400).json({ error: '请提供有效的图片dataUrl' });
    }
    try {
        // 解析 base64
        const matches = imageDataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) return res.status(400).json({ error: '图片格式无效' });
        const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        if (buffer.length > 10 * 1024 * 1024) return res.status(400).json({ error: '图片不能超过10MB' });
        const filename = `${key}.${ext}`;
        const destFile = path.join(GAME_LOGO_DIR, filename);
        // 删除旧文件（如果扩展名不同）
        if (db.gameLogos[key] && db.gameLogos[key].filename !== filename) {
            const oldFile = path.join(GAME_LOGO_DIR, db.gameLogos[key].filename);
            try { if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile); } catch (_) {}
        }
        fs.writeFileSync(destFile, buffer);
        if (!db.gameLogos) db.gameLogos = {};
        db.gameLogos[key] = {
            ...( db.gameLogos[key] || {} ),
            key,
            url: `/game-logos/${filename}`,
            filename,
            updatedAt: new Date().toISOString(),
        };
        saveDB(db);
        console.log(`[GameLogos] Updated logo for: ${key}`);
        res.json({ success: true, logo: db.gameLogos[key] });
    } catch (e) {
        console.error('[GameLogos] update error:', e.message);
        res.status(500).json({ error: e.message });
    }
});

// 小游戏主页：所有未知路径重定向到根路径
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api/') && !req.path.startsWith('/games/') && req.path !== '/' && !req.path.startsWith('/photo-frames') && req.path !== '/data.json' && !req.path.match(/\.(js|css|png|jpg|jpeg|gif|webp|svg|ico|woff|woff2|ttf|eot|json|map)$/)) {
        return res.redirect('/');
    }
    next();
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP  server running on http://0.0.0.0:${PORT}`);

    // ── Offline detection timer (every 30s) ──
    setInterval(() => {
        if (!global.globalDeviceStatus) return;
        const now = Date.now();
        for (const [storeId, status] of Object.entries(global.globalDeviceStatus)) {
            if (!status.lastPing) continue;
            const elapsed = now - status.lastPing;
            // If device was online (within timeout) but now exceeds it → log offline with last perf data
            if (elapsed >= ONLINE_TIMEOUT_MS && elapsed < ONLINE_TIMEOUT_MS + 35000) {
                const lastPerf = status.perfSnapshot || null;
                const lastDevice = status.deviceInfo || null;
                // Store structured JSON so frontend can render detail panel
                const offlineDetail = JSON.stringify({
                    reason: 'heartbeat_timeout',
                    lastPing: status.lastPing,
                    perf: lastPerf,
                    deviceInfo: lastDevice,
                    timestamp: now,
                });
                storeLog(storeId, 'offline', offlineDetail);
                console.log(`[Offline] 门店 ${storeId} 已离线`);
            }
        }
    }, 30000);

    // ── Auto log cleanup (every hour) ──
    setInterval(() => {
        try {
            const db = getDB();
            const days = db.superConfig.logRetentionDays || 30;
            const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
            const s = getStmts();
            const info = s.deleteOldLogs.run(cutoff);
            if (info.changes > 0) {
                console.log(`[LogCleanup] 自动清理 ${info.changes} 条过期日志 (>${days}天)`);
            }
        } catch (e) {
            console.error('[LogCleanup] Error:', e.message);
        }
    }, 3600000);
});
