import React, { useState, useEffect, useMemo } from 'react';
import {
    Users, Shield, Building2, ScrollText, Plus, Trash2, Edit3, X, Check,
    Eye, EyeOff, Search, ChevronDown, Ban, CheckCircle2, KeyRound
} from 'lucide-react';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';

const FUJIAN_CITIES = ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'];
const LEVEL_LABELS = { super: '超级', province: '省级', city: '市级', store: '门店' };
const ACTION_LABELS = { view: '查看', edit: '编辑', delete: '删除' };

function getToken() { return sessionStorage.getItem('adminToken') || ''; }
function authHeaders(extra = {}) {
    return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}`, ...extra };
}

export default function RBACManager() {
    const [tab, setTab] = useState('users');
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [depts, setDepts] = useState([]);
    const [logs, setLogs] = useState([]);
    const [permModules, setPermModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');
    const [confirm, setConfirm] = useState({ open: false });

    // Edit states
    const [editUser, setEditUser] = useState(null);
    const [editRole, setEditRole] = useState(null);
    const [editDept, setEditDept] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPw, setShowPw] = useState(false);

    const showMsg = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000); };

    // Load data
    const loadUsers = () => fetch('/api/rbac/users', { headers: authHeaders() }).then(r => r.json()).then(d => d.success && setUsers(d.users || [])).catch(() => {});
    const loadRoles = () => fetch('/api/rbac/roles', { headers: authHeaders() }).then(r => r.json()).then(d => d.success && setRoles(d.roles || [])).catch(() => {});
    const loadDepts = () => fetch('/api/rbac/departments', { headers: authHeaders() }).then(r => r.json()).then(d => d.success && setDepts(d.departments || [])).catch(() => {});
    const loadLogs = () => fetch('/api/rbac/admin-logs?limit=200', { headers: authHeaders() }).then(r => r.json()).then(d => d.success && setLogs(d.logs || [])).catch(() => {});
    const loadPermModules = () => fetch('/api/rbac/permission-modules', { headers: authHeaders() }).then(r => r.json()).then(d => d.success && setPermModules(d.modules || [])).catch(() => {});

    useEffect(() => {
        setLoading(true);
        Promise.all([loadUsers(), loadRoles(), loadDepts(), loadLogs(), loadPermModules()])
            .finally(() => setLoading(false));
    }, []);

    const roleMap = useMemo(() => {
        const m = {};
        for (const r of roles) m[r.id] = r;
        return m;
    }, [roles]);
    const deptMap = useMemo(() => {
        const m = {};
        for (const d of depts) m[d.id] = d;
        return m;
    }, [depts]);

    const filteredUsers = useMemo(() => {
        if (!searchQuery) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u =>
            (u.username || '').toLowerCase().includes(q) ||
            (u.real_name || '').toLowerCase().includes(q) ||
            (u.roleName || '').toLowerCase().includes(q)
        );
    }, [users, searchQuery]);

    // ── User CRUD ──────────────────────────────────────────

    const saveUser = async () => {
        if (!editUser) return;
        const isNew = !editUser.id;
        const url = isNew ? '/api/rbac/users' : `/api/rbac/users/${editUser.id}`;
        const method = isNew ? 'POST' : 'PUT';
        const body = {
            username: editUser.username,
            realName: editUser.real_name,
            phone: editUser.phone || '',
            roleId: editUser.role_id,
            deptId: editUser.dept_id || '',
            city: editUser.city || '',
            storeId: editUser.store_id || '',
        };
        if (editUser.password) body.password = editUser.password;
        try {
            const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(body) });
            const data = await res.json();
            if (data.success || data.id) {
                showMsg(isNew ? '用户创建成功' : '用户更新成功');
                setEditUser(null);
                loadUsers();
                loadLogs();
            } else {
                showMsg(data.error || '操作失败');
            }
        } catch { showMsg('网络错误'); }
    };

    const toggleUserStatus = async (user) => {
        const res = await fetch(`/api/rbac/users/${user.id}/toggle-status`, { method: 'POST', headers: authHeaders() });
        const data = await res.json();
        if (data.success) { loadUsers(); loadLogs(); showMsg(data.status === 1 ? '已启用' : '已禁用'); }
    };

    const deleteUser = async (user) => {
        const res = await fetch(`/api/rbac/users/${user.id}`, { method: 'DELETE', headers: authHeaders() });
        const data = await res.json();
        if (data.success) { loadUsers(); loadLogs(); showMsg('已删除'); }
        else showMsg(data.error || '删除失败');
    };

    // ── Role CRUD ──────────────────────────────────────────

    const saveRole = async () => {
        if (!editRole) return;
        const isNew = !editRole.id;
        const url = isNew ? '/api/rbac/roles' : `/api/rbac/roles/${editRole.id}`;
        const method = isNew ? 'POST' : 'PUT';
        try {
            const res = await fetch(url, {
                method, headers: authHeaders(),
                body: JSON.stringify({
                    name: editRole.name,
                    level: editRole.level || 'province',
                    description: editRole.description || '',
                    permissions: editRole.permissions || {},
                }),
            });
            const data = await res.json();
            if (data.success || data.id) {
                showMsg(isNew ? '角色创建成功' : '角色更新成功');
                setEditRole(null);
                loadRoles();
                loadLogs();
            } else showMsg(data.error || '操作失败');
        } catch { showMsg('网络错误'); }
    };

    const deleteRole = async (role) => {
        const res = await fetch(`/api/rbac/roles/${role.id}`, { method: 'DELETE', headers: authHeaders() });
        const data = await res.json();
        if (data.success) { loadRoles(); loadLogs(); showMsg('已删除'); }
        else showMsg(data.error || '删除失败');
    };

    // ── Dept CRUD ──────────────────────────────────────────

    const saveDept = async () => {
        if (!editDept) return;
        const isNew = !editDept.id;
        const url = isNew ? '/api/rbac/departments' : `/api/rbac/departments/${editDept.id}`;
        const method = isNew ? 'POST' : 'PUT';
        try {
            const res = await fetch(url, {
                method, headers: authHeaders(),
                body: JSON.stringify({ name: editDept.name, level: editDept.level || 'province', city: editDept.city || '' }),
            });
            const data = await res.json();
            if (data.success || data.id) {
                showMsg(isNew ? '部门创建成功' : '部门更新成功');
                setEditDept(null);
                loadDepts();
                loadLogs();
            } else showMsg(data.error || '操作失败');
        } catch { showMsg('网络错误'); }
    };

    const deleteDept = async (dept) => {
        const res = await fetch(`/api/rbac/departments/${dept.id}`, { method: 'DELETE', headers: authHeaders() });
        const data = await res.json();
        if (data.success) { loadDepts(); loadLogs(); showMsg('已删除'); }
        else showMsg(data.error || '删除失败');
    };

    const fmtTime = (ts) => ts ? new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '-';

    // ── Permission editor helper ──────────────────────────

    const togglePerm = (mod, action) => {
        if (!editRole) return;
        const perms = { ...editRole.permissions };
        if (!perms[mod]) perms[mod] = [];
        else perms[mod] = [...perms[mod]];
        const idx = perms[mod].indexOf(action);
        if (idx >= 0) {
            perms[mod].splice(idx, 1);
            if (perms[mod].length === 0) delete perms[mod];
        } else {
            perms[mod].push(action);
        }
        setEditRole({ ...editRole, permissions: perms });
    };

    const tabs = [
        { key: 'users', label: '用户管理', icon: Users },
        { key: 'roles', label: '角色管理', icon: Shield },
        { key: 'depts', label: '部门管理', icon: Building2 },
        { key: 'logs', label: '操作日志', icon: ScrollText },
    ];

    return (
        <PageContainer>
            <ConfirmDialog open={confirm.open} title={confirm.title} message={confirm.message}
                confirmLabel="确认" danger onConfirm={confirm.onConfirm || (() => {})}
                onCancel={() => setConfirm({ open: false })} />

            {message && (
                <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5 bg-slate-800 text-white text-sm rounded-xl shadow-lg animate-in slide-in-from-top-4">
                    {message}
                </div>
            )}

            <PageHeader icon={Shield} title="权限管理" description="用户、角色、部门和操作日志" />

            <div className="flex gap-2 mb-5">
                {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                        className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t.key ? 'bg-[#1e3a5f] text-white shadow-md' : 'bg-white text-slate-500 border border-slate-200 hover:bg-slate-50'}`}>
                        <t.icon size={14} />
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ═══ USERS TAB ═══ */}
            {tab === 'users' && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 flex-1">
                            <div className="relative flex-1 max-w-xs">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                    placeholder="搜索用户..." className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                        </div>
                        <button onClick={() => setEditUser({ username: '', real_name: '', phone: '', password: '', role_id: roles[0]?.id || '', dept_id: '', city: '', store_id: '' })}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#163050] transition-colors">
                            <Plus size={14} /> 新建用户
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase">
                                    <th className="pb-3 px-3 font-medium">用户名</th>
                                    <th className="pb-3 px-3 font-medium">姓名</th>
                                    <th className="pb-3 px-3 font-medium">角色</th>
                                    <th className="pb-3 px-3 font-medium">部门</th>
                                    <th className="pb-3 px-3 font-medium">城市</th>
                                    <th className="pb-3 px-3 font-medium">状态</th>
                                    <th className="pb-3 px-3 font-medium">最后登录</th>
                                    <th className="pb-3 px-3 font-medium text-right">操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredUsers.map(u => (
                                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-25">
                                        <td className="py-3 px-3 font-mono text-xs">{u.username}</td>
                                        <td className="py-3 px-3 font-medium">{u.real_name}</td>
                                        <td className="py-3 px-3">
                                            <span className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-xs font-medium">{u.roleName}</span>
                                        </td>
                                        <td className="py-3 px-3 text-slate-500 text-xs">{deptMap[u.dept_id]?.name || '-'}</td>
                                        <td className="py-3 px-3 text-slate-500 text-xs">{u.city || '-'}</td>
                                        <td className="py-3 px-3">
                                            {u.status === 1
                                                ? <span className="flex items-center gap-1 text-emerald-600 text-xs"><CheckCircle2 size={12} /> 正常</span>
                                                : <span className="flex items-center gap-1 text-red-500 text-xs"><Ban size={12} /> 已禁用</span>}
                                        </td>
                                        <td className="py-3 px-3 text-slate-400 text-xs">{fmtTime(u.last_login_at)}</td>
                                        <td className="py-3 px-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <button onClick={() => setEditUser({ ...u, password: '' })}
                                                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={13} /></button>
                                                <button onClick={() => toggleUserStatus(u)}
                                                    className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                    {u.status === 1 ? <Ban size={13} /> : <CheckCircle2 size={13} />}
                                                </button>
                                                {u.username !== 'admin' && (
                                                    <button onClick={() => setConfirm({ open: true, title: '删除用户', message: `确认删除用户 "${u.real_name}" (${u.username})？`, onConfirm: () => { deleteUser(u); setConfirm({ open: false }); } })}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={13} /></button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredUsers.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-slate-400 text-sm">暂无用户数据</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* ═══ ROLES TAB ═══ */}
            {tab === 'roles' && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-700">共 {roles.length} 个角色</h3>
                        <button onClick={() => setEditRole({ name: '', level: 'province', description: '', permissions: {} })}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#163050] transition-colors">
                            <Plus size={14} /> 新建角色
                        </button>
                    </div>
                    <div className="grid gap-3">
                        {roles.map(r => (
                            <div key={r.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm text-slate-800">{r.name}</span>
                                        <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] font-medium">{LEVEL_LABELS[r.level] || r.level}</span>
                                        {r.is_system === 1 && <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px] font-medium">系统内置</span>}
                                    </div>
                                    <p className="text-xs text-slate-400 mt-1">{r.description || '无描述'}</p>
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        {Object.entries(r.permissions || {}).map(([mod, acts]) => (
                                            <span key={mod} className="px-1.5 py-0.5 bg-white border border-slate-200 rounded text-[10px] text-slate-600">
                                                {permModules.find(m => m.key === mod)?.name || mod}: {acts.map(a => ACTION_LABELS[a] || a).join('/')}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 ml-3">
                                    <button onClick={() => setEditRole({ ...r })}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                                    {!r.is_system && (
                                        <button onClick={() => setConfirm({ open: true, title: '删除角色', message: `确认删除角色 "${r.name}"？`, onConfirm: () => { deleteRole(r); setConfirm({ open: false }); } })}
                                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* ═══ DEPARTMENTS TAB ═══ */}
            {tab === 'depts' && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-700">共 {depts.length} 个部门</h3>
                        <button onClick={() => setEditDept({ name: '', level: 'province', city: '' })}
                            className="flex items-center gap-1.5 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#163050] transition-colors">
                            <Plus size={14} /> 新建部门
                        </button>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {depts.map(d => (
                            <div key={d.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <div>
                                    <div className="font-semibold text-sm text-slate-800">{d.name}</div>
                                    <div className="text-xs text-slate-400 mt-0.5">{LEVEL_LABELS[d.level] || d.level}{d.city ? ` · ${d.city}` : ''}</div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button onClick={() => setEditDept({ ...d })}
                                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit3 size={14} /></button>
                                    <button onClick={() => setConfirm({ open: true, title: '删除部门', message: `确认删除部门 "${d.name}"？`, onConfirm: () => { deleteDept(d); setConfirm({ open: false }); } })}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            )}

            {/* ═══ ADMIN LOGS TAB ═══ */}
            {tab === 'logs' && (
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-semibold text-slate-700">最近 {logs.length} 条操作日志</h3>
                        <button onClick={loadLogs} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-200 transition-colors">
                            刷新
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-slate-100 text-left text-xs text-slate-400 uppercase">
                                    <th className="pb-3 px-3 font-medium">时间</th>
                                    <th className="pb-3 px-3 font-medium">操作人</th>
                                    <th className="pb-3 px-3 font-medium">角色</th>
                                    <th className="pb-3 px-3 font-medium">操作</th>
                                    <th className="pb-3 px-3 font-medium">模块</th>
                                    <th className="pb-3 px-3 font-medium">详情</th>
                                    <th className="pb-3 px-3 font-medium">IP</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map(l => (
                                    <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-25">
                                        <td className="py-2.5 px-3 text-xs text-slate-400 whitespace-nowrap">{fmtTime(l.created_at)}</td>
                                        <td className="py-2.5 px-3 font-medium text-xs">{l.real_name || l.username}</td>
                                        <td className="py-2.5 px-3 text-xs text-slate-500">{l.role_name || '-'}</td>
                                        <td className="py-2.5 px-3">
                                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${l.action === 'login' ? 'bg-emerald-50 text-emerald-600' : l.action === 'delete' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {l.action}
                                            </span>
                                        </td>
                                        <td className="py-2.5 px-3 text-xs text-slate-500">{l.module || '-'}</td>
                                        <td className="py-2.5 px-3 text-xs text-slate-600 max-w-[200px] truncate">{l.detail || '-'}</td>
                                        <td className="py-2.5 px-3 text-xs text-slate-400 font-mono">{l.ip || '-'}</td>
                                    </tr>
                                ))}
                                {logs.length === 0 && <tr><td colSpan={7} className="py-8 text-center text-slate-400 text-sm">暂无操作日志</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
            )}

            {/* ═══ USER EDIT MODAL ═══ */}
            {editUser && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800">{editUser.id ? '编辑用户' : '新建用户'}</h3>
                            <button onClick={() => setEditUser(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">用户名 *</label>
                                <input value={editUser.username || ''} onChange={e => setEditUser({ ...editUser, username: e.target.value })}
                                    disabled={!!editUser.id}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">姓名 *</label>
                                <input value={editUser.real_name || ''} onChange={e => setEditUser({ ...editUser, real_name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">{editUser.id ? '新密码（留空不修改）' : '密码 *'}</label>
                                <div className="relative">
                                    <input type={showPw ? 'text' : 'password'} value={editUser.password || ''} onChange={e => setEditUser({ ...editUser, password: e.target.value })}
                                        placeholder="至少8位，含字母和数字"
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 pr-10" />
                                    <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600">
                                        {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">手机号</label>
                                <input value={editUser.phone || ''} onChange={e => setEditUser({ ...editUser, phone: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">角色 *</label>
                                    <select value={editUser.role_id || ''} onChange={e => setEditUser({ ...editUser, role_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                        <option value="">请选择</option>
                                        {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">部门</label>
                                    <select value={editUser.dept_id || ''} onChange={e => setEditUser({ ...editUser, dept_id: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                        <option value="">请选择</option>
                                        {depts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">管辖城市</label>
                                    <select value={editUser.city || ''} onChange={e => setEditUser({ ...editUser, city: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                        <option value="">全省</option>
                                        {FUJIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">关联门店</label>
                                    <input value={editUser.store_id || ''} onChange={e => setEditUser({ ...editUser, store_id: e.target.value })}
                                        placeholder="门店ID" className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={() => setEditUser(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">取消</button>
                            <button onClick={saveUser} className="px-5 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-xl hover:bg-[#163050] transition-colors">保存</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ ROLE EDIT MODAL ═══ */}
            {editRole && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
                            <h3 className="font-semibold text-slate-800">{editRole.id ? '编辑角色' : '新建角色'}</h3>
                            <button onClick={() => setEditRole(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                        </div>
                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">角色名称 *</label>
                                    <input value={editRole.name || ''} onChange={e => setEditRole({ ...editRole, name: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">角色层级</label>
                                    <select value={editRole.level || 'province'} onChange={e => setEditRole({ ...editRole, level: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                        <option value="super">超级</option>
                                        <option value="province">省级</option>
                                        <option value="city">市级</option>
                                        <option value="store">门店</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">描述</label>
                                <input value={editRole.description || ''} onChange={e => setEditRole({ ...editRole, description: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-2 block">权限配置</label>
                                <div className="border border-slate-200 rounded-xl overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-200">
                                                <th className="px-3 py-2 text-left font-medium text-slate-600">模块</th>
                                                <th className="px-3 py-2 text-center font-medium text-slate-600">查看</th>
                                                <th className="px-3 py-2 text-center font-medium text-slate-600">编辑</th>
                                                <th className="px-3 py-2 text-center font-medium text-slate-600">删除</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {permModules.map(mod => (
                                                <tr key={mod.key} className="border-b border-slate-50">
                                                    <td className="px-3 py-2 font-medium text-slate-700">{mod.name}</td>
                                                    {['view', 'edit', 'delete'].map(act => (
                                                        <td key={act} className="px-3 py-2 text-center">
                                                            {mod.actions.includes(act) ? (
                                                                <button onClick={() => togglePerm(mod.key, act)}
                                                                    className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${(editRole.permissions?.[mod.key] || []).includes(act) ? 'bg-[#1e3a5f] border-[#1e3a5f]' : 'border-slate-300 hover:border-slate-400'}`}>
                                                                    {(editRole.permissions?.[mod.key] || []).includes(act) && <Check size={11} className="text-white" />}
                                                                </button>
                                                            ) : (
                                                                <span className="text-slate-200">-</span>
                                                            )}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0">
                            <button onClick={() => setEditRole(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">取消</button>
                            <button onClick={saveRole} className="px-5 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-xl hover:bg-[#163050] transition-colors">保存</button>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══ DEPT EDIT MODAL ═══ */}
            {editDept && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/40">
                    <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="font-semibold text-slate-800">{editDept.id ? '编辑部门' : '新建部门'}</h3>
                            <button onClick={() => setEditDept(null)} className="p-1.5 hover:bg-slate-100 rounded-lg"><X size={16} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="text-xs font-medium text-slate-600 mb-1 block">部门名称 *</label>
                                <input value={editDept.name || ''} onChange={e => setEditDept({ ...editDept, name: e.target.value })}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">层级</label>
                                    <select value={editDept.level || 'province'} onChange={e => setEditDept({ ...editDept, level: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                        <option value="province">省级</option>
                                        <option value="city">市级</option>
                                        <option value="store">门店</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-slate-600 mb-1 block">城市</label>
                                    <select value={editDept.city || ''} onChange={e => setEditDept({ ...editDept, city: e.target.value })}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                        <option value="">不限</option>
                                        {FUJIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 px-6 py-4 border-t border-slate-100 bg-slate-50">
                            <button onClick={() => setEditDept(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-200 rounded-xl transition-colors">取消</button>
                            <button onClick={saveDept} className="px-5 py-2 bg-[#1e3a5f] text-white text-sm font-medium rounded-xl hover:bg-[#163050] transition-colors">保存</button>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
