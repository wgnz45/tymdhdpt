/**
 * server/db.js — SQLite 封装层
 *
 * 提供 getDB() / saveDB() 兼容函数，内部使用 better-sqlite3。
 * 首次启动时自动从 db.json 迁移数据到 db.sqlite。
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'db.sqlite');
const JSON_PATH = path.join(__dirname, 'db.json');

let db = null;

// ── Schema DDL ──────────────────────────────────────────────

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS super_config (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS stores (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS tickets (
    id TEXT PRIMARY KEY,
    store_id TEXT NOT NULL DEFAULT '',
    period TEXT NOT NULL DEFAULT '',
    mode TEXT NOT NULL DEFAULT 'regular',
    type TEXT NOT NULL DEFAULT 'single',
    numbers TEXT NOT NULL DEFAULT '[]',
    count INTEGER NOT NULL DEFAULT 1,
    price INTEGER NOT NULL DEFAULT 0,
    timestamp INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending',
    win_amount INTEGER NOT NULL DEFAULT 0,
    win_level TEXT NOT NULL DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_tickets_store ON tickets(store_id);
CREATE INDEX IF NOT EXISTS idx_tickets_period ON tickets(period);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

CREATE TABLE IF NOT EXISTS analytics (
    store_id TEXT PRIMARY KEY,
    click_regular INTEGER NOT NULL DEFAULT 0,
    click_package INTEGER NOT NULL DEFAULT 0,
    share_count INTEGER NOT NULL DEFAULT 0,
    share_amount INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS central_announcements (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS scratch_library (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS layout_library (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS carousel_library (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS photo_frames (
    id TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS game_logos (
    key TEXT PRIMARY KEY,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS sources (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS fortune_data (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS draw_history (
    id INTEGER PRIMARY KEY DEFAULT 1,
    data TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS store_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id TEXT NOT NULL,
    event TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_store_logs_store ON store_logs(store_id);
CREATE INDEX IF NOT EXISTS idx_store_logs_time ON store_logs(created_at);

CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'province',
    city TEXT,
    store_id TEXT,
    parent_id TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    level TEXT NOT NULL DEFAULT 'province',
    description TEXT DEFAULT '',
    permissions TEXT NOT NULL DEFAULT '{}',
    is_system INTEGER DEFAULT 0,
    created_at INTEGER,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS admin_users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    real_name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    role_id TEXT NOT NULL,
    dept_id TEXT DEFAULT '',
    city TEXT DEFAULT '',
    store_id TEXT DEFAULT '',
    status INTEGER DEFAULT 1,
    last_login_at INTEGER,
    last_login_ip TEXT DEFAULT '',
    created_at INTEGER,
    updated_at INTEGER,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);
CREATE INDEX IF NOT EXISTS idx_admin_users_username ON admin_users(username);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin_users(role_id);

CREATE TABLE IF NOT EXISTS admin_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    real_name TEXT DEFAULT '',
    role_name TEXT DEFAULT '',
    action TEXT NOT NULL,
    module TEXT DEFAULT '',
    target TEXT DEFAULT '',
    detail TEXT DEFAULT '',
    ip TEXT DEFAULT '',
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_admin_logs_user ON admin_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_logs_time ON admin_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_admin_logs_module ON admin_logs(module);
`;

// ── Prepared statements (cached for performance) ────────────

let stmts = null;

function prepareStatements() {
    stmts = {
        // Reads
        getSuperConfig: db.prepare('SELECT data FROM super_config WHERE id = 1'),
        getAllStores: db.prepare('SELECT data FROM stores'),
        getAllTickets: db.prepare('SELECT * FROM tickets ORDER BY timestamp DESC'),
        getAllAnalytics: db.prepare('SELECT store_id, click_regular, click_package, share_count, share_amount FROM analytics'),
        getAllAnnouncements: db.prepare('SELECT data FROM central_announcements'),
        getAllScratch: db.prepare('SELECT data FROM scratch_library'),
        getAllLayout: db.prepare('SELECT data FROM layout_library'),
        getAllCarousel: db.prepare('SELECT data FROM carousel_library'),
        getAllPhotoFrames: db.prepare('SELECT data FROM photo_frames'),
        getSources: db.prepare('SELECT data FROM sources WHERE id = 1'),
        getFortune: db.prepare('SELECT data FROM fortune_data WHERE id = 1'),
        getDrawHistory: db.prepare('SELECT data FROM draw_history WHERE id = 1'),

        // Writes
        upsertSuperConfig: db.prepare('INSERT OR REPLACE INTO super_config (id, data) VALUES (1, ?)'),
        deleteAllStores: db.prepare('DELETE FROM stores'),
        insertStore: db.prepare('INSERT INTO stores (id, data) VALUES (?, ?)'),
        deleteAllTickets: db.prepare('DELETE FROM tickets'),
        insertTicket: db.prepare('INSERT INTO tickets (id, store_id, period, mode, type, numbers, count, price, timestamp, status, win_amount, win_level) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
        deleteAllAnalytics: db.prepare('DELETE FROM analytics'),
        insertAnalytics: db.prepare('INSERT INTO analytics (store_id, click_regular, click_package, share_count, share_amount) VALUES (?, ?, ?, ?, ?)'),
        deleteAllAnnouncements: db.prepare('DELETE FROM central_announcements'),
        insertAnnouncement: db.prepare('INSERT INTO central_announcements (id, data) VALUES (?, ?)'),
        deleteAllScratch: db.prepare('DELETE FROM scratch_library'),
        insertScratch: db.prepare('INSERT INTO scratch_library (id, data) VALUES (?, ?)'),
        deleteAllLayout: db.prepare('DELETE FROM layout_library'),
        insertLayout: db.prepare('INSERT INTO layout_library (id, data) VALUES (?, ?)'),
        deleteAllCarousel: db.prepare('DELETE FROM carousel_library'),
        insertCarousel: db.prepare('INSERT INTO carousel_library (id, data) VALUES (?, ?)'),
        deleteAllPhotoFrames: db.prepare('DELETE FROM photo_frames'),
        insertPhotoFrame: db.prepare('INSERT INTO photo_frames (id, data) VALUES (?, ?)'),
        upsertSources: db.prepare('INSERT OR REPLACE INTO sources (id, data) VALUES (1, ?)'),
        upsertFortune: db.prepare('INSERT OR REPLACE INTO fortune_data (id, data) VALUES (1, ?)'),
        upsertDrawHistory: db.prepare('INSERT OR REPLACE INTO draw_history (id, data) VALUES (1, ?)'),

        // Game logos
        getAllGameLogos: db.prepare('SELECT key, data FROM game_logos'),
        upsertGameLogo: db.prepare('INSERT OR REPLACE INTO game_logos (key, data) VALUES (?, ?)'),
        deleteAllGameLogos: db.prepare('DELETE FROM game_logos'),

        // Store logs
        insertLog: db.prepare('INSERT INTO store_logs (store_id, event, detail, created_at) VALUES (?, ?, ?, ?)'),
        getLogsByStore: db.prepare('SELECT * FROM store_logs WHERE store_id = ? ORDER BY created_at DESC LIMIT ?'),
        getLogsByStoreAndTime: db.prepare('SELECT * FROM store_logs WHERE store_id = ? AND created_at >= ? ORDER BY created_at DESC LIMIT ?'),
        getAllLogs: db.prepare('SELECT * FROM store_logs ORDER BY created_at DESC LIMIT ?'),
        deleteOldLogs: db.prepare('DELETE FROM store_logs WHERE created_at < ?'),
        deleteLogsByStore: db.prepare('DELETE FROM store_logs WHERE store_id = ?'),
        countLogs: db.prepare('SELECT COUNT(*) as cnt FROM store_logs'),

        // Departments
        insertDept: db.prepare('INSERT OR REPLACE INTO departments (id, name, level, city, store_id, parent_id, sort_order, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'),
        getAllDepts: db.prepare('SELECT * FROM departments ORDER BY sort_order, created_at'),
        getDeptById: db.prepare('SELECT * FROM departments WHERE id = ?'),
        deleteDept: db.prepare('DELETE FROM departments WHERE id = ?'),

        // Roles
        insertRole: db.prepare('INSERT OR REPLACE INTO roles (id, name, level, description, permissions, is_system, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'),
        getAllRoles: db.prepare('SELECT * FROM roles ORDER BY is_system DESC, created_at'),
        getRoleById: db.prepare('SELECT * FROM roles WHERE id = ?'),
        deleteRole: db.prepare('DELETE FROM roles WHERE id = ? AND is_system = 0'),

        // Admin users
        insertAdminUser: db.prepare('INSERT OR REPLACE INTO admin_users (id, username, password_hash, real_name, phone, role_id, dept_id, city, store_id, status, last_login_at, last_login_ip, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
        getAdminByUsername: db.prepare('SELECT * FROM admin_users WHERE username = ?'),
        getAdminById: db.prepare('SELECT * FROM admin_users WHERE id = ?'),
        getAllAdminUsers: db.prepare('SELECT id, username, real_name, phone, role_id, dept_id, city, store_id, status, last_login_at, last_login_ip, created_at, updated_at FROM admin_users ORDER BY created_at'),
        updateAdminLogin: db.prepare('UPDATE admin_users SET last_login_at = ?, last_login_ip = ? WHERE id = ?'),
        updateAdminStatus: db.prepare('UPDATE admin_users SET status = ?, updated_at = ? WHERE id = ?'),
        deleteAdminUser: db.prepare('DELETE FROM admin_users WHERE id = ?'),
        countAdminsByRole: db.prepare('SELECT COUNT(*) as cnt FROM admin_users WHERE role_id = ?'),
        countAdminsByDept: db.prepare('SELECT COUNT(*) as cnt FROM admin_users WHERE dept_id = ?'),

        // Admin logs
        insertAdminLog: db.prepare('INSERT INTO admin_logs (user_id, username, real_name, role_name, action, module, target, detail, ip, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'),
        getAdminLogs: db.prepare('SELECT * FROM admin_logs ORDER BY created_at DESC LIMIT ?'),
        getAdminLogsByUser: db.prepare('SELECT * FROM admin_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?'),
        getAdminLogsByModule: db.prepare('SELECT * FROM admin_logs WHERE module = ? ORDER BY created_at DESC LIMIT ?'),
        deleteOldAdminLogs: db.prepare('DELETE FROM admin_logs WHERE created_at < ?'),
        countAdminLogs: db.prepare('SELECT COUNT(*) as cnt FROM admin_logs'),
    };
}

// ── Ticket row → JS object ──────────────────────────────────

function formatTicket(row) {
    return {
        id: row.id,
        storeId: row.store_id,
        period: row.period,
        mode: row.mode,
        type: row.type,
        numbers: JSON.parse(row.numbers),
        count: row.count,
        price: row.price,
        timestamp: row.timestamp,
        status: row.status,
        winAmount: row.win_amount,
        winLevel: JSON.parse(row.win_level),
    };
}

// ── getDB() — 返回与 db.json 相同结构的对象 ────────────────

function safeParse(maybe) {
    if (!maybe || maybe.data === undefined || maybe.data === null) return null;
    try { return JSON.parse(maybe.data); } catch { return {}; }
}

function getDB() {
    const superRow = stmts.getSuperConfig.get();
    const superConfig = safeParse(superRow) || {};

    const stores = stmts.getAllStores.all().map(r => safeParse({ data: r.data }) || { id: r.id });

    const analyticsRows = stmts.getAllAnalytics.all();
    const analytics = {};
    for (const r of analyticsRows) {
        analytics[r.store_id] = {
            click_regular: r.click_regular,
            click_package: r.click_package,
            share_count: r.share_count,
            share_amount: r.share_amount,
        };
    }

    const tickets = stmts.getAllTickets.all().map(formatTicket);

    const centralAnnouncements = stmts.getAllAnnouncements.all().map(r => safeParse({ data: r.data }) || {});
    const scratchLibrary = stmts.getAllScratch.all().map(r => safeParse({ data: r.data }) || {});
    const layoutLibrary = stmts.getAllLayout.all().map(r => safeParse({ data: r.data }) || {});
    const carouselLibrary = stmts.getAllCarousel.all().map(r => safeParse({ data: r.data }) || {});
    const photoFrames = stmts.getAllPhotoFrames.all().map(r => safeParse({ data: r.data }) || {});

    // game_logos → key-value object
    const gameLogosRows = stmts.getAllGameLogos.all();
    const gameLogos = {};
    for (const r of gameLogosRows) {
        const parsed = safeParse({ data: r.data });
        if (parsed) gameLogos[r.key] = parsed;
    }

    const sources = safeParse(stmts.getSources.get()) || {};
    const fortuneData = safeParse(stmts.getFortune.get()) || {};
    const drawHistory = safeParse(stmts.getDrawHistory.get()) || {};

    return {
        superConfig,
        stores,
        analytics,
        tickets,
        centralAnnouncements,
        scratchLibrary,
        layoutLibrary,
        carouselLibrary,
        photoFrames,
        gameLogos,
        sources,
        fortuneData,
        drawHistory,
    };
}

// ── saveDB() — 将 JS 对象写回 SQLite ────────────────────────

function upsertLibrary(deleteStmt, insertStmt, items) {
    deleteStmt.run();
    if (!Array.isArray(items)) return;
    for (const item of items) {
        if (!item || !item.id) continue;
        insertStmt.run(item.id, JSON.stringify(item));
    }
}

function saveDB(data) {
    const txn = db.transaction(() => {
        // superConfig
        if (data.superConfig) {
            stmts.upsertSuperConfig.run(JSON.stringify(data.superConfig));
        }

        // stores
        stmts.deleteAllStores.run();
        if (Array.isArray(data.stores)) {
            for (const s of data.stores) {
                if (!s || !s.id) continue;
                stmts.insertStore.run(s.id, JSON.stringify(s));
            }
        }

        // analytics
        stmts.deleteAllAnalytics.run();
        if (data.analytics && typeof data.analytics === 'object') {
            for (const [storeId, stats] of Object.entries(data.analytics)) {
                stmts.insertAnalytics.run(
                    storeId,
                    stats.click_regular || 0,
                    stats.click_package || 0,
                    stats.share_count || 0,
                    stats.share_amount || 0
                );
            }
        }

        // tickets
        stmts.deleteAllTickets.run();
        if (Array.isArray(data.tickets)) {
            for (const t of data.tickets) {
                if (!t || !t.id) continue;
                stmts.insertTicket.run(
                    t.id, t.storeId, t.period, t.mode, t.type,
                    JSON.stringify(t.numbers), t.count, t.price, t.timestamp,
                    t.status, t.winAmount || 0, JSON.stringify(t.winLevel || [])
                );
            }
        }

        // libraries
        upsertLibrary(stmts.deleteAllAnnouncements, stmts.insertAnnouncement, data.centralAnnouncements);
        upsertLibrary(stmts.deleteAllScratch, stmts.insertScratch, data.scratchLibrary);
        upsertLibrary(stmts.deleteAllLayout, stmts.insertLayout, data.layoutLibrary);
        upsertLibrary(stmts.deleteAllCarousel, stmts.insertCarousel, data.carouselLibrary);
        upsertLibrary(stmts.deleteAllPhotoFrames, stmts.insertPhotoFrame, data.photoFrames);

        // game_logos — key-value object
        if (data.gameLogos && typeof data.gameLogos === 'object') {
            stmts.deleteAllGameLogos.run();
            for (const [key, val] of Object.entries(data.gameLogos)) {
                stmts.upsertGameLogo.run(key, JSON.stringify(val));
            }
        }

        // single-row data
        if (data.sources) stmts.upsertSources.run(JSON.stringify(data.sources));
        if (data.fortuneData) stmts.upsertFortune.run(JSON.stringify(data.fortuneData));
        if (data.drawHistory) stmts.upsertDrawHistory.run(JSON.stringify(data.drawHistory));
    });

    txn();
}

// ── JSON → SQLite migration ─────────────────────────────────

function migrateFromJSON(force) {
    if (!force) return;

    try {
        const raw = JSON.parse(fs.readFileSync(JSON_PATH, 'utf8'));

        // Ensure all expected keys exist
        raw.superConfig = raw.superConfig || {};
        raw.stores = raw.stores || [];
        raw.analytics = raw.analytics || {};
        raw.tickets = raw.tickets || [];
        raw.centralAnnouncements = raw.centralAnnouncements || [];
        raw.scratchLibrary = raw.scratchLibrary || [];
        raw.layoutLibrary = raw.layoutLibrary || [];
        raw.carouselLibrary = raw.carouselLibrary || [];
        raw.sources = raw.sources || {};
        raw.fortuneData = raw.fortuneData || {};
        raw.drawHistory = raw.drawHistory || {};

        saveDB(raw);

        const stats = fs.statSync(JSON_PATH);
        console.log(`[Migration] Done. Imported ${raw.stores.length} stores, ${raw.tickets.length} tickets from ${(stats.size / 1024 / 1024).toFixed(1)}MB JSON.`);
    } catch (e) {
        console.error('[Migration] Failed:', e.message);
        // Remove partial database so it can retry
        if (fs.existsSync(DB_PATH)) {
            fs.unlinkSync(DB_PATH);
        }
        throw e;
    }
}

// ── Default superConfig for fresh installs ──────────────────

function initDefaultData() {
    const existing = stmts.getSuperConfig.get();
    if (existing && existing.data && existing.data !== '{}') return;

    const defaultConfig = {
        platformName: '体彩大乐透智慧门店',
        superKey: 'super123',
        cronConfig: {
            days: [1, 3, 6],
            startHour: 21,
            startMinute: 25,
            endHour: 22,
            endMinute: 0,
            interval: 5,
            enabled: true
        },
        showCalculator: true,
        animationDuration: 5000,
        packageDuration: 30000,
        drawHistorySize: 6,
        scrollHoldMs: 3000,
        drawLogoMap: {},
        drawLogoOpacity: 0.18,
        managerTitleTemplates: ['店长', '先生', '女士'],
        availableTags: [
            { name: '全省投放', color: 'rgb(249, 115, 22)' },
            { name: '福州', color: 'rgb(59, 130, 246)' },
            { name: '厦门', color: 'rgb(239, 68, 68)' },
            { name: '泉州', color: 'rgb(16, 185, 129)' },
            { name: '待办', color: 'rgb(148, 163, 184)' }
        ],
        announcementConfig: {
            duration: 15,
            interval: 60,
            speed: 25,
            rounds: 99,
            intervalUnit: 's',
            type: 'RESIDENT'
        },
        logRetentionDays: 30,
    };

    stmts.upsertSuperConfig.run(JSON.stringify(defaultConfig));

    // Default store
    stmts.insertStore.run('default', JSON.stringify({
        id: 'default',
        name: '默认门店',
        adminKey: '888888',
        channel: 'tv',
        city: '福州',
        slogan: '快乐购彩，理性投注',
        status: 'open',
        features: { regular: true, package: true },
        gameConfig: { regulars: [], packages: [] },
        marquees: [],
        winnerReports: [],
    }));

    console.log('[DB] Initialized with default data');
}

// ── RBAC default seeding ─────────────────────────────────────

function initRBAC() {
    // Only seed if no roles exist yet
    const existingRoles = stmts.getAllRoles.all();
    if (existingRoles.length > 0) return;

    const now = Date.now();
    const crypto = require('crypto');

    // --- Default Departments ---
    const defaultDepts = [
        { id: 'dept_admin', name: '综合管理部', level: 'province', sort: 0 },
        { id: 'dept_market', name: '市场运营部', level: 'province', sort: 1 },
        { id: 'dept_tech', name: '技术运维部', level: 'province', sort: 2 },
        { id: 'dept_data', name: '数据监控部', level: 'province', sort: 3 },
        { id: 'dept_audit', name: '财务审计部', level: 'province', sort: 4 },
        { id: 'dept_store', name: '门店管理部', level: 'province', sort: 5 },
    ];
    for (const d of defaultDepts) {
        stmts.insertDept.run(d.id, d.name, d.level, null, null, null, d.sort, now, now);
    }

    // --- Permission helper ---
    const ALL_PERMS = {
        dashboard: ['view'],
        store_manage: ['view', 'edit', 'delete'],
        store_config: ['view', 'edit'],
        remote_control: ['view', 'edit'],
        announcements: ['view', 'edit', 'delete'],
        tickets: ['view', 'delete'],
        layout: ['view', 'edit', 'delete'],
        scratch: ['view', 'edit', 'delete'],
        draw_data: ['view', 'edit'],
        fortune: ['view', 'edit'],
        system_config: ['view', 'edit'],
        user_manage: ['view', 'edit', 'delete'],
        logs: ['view', 'delete'],
        carousel: ['view', 'edit', 'delete'],
    };

    const viewOnly = (keys) => {
        const p = {};
        for (const k of keys) p[k] = ['view'];
        return p;
    };

    // --- Default Roles ---
    const defaultRoles = [
        {
            id: 'role_super', name: '超级管理员', level: 'super',
            desc: '系统最高权限，全部功能访问',
            perms: ALL_PERMS,
        },
        {
            id: 'role_province', name: '省级管理员', level: 'province',
            desc: '省级管理，除用户管理和系统设置外全部权限',
            perms: { ...ALL_PERMS, user_manage: ['view'], system_config: ['view'] },
        },
        {
            id: 'role_city', name: '市级管理员', level: 'city',
            desc: '管辖本市门店，仅限本市数据',
            perms: {
                dashboard: ['view'],
                store_manage: ['view', 'edit'],
                store_config: ['view', 'edit'],
                remote_control: ['view', 'edit'],
                announcements: ['view', 'edit'],
                tickets: ['view'],
                logs: ['view'],
            },
        },
        {
            id: 'role_store', name: '门店店长', level: 'store',
            desc: '通过前端隐藏入口登录，管理本店配置',
            perms: {
                dashboard: ['view'],
                store_config: ['view', 'edit'],
                tickets: ['view'],
                logs: ['view'],
            },
        },
        {
            id: 'role_tech', name: '技术运维', level: 'province',
            desc: '系统维护、远程控制、布局配置',
            perms: {
                dashboard: ['view'],
                remote_control: ['view', 'edit'],
                layout: ['view', 'edit', 'delete'],
                draw_data: ['view', 'edit'],
                system_config: ['view', 'edit'],
                logs: ['view', 'delete'],
                carousel: ['view', 'edit', 'delete'],
            },
        },
        {
            id: 'role_analyst', name: '数据分析员', level: 'province',
            desc: '查看数据看板和报表，只读权限',
            perms: viewOnly(['dashboard', 'tickets', 'draw_data', 'logs']),
        },
        {
            id: 'role_auditor', name: '审计监察员', level: 'province',
            desc: '全模块只读访问，用于合规审计',
            perms: viewOnly(Object.keys(ALL_PERMS)),
        },
    ];

    for (const r of defaultRoles) {
        stmts.insertRole.run(r.id, r.name, r.level, r.desc, JSON.stringify(r.perms), 1, now, now);
    }

    // --- Default super admin account ---
    // Password: admin888 (bcrypt hash generated at build time)
    const bcrypt = require('bcryptjs');
    const hash = bcrypt.hashSync('admin888', 10);
    const adminId = crypto.randomUUID();
    stmts.insertAdminUser.run(
        adminId, 'admin', hash, '系统管理员', '',
        'role_super', 'dept_admin', '', '', 1,
        null, '', now, now
    );

    console.log('[RBAC] Seeded 6 departments, 7 roles, 1 super admin (admin / admin888)');
}

// ── Public API ──────────────────────────────────────────────

function initDatabase() {
    // Check if migration is needed BEFORE opening/creating the database
    const shouldMigrate = fs.existsSync(JSON_PATH) && !fs.existsSync(DB_PATH);

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('synchronous = NORMAL');
    db.pragma('foreign_keys = ON');

    // Create tables
    db.exec(SCHEMA_SQL);

    // Prepare cached statements
    prepareStatements();

    // Migrate from JSON if needed
    migrateFromJSON(shouldMigrate);

    // Initialize defaults for fresh install
    initDefaultData();

    // Seed RBAC defaults (roles, departments, super admin)
    initRBAC();

    console.log('[DB] SQLite ready at', DB_PATH);
}

function getStmts() { return stmts; }

module.exports = { getDB, saveDB, initDatabase, getStmts };
