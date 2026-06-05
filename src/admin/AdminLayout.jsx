import React, { useState, useEffect, useMemo } from 'react';
import { Outlet, Link, useLocation, useParams } from 'react-router-dom';
import {
    LayoutDashboard, Store, Settings, LogOut, Globe, Radio, Sparkles, Trophy,
    Image as ImageIcon, BarChart3, Monitor, FileText, Megaphone, Users, Shield, Camera, Gamepad2
} from 'lucide-react';
import SuperLoginScreen from './components/SuperLoginScreen';

export default function AdminLayout() {
    const { storeId: routeStoreId } = useParams();
    const location = useLocation();

    const isMainAdmin = location.pathname.startsWith('/admin');
    const storeId = isMainAdmin ? 'default' : routeStoreId;
    const basePath = isMainAdmin ? '/admin' : `/s/${storeId}/admin`;

    // --- JWT Auth State (main admin) ---
    const [adminUser, setAdminUser] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('adminUser') || 'null'); } catch { return null; }
    });
    const [adminToken, setAdminToken] = useState(() => sessionStorage.getItem('adminToken') || '');

    const adminPerms = adminUser?.permissions || {};
    const hasPerm = (mod) => !!adminPerms[mod];

    // Menu structure with groups — filtered by permissions for main admin
    const menuGroups = useMemo(() => {
        if (!isMainAdmin) {
            return [
                { items: [{ icon: LayoutDashboard, label: '概览', path: basePath }] },
                {
                    items: [
                        { icon: Store, label: '内容管理', path: `${basePath}/config` },
                        { icon: Trophy, label: '喜报配置', path: `${basePath}/winner-config` },
                        { icon: Settings, label: '系统设置', path: `${basePath}/settings` },
                    ]
                }
            ];
        }
        const groups = [];
        groups.push({ items: [{ icon: LayoutDashboard, label: '概览面板', path: '/admin' }] });

        const storeOps = [];
        if (hasPerm('store_manage')) storeOps.push({ icon: Globe, label: '门店管理', path: '/admin/stores' });
        if (hasPerm('store_config') || hasPerm('announcements')) storeOps.push({ icon: FileText, label: '内容管理', path: '/admin/config' });
        if (hasPerm('announcements')) storeOps.push({ icon: Megaphone, label: '公告管理', path: '/admin/announcements' });
        if (storeOps.length) groups.push({ label: '门店运营', items: storeOps });

        const tools = [];
        if (hasPerm('remote_control')) tools.push({ icon: Monitor, label: '远程控制', path: '/admin/remote' });
        if (hasPerm('dashboard')) tools.push({ icon: BarChart3, label: '数据看板', path: '/admin/kanban' });
        if (tools.length) groups.push({ label: '运营工具', items: tools });

        const content = [];
        if (hasPerm('layout') || hasPerm('carousel')) content.push({ icon: ImageIcon, label: '素材管理', path: '/admin/layout' });
        if (hasPerm('layout') || hasPerm('carousel')) content.push({ icon: Camera, label: '大头贴边框', path: '/admin/photo-frames' });
        if (hasPerm('layout') || hasPerm('carousel')) content.push({ icon: Gamepad2, label: '互动Logo', path: '/admin/game-logos' });
        if (hasPerm('store_config')) content.push({ icon: Trophy, label: '喜报中心', path: '/admin/winner-config' });
        if (content.length) groups.push({ label: '内容资源', items: content });

        const games = [];
        if (hasPerm('store_config') || hasPerm('system_config')) games.push({ icon: Gamepad2, label: '游戏配置', path: '/admin/game-config' });
        if (hasPerm('store_config') || hasPerm('system_config')) games.push({ icon: Gamepad2, label: '互动中心配置', path: '/admin/game-hub-config' });
        if (games.length) groups.push({ label: '游戏管理', items: games });

        const sys = [];
        if (hasPerm('draw_data')) sys.push({ icon: Radio, label: '信源监控', path: '/admin/crawler' });
        if (hasPerm('system_config')) sys.push({ icon: Settings, label: '系统设置', path: '/admin/settings' });
        if (hasPerm('user_manage')) sys.push({ icon: Users, label: '权限管理', path: '/admin/rbac' });
        if (sys.length) groups.push({ label: '系统', items: sys });

        return groups;
    }, [isMainAdmin, basePath, adminPerms]);

    const isActive = (path) => {
        if (path === basePath || path === '/admin') return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    // --- Main Admin JWT Login ---
    const handleJWTLogin = async (username, password) => {
        const res = await fetch('/api/rbac/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || '登录失败');

        sessionStorage.setItem('adminToken', data.token);
        sessionStorage.setItem('adminUser', JSON.stringify(data.user));

        // Fetch superKey for backward compat — must complete BEFORE rendering child pages
        try {
            const cfgRes = await fetch('/api/super/config', {
                headers: { 'Authorization': `Bearer ${data.token}` },
            });
            if (cfgRes.ok) {
                const cfg = await cfgRes.json();
                if (cfg.superKey) {
                    sessionStorage.setItem('superKey', cfg.superKey);
                    sessionStorage.setItem('superAuthed', 'true');
                }
            }
        } catch { /* ignore */ }

        setAdminToken(data.token);
        setAdminUser(data.user);
        setIsAuthenticated(true);
    };

    const handleAdminLogout = () => {
        setAdminToken('');
        setAdminUser(null);
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        sessionStorage.removeItem('superKey');
        sessionStorage.removeItem('superAuthed');
    };

    // --- Authentication Logic (store admin) ---
    const TIMEOUT_MS = 5 * 60 * 1000;

    const [isAuthenticated, setIsAuthenticated] = useState(() => {
        if (isMainAdmin) return !!sessionStorage.getItem('adminToken');
        const storedAuth = sessionStorage.getItem(`auth_${storeId}`);
        const storedKey = sessionStorage.getItem(`storeKey_${storeId}`);
        const lastActive = sessionStorage.getItem(`lastActive_${storeId}`);
        if (storedAuth === 'true' && storedKey && lastActive) {
            if (Date.now() - Number(lastActive) > TIMEOUT_MS) {
                sessionStorage.removeItem(`auth_${storeId}`);
                sessionStorage.removeItem(`storeKey_${storeId}`);
                sessionStorage.removeItem(`lastActive_${storeId}`);
                return false;
            }
            return true;
        }
        return false;
    });

    const [inputKey, setInputKey] = useState('');
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!isMainAdmin && storeId) {
            fetch(`/api/store/${storeId}`)
                .then(res => { if (res.status === 404) setNotFound(true); })
                .catch(() => { });
        }
    }, [storeId, isMainAdmin]);

    useEffect(() => {
        if (!isAuthenticated || isMainAdmin) return;
        let activityTimer;
        const resetTimer = () => {
            sessionStorage.setItem(`lastActive_${storeId}`, Date.now().toString());
            if (activityTimer) clearTimeout(activityTimer);
            activityTimer = setTimeout(() => {
                sessionStorage.removeItem(`auth_${storeId}`);
                sessionStorage.removeItem(`storeKey_${storeId}`);
                sessionStorage.removeItem(`lastActive_${storeId}`);
                setIsAuthenticated(false);
            }, TIMEOUT_MS);
        };
        resetTimer();
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        events.forEach(event => window.addEventListener(event, resetTimer));
        return () => {
            if (activityTimer) clearTimeout(activityTimer);
            events.forEach(event => window.removeEventListener(event, resetTimer));
        };
    }, [isAuthenticated, isMainAdmin, storeId]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthLoading(true);
        setAuthError('');
        try {
            const res = await fetch('/api/store/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: storeId, adminKey: inputKey })
            });
            const data = await res.json();
            if (data.success) {
                setIsAuthenticated(true);
                sessionStorage.setItem(`auth_${storeId}`, 'true');
                sessionStorage.setItem(`storeKey_${storeId}`, inputKey);
                sessionStorage.setItem(`lastActive_${storeId}`, Date.now().toString());
            } else {
                setAuthError('密钥错误');
            }
        } catch { setAuthError('网络错误'); }
        finally { setAuthLoading(false); }
    };

    // --- Not Found Screen ---
    if (notFound) {
        return (
            <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 text-center max-w-md w-full">
                    <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
                        <Store size={28} className="text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-2">站点不存在</h2>
                    <p className="text-sm text-slate-400 mb-6">该门店站可能已被管理员删除或暂停运营。</p>
                    <button onClick={() => window.location.href = '/'} className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                        返回主站
                    </button>
                </div>
            </div>
        );
    }

    // --- Login Screens ---
    if (!isAuthenticated || (isMainAdmin && !adminToken)) {
        if (isMainAdmin) {
            return (
                <div className="min-h-screen bg-[#f5f7fa]">
                    <SuperLoginScreen onLogin={handleJWTLogin} />
                </div>
            );
        }
        return (
            <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm">
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mx-auto mb-3">
                            <Store size={22} className="text-blue-600" />
                        </div>
                        <h1 className="text-lg font-semibold text-slate-900">分站后台登录</h1>
                        <p className="text-xs text-slate-400 mt-1 font-mono">ID: {storeId}</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={inputKey}
                            onChange={e => setInputKey(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-center tracking-widest font-medium"
                            placeholder="请输入管理密钥"
                            autoFocus
                        />
                        <button disabled={authLoading} className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors">
                            {authLoading ? '验证中...' : '进入后台'}
                        </button>
                        {authError && <p className="text-center text-red-500 text-xs">{authError}</p>}
                    </form>
                    <div className="mt-5 text-center">
                        <Link to={`/s/${storeId}`} className="text-xs text-slate-400 hover:text-blue-500 flex items-center justify-center gap-1">
                            <LogOut size={12} /> 返回前台
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    // --- Main Layout ---
    return (
        <div className="flex h-screen bg-[#f5f7fa]">
            {/* Sidebar */}
            <aside className="w-60 bg-[#1e3a5f] flex flex-col flex-shrink-0">
                {/* Logo */}
                <div className="px-5 py-6 border-b border-white/[0.06]">
                    <h1 className="text-white font-semibold text-[15px]">
                        {isMainAdmin ? '体彩信息发布终端管理系统' : '分站管理'}
                    </h1>
                    {!isMainAdmin && <p className="text-[10px] text-[#4e7da8] mt-0.5 font-mono">ID: {storeId}</p>}
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto py-3 px-3">
                    {menuGroups.map((group, gi) => (
                        <div key={gi} className="mb-1">
                            {group.label && (
                                <div className="px-3 pt-5 pb-2 text-[10px] font-semibold text-[#4e7da8] uppercase tracking-[1.5px]">
                                    {group.label}
                                </div>
                            )}
                            {group.items.map(item => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-colors ${
                                        isActive(item.path)
                                            ? 'bg-white/[0.12] text-white'
                                            : 'text-[#7ea3c8] hover:bg-white/[0.05] hover:text-[#b8d4ee]'
                                    }`}
                                >
                                    <item.icon size={17} className="flex-shrink-0 opacity-70" />
                                    <span>{item.label}</span>
                                </Link>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Footer */}
                <div className="px-4 py-4 border-t border-white/[0.06]">
                    {!isMainAdmin ? (
                        <button
                            onClick={() => {
                                sessionStorage.removeItem(`auth_${storeId}`);
                                sessionStorage.removeItem(`storeKey_${storeId}`);
                                sessionStorage.removeItem(`lastActive_${storeId}`);
                                setIsAuthenticated(false);
                            }}
                            className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] text-[#7ea3c8] hover:bg-white/[0.05] hover:text-[#b8d4ee] transition-colors"
                        >
                            <LogOut size={17} />
                            <span>退出登录</span>
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <div className="flex items-center gap-3 px-2">
                                <div className="w-8 h-8 rounded-full bg-[#2a5080] flex items-center justify-center text-[#93c5fd] text-xs font-semibold">
                                    {(adminUser?.realName || '管')[0]}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12px] text-[#c8ddef] truncate">{adminUser?.realName || '管理员'}</div>
                                    <div className="text-[10px] text-[#4e7da8] truncate">{adminUser?.roleName || '超级管理员'}</div>
                                </div>
                            </div>
                            <button
                                onClick={handleAdminLogout}
                                className="flex items-center gap-2.5 px-3 py-2 w-full rounded-lg text-[13px] text-[#7ea3c8] hover:bg-white/[0.05] hover:text-[#b8d4ee] transition-colors"
                            >
                                <LogOut size={15} />
                                <span>退出登录</span>
                            </button>
                        </div>
                    )}
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <main className="flex-1 overflow-y-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
