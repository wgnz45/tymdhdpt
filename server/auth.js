/**
 * server/auth.js — JWT 认证 + 权限校验 + 操作日志
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { getStmts } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'tymdhdpt_jwt_secret_2026_v1';
const JWT_EXPIRES = '8h';
const LOGIN_FAIL_LIMIT = 5;
const LOGIN_LOCK_MS = 30 * 60 * 1000; // 30 minutes

// In-memory login fail tracking
const loginFailMap = new Map(); // username -> { count, lockedUntil }

// ── Password validation ──────────────────────────────────────

function validatePassword(pw) {
    if (!pw || pw.length < 8) return '密码长度不能少于8位';
    if (!/[a-zA-Z]/.test(pw)) return '密码必须包含字母';
    if (!/[0-9]/.test(pw)) return '密码必须包含数字';
    return null;
}

function hashPassword(pw) {
    return bcrypt.hashSync(pw, 10);
}

function verifyPassword(pw, hash) {
    return bcrypt.compareSync(pw, hash);
}

// ── JWT helpers ──────────────────────────────────────────────

function signToken(payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
}

// ── Login rate limiting ──────────────────────────────────────

function checkLoginLock(username) {
    const info = loginFailMap.get(username);
    if (!info) return null;
    if (info.lockedUntil && Date.now() < info.lockedUntil) {
        const mins = Math.ceil((info.lockedUntil - Date.now()) / 60000);
        return `账号已锁定，请${mins}分钟后重试`;
    }
    if (info.lockedUntil && Date.now() >= info.lockedUntil) {
        loginFailMap.delete(username);
    }
    return null;
}

function recordLoginFail(username) {
    const info = loginFailMap.get(username) || { count: 0, lockedUntil: null };
    info.count++;
    if (info.count >= LOGIN_FAIL_LIMIT) {
        info.lockedUntil = Date.now() + LOGIN_LOCK_MS;
        info.count = 0;
    }
    loginFailMap.set(username, info);
}

function clearLoginFail(username) {
    loginFailMap.delete(username);
}

// ── Express middleware: authenticate JWT ──────────────────────

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '未登录' });
    }
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ error: '登录已过期，请重新登录' });
    }

    // Attach user info to request
    const stmts = getStmts();
    const user = stmts.getAdminById.get(decoded.userId);
    if (!user) {
        return res.status(401).json({ error: '用户不存在' });
    }
    if (user.status !== 1) {
        return res.status(403).json({ error: '账号已被禁用' });
    }
    const role = stmts.getRoleById.get(user.role_id);
    if (!role) {
        return res.status(403).json({ error: '角色不存在' });
    }

    req.user = {
        id: user.id,
        username: user.username,
        realName: user.real_name,
        roleId: user.role_id,
        roleName: role.name,
        roleLevel: role.level,
        permissions: JSON.parse(role.permissions || '{}'),
        city: user.city || '',
        storeId: user.store_id || '',
        deptId: user.dept_id || '',
    };
    next();
}

// ── Permission check: requirePerm('module', 'action') ────────

function requirePerm(module, action) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: '未登录' });
        }
        const perms = req.user.permissions;
        if (!perms[module] || !perms[module].includes(action)) {
            return res.status(403).json({ error: '权限不足' });
        }
        next();
    };
}

// ── Also allow legacy superKey auth (backward compatibility) ──

function superKeyOrAuth(req, res, next) {
    // Check JWT first
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        return authMiddleware(req, res, next);
    }
    // Fallback to superKey in body or query
    const { getDB } = require('./db');
    const db = getDB();
    const superKey = req.body?.superKey || req.query?.superKey;
    if (superKey && superKey === db.superConfig.superKey) {
        req.user = {
            id: 'legacy_super',
            username: 'superKey',
            realName: '超级管理员(旧)',
            roleId: 'role_super',
            roleName: '超级管理员',
            roleLevel: 'super',
            permissions: JSON.parse('{"dashboard":["view"],"store_manage":["view","edit","delete"],"store_config":["view","edit"],"remote_control":["view","edit"],"announcements":["view","edit","delete"],"tickets":["view","delete"],"layout":["view","edit","delete"],"scratch":["view","edit","delete"],"draw_data":["view","edit"],"fortune":["view","edit"],"system_config":["view","edit"],"user_manage":["view","edit","delete"],"logs":["view","delete"],"carousel":["view","edit","delete"]}'),
            city: '',
            storeId: '',
        };
        return next();
    }
    return res.status(401).json({ error: '未登录或密钥错误' });
}

// ── Admin log helper ─────────────────────────────────────────

function adminLog(user, action, module, target, detail, ip) {
    try {
        const stmts = getStmts();
        stmts.insertAdminLog.run(
            user?.id || 'unknown',
            user?.username || 'unknown',
            user?.realName || '',
            user?.roleName || '',
            action,
            module || '',
            target || '',
            detail || '',
            ip || '',
            Date.now()
        );
    } catch (e) {
        console.error('[AdminLog] Write failed:', e.message);
    }
}

// ── Get client IP helper ─────────────────────────────────────

function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0]?.trim()
        || req.headers['x-real-ip']
        || req.socket?.remoteAddress
        || '';
}

module.exports = {
    validatePassword,
    hashPassword,
    verifyPassword,
    signToken,
    verifyToken,
    checkLoginLock,
    recordLoginFail,
    clearLoginFail,
    authMiddleware,
    requirePerm,
    superKeyOrAuth,
    adminLog,
    getClientIP,
};
