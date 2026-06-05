/**
 * server/rbac.js — RBAC API 路由
 *
 * 登录/登出、用户管理、角色管理、部门管理、操作日志查询
 */

const express = require('express');
const crypto = require('crypto');
const { getStmts, getDB } = require('./db');
const {
    validatePassword, hashPassword, verifyPassword,
    signToken, checkLoginLock, recordLoginFail, clearLoginFail,
    authMiddleware, requirePerm, adminLog, getClientIP,
} = require('./auth');

const router = express.Router();

// ════════════════════════════════════════════════════════════
//  AUTH: Login / Logout / Me
// ════════════════════════════════════════════════════════════

router.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: '请输入用户名和密码' });
    }

    const lockMsg = checkLoginLock(username);
    if (lockMsg) return res.status(429).json({ error: lockMsg });

    const stmts = getStmts();
    const user = stmts.getAdminByUsername.get(username);
    if (!user) {
        recordLoginFail(username);
        return res.status(401).json({ error: '用户名或密码错误' });
    }
    if (user.status !== 1) {
        return res.status(403).json({ error: '账号已被禁用，请联系管理员' });
    }
    if (!verifyPassword(password, user.password_hash)) {
        recordLoginFail(username);
        return res.status(401).json({ error: '用户名或密码错误' });
    }

    clearLoginFail(username);

    const role = stmts.getRoleById.get(user.role_id);
    const ip = getClientIP(req);

    // Update last login
    stmts.updateAdminLogin.run(Date.now(), ip, user.id);

    // Sign JWT
    const token = signToken({
        userId: user.id,
        username: user.username,
        roleId: user.role_id,
    });

    // Log login
    adminLog(
        { id: user.id, username: user.username, realName: user.real_name, roleName: role?.name || '' },
        'login', 'auth', '', '登录成功', ip
    );

    res.json({
        success: true,
        token,
        user: {
            id: user.id,
            username: user.username,
            realName: user.real_name,
            phone: user.phone,
            roleId: user.role_id,
            roleName: role?.name || '',
            roleLevel: role?.level || '',
            permissions: JSON.parse(role?.permissions || '{}'),
            city: user.city || '',
            storeId: user.store_id || '',
            deptId: user.dept_id || '',
        },
    });
});

router.get('/me', authMiddleware, (req, res) => {
    res.json({ success: true, user: req.user });
});

router.post('/change-password', authMiddleware, (req, res) => {
    const { oldPassword, newPassword } = req.body;
    const stmts = getStmts();
    const user = stmts.getAdminById.get(req.user.id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    if (!verifyPassword(oldPassword, user.password_hash)) {
        return res.status(400).json({ error: '原密码错误' });
    }
    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const hash = hashPassword(newPassword);
    stmts.insertAdminUser.run(
        user.id, user.username, hash, user.real_name, user.phone,
        user.role_id, user.dept_id, user.city, user.store_id, user.status,
        user.last_login_at, user.last_login_ip, user.created_at, Date.now()
    );

    adminLog(req.user, 'update', 'auth', req.user.id, '修改密码', getClientIP(req));
    res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
//  USERS CRUD
// ════════════════════════════════════════════════════════════

router.get('/users', authMiddleware, requirePerm('user_manage', 'view'), (req, res) => {
    const stmts = getStmts();
    const users = stmts.getAllAdminUsers.all();
    const roles = stmts.getAllRoles.all();
    const roleMap = {};
    for (const r of roles) roleMap[r.id] = r.name;

    res.json({
        success: true,
        users: users.map(u => ({
            ...u,
            roleName: roleMap[u.role_id] || '未知',
        })),
    });
});

router.post('/users', authMiddleware, requirePerm('user_manage', 'edit'), (req, res) => {
    const { username, password, realName, phone, roleId, deptId, city, storeId } = req.body;
    if (!username || !password || !realName || !roleId) {
        return res.status(400).json({ error: '请填写必填字段（用户名、密码、姓名、角色）' });
    }
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const stmts = getStmts();
    if (stmts.getAdminByUsername.get(username)) {
        return res.status(400).json({ error: '用户名已存在' });
    }
    if (!stmts.getRoleById.get(roleId)) {
        return res.status(400).json({ error: '角色不存在' });
    }

    const now = Date.now();
    const id = crypto.randomUUID();
    const hash = hashPassword(password);

    stmts.insertAdminUser.run(
        id, username, hash, realName, phone || '', roleId, deptId || '',
        city || '', storeId || '', 1, null, '', now, now
    );

    adminLog(req.user, 'create', 'user_manage', id, `创建用户: ${username} (${realName})`, getClientIP(req));
    res.json({ success: true, id });
});

router.put('/users/:id', authMiddleware, requirePerm('user_manage', 'edit'), (req, res) => {
    const { id } = req.params;
    const { realName, phone, roleId, deptId, city, storeId, password } = req.body;
    const stmts = getStmts();
    const user = stmts.getAdminById.get(id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    let hash = user.password_hash;
    if (password) {
        const pwErr = validatePassword(password);
        if (pwErr) return res.status(400).json({ error: pwErr });
        hash = hashPassword(password);
    }

    stmts.insertAdminUser.run(
        user.id, user.username, hash,
        realName || user.real_name,
        phone !== undefined ? phone : user.phone,
        roleId || user.role_id,
        deptId !== undefined ? deptId : user.dept_id,
        city !== undefined ? city : user.city,
        storeId !== undefined ? storeId : user.store_id,
        user.status, user.last_login_at, user.last_login_ip,
        user.created_at, Date.now()
    );

    adminLog(req.user, 'update', 'user_manage', id, `编辑用户: ${user.username}`, getClientIP(req));
    res.json({ success: true });
});

router.post('/users/:id/toggle-status', authMiddleware, requirePerm('user_manage', 'edit'), (req, res) => {
    const { id } = req.params;
    const stmts = getStmts();
    const user = stmts.getAdminById.get(id);
    if (!user) return res.status(404).json({ error: '用户不存在' });

    const newStatus = user.status === 1 ? 0 : 1;
    stmts.updateAdminStatus.run(newStatus, Date.now(), id);

    const action = newStatus === 1 ? '启用' : '禁用';
    adminLog(req.user, 'update', 'user_manage', id, `${action}用户: ${user.username}`, getClientIP(req));
    res.json({ success: true, status: newStatus });
});

router.delete('/users/:id', authMiddleware, requirePerm('user_manage', 'delete'), (req, res) => {
    const { id } = req.params;
    const stmts = getStmts();
    const user = stmts.getAdminById.get(id);
    if (!user) return res.status(404).json({ error: '用户不存在' });
    if (user.username === 'admin') {
        return res.status(400).json({ error: '不能删除系统管理员账号' });
    }

    stmts.deleteAdminUser.run(id);
    adminLog(req.user, 'delete', 'user_manage', id, `删除用户: ${user.username}`, getClientIP(req));
    res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
//  ROLES CRUD
// ════════════════════════════════════════════════════════════

router.get('/roles', authMiddleware, requirePerm('user_manage', 'view'), (req, res) => {
    const stmts = getStmts();
    const roles = stmts.getAllRoles.all().map(r => ({
        ...r,
        permissions: JSON.parse(r.permissions || '{}'),
    }));
    res.json({ success: true, roles });
});

router.post('/roles', authMiddleware, requirePerm('user_manage', 'edit'), (req, res) => {
    const { name, level, description, permissions } = req.body;
    if (!name || !permissions) {
        return res.status(400).json({ error: '请填写角色名称和权限' });
    }
    const stmts = getStmts();
    const now = Date.now();
    const id = 'role_' + crypto.randomUUID().slice(0, 8);

    stmts.insertRole.run(id, name, level || 'province', description || '',
        JSON.stringify(permissions), 0, now, now);

    adminLog(req.user, 'create', 'user_manage', id, `创建角色: ${name}`, getClientIP(req));
    res.json({ success: true, id });
});

router.put('/roles/:id', authMiddleware, requirePerm('user_manage', 'edit'), (req, res) => {
    const { id } = req.params;
    const stmts = getStmts();
    const role = stmts.getRoleById.get(id);
    if (!role) return res.status(404).json({ error: '角色不存在' });

    const { name, level, description, permissions } = req.body;
    stmts.insertRole.run(
        role.id,
        name || role.name,
        level || role.level,
        description !== undefined ? description : role.description,
        permissions ? JSON.stringify(permissions) : role.permissions,
        role.is_system,
        role.created_at,
        Date.now()
    );

    adminLog(req.user, 'update', 'user_manage', id, `编辑角色: ${name || role.name}`, getClientIP(req));
    res.json({ success: true });
});

router.delete('/roles/:id', authMiddleware, requirePerm('user_manage', 'delete'), (req, res) => {
    const { id } = req.params;
    const stmts = getStmts();
    const role = stmts.getRoleById.get(id);
    if (!role) return res.status(404).json({ error: '角色不存在' });
    if (role.is_system) return res.status(400).json({ error: '系统内置角色不可删除' });

    const usersCount = stmts.countAdminsByRole.get(id);
    if (usersCount && usersCount.cnt > 0) {
        return res.status(400).json({ error: `该角色下有 ${usersCount.cnt} 个用户，请先迁移` });
    }

    stmts.deleteRole.run(id);
    adminLog(req.user, 'delete', 'user_manage', id, `删除角色: ${role.name}`, getClientIP(req));
    res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
//  DEPARTMENTS CRUD
// ════════════════════════════════════════════════════════════

router.get('/departments', authMiddleware, requirePerm('user_manage', 'view'), (req, res) => {
    const stmts = getStmts();
    const depts = stmts.getAllDepts.all();
    res.json({ success: true, departments: depts });
});

router.post('/departments', authMiddleware, requirePerm('user_manage', 'edit'), (req, res) => {
    const { name, level, city, storeId, parentId } = req.body;
    if (!name) return res.status(400).json({ error: '请填写部门名称' });

    const stmts = getStmts();
    const now = Date.now();
    const id = 'dept_' + crypto.randomUUID().slice(0, 8);

    stmts.insertDept.run(id, name, level || 'province', city || null, storeId || null,
        parentId || null, 99, now, now);

    adminLog(req.user, 'create', 'user_manage', id, `创建部门: ${name}`, getClientIP(req));
    res.json({ success: true, id });
});

router.put('/departments/:id', authMiddleware, requirePerm('user_manage', 'edit'), (req, res) => {
    const { id } = req.params;
    const stmts = getStmts();
    const dept = stmts.getDeptById.get(id);
    if (!dept) return res.status(404).json({ error: '部门不存在' });

    const { name, level, city, storeId, parentId, sortOrder } = req.body;
    stmts.insertDept.run(
        dept.id,
        name || dept.name,
        level || dept.level,
        city !== undefined ? city : dept.city,
        storeId !== undefined ? storeId : dept.store_id,
        parentId !== undefined ? parentId : dept.parent_id,
        sortOrder !== undefined ? sortOrder : dept.sort_order,
        dept.created_at,
        Date.now()
    );

    adminLog(req.user, 'update', 'user_manage', id, `编辑部门: ${name || dept.name}`, getClientIP(req));
    res.json({ success: true });
});

router.delete('/departments/:id', authMiddleware, requirePerm('user_manage', 'delete'), (req, res) => {
    const { id } = req.params;
    const stmts = getStmts();
    const dept = stmts.getDeptById.get(id);
    if (!dept) return res.status(404).json({ error: '部门不存在' });

    const usersCount = stmts.countAdminsByDept.get(id);
    if (usersCount && usersCount.cnt > 0) {
        return res.status(400).json({ error: `该部门下有 ${usersCount.cnt} 个用户，请先迁移` });
    }

    stmts.deleteDept.run(id);
    adminLog(req.user, 'delete', 'user_manage', id, `删除部门: ${dept.name}`, getClientIP(req));
    res.json({ success: true });
});

// ════════════════════════════════════════════════════════════
//  ADMIN LOGS
// ════════════════════════════════════════════════════════════

router.get('/admin-logs', authMiddleware, requirePerm('logs', 'view'), (req, res) => {
    const { userId, module: mod, limit: lim } = req.query;
    const stmts = getStmts();
    const limit = Math.min(500, Math.max(1, parseInt(lim) || 200));

    let logs;
    if (userId) {
        logs = stmts.getAdminLogsByUser.all(userId, limit);
    } else if (mod) {
        logs = stmts.getAdminLogsByModule.all(mod, limit);
    } else {
        logs = stmts.getAdminLogs.all(limit);
    }

    res.json({ success: true, logs });
});

router.post('/admin-logs/clean', authMiddleware, requirePerm('logs', 'delete'), (req, res) => {
    const { olderThanDays } = req.body;
    const days = parseInt(olderThanDays) || 90;
    const cutoff = Date.now() - days * 86400000;
    const stmts = getStmts();
    const result = stmts.deleteOldAdminLogs.run(cutoff);

    adminLog(req.user, 'delete', 'logs', '', `清理操作日志: 删除${days}天前共${result.changes}条`, getClientIP(req));
    res.json({ success: true, deleted: result.changes });
});

// ════════════════════════════════════════════════════════════
//  PERMISSION MODULES DEFINITION (for frontend rendering)
// ════════════════════════════════════════════════════════════

router.get('/permission-modules', authMiddleware, (req, res) => {
    res.json({
        success: true,
        modules: [
            { key: 'dashboard', name: '数据看板', actions: ['view'] },
            { key: 'store_manage', name: '门店管理', actions: ['view', 'edit', 'delete'] },
            { key: 'store_config', name: '门店配置', actions: ['view', 'edit'] },
            { key: 'remote_control', name: '远程控制', actions: ['view', 'edit'] },
            { key: 'announcements', name: '公告管理', actions: ['view', 'edit', 'delete'] },
            { key: 'tickets', name: '票据管理', actions: ['view', 'delete'] },
            { key: 'layout', name: '布局管理', actions: ['view', 'edit', 'delete'] },
            { key: 'scratch', name: '刮刮乐', actions: ['view', 'edit', 'delete'] },
            { key: 'draw_data', name: '开奖数据', actions: ['view', 'edit'] },
            { key: 'system_config', name: '系统设置', actions: ['view', 'edit'] },
            { key: 'user_manage', name: '用户管理', actions: ['view', 'edit', 'delete'] },
            { key: 'logs', name: '日志管理', actions: ['view', 'delete'] },
            { key: 'carousel', name: '轮播管理', actions: ['view', 'edit', 'delete'] },
        ],
    });
});

module.exports = router;
