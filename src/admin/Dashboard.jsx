import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, Activity, Store, TrendingUp, Ticket, Trash2,
    ExternalLink, Globe, AlertCircle, ArrowUpRight, Users, Wifi, WifiOff, BarChart3
} from 'lucide-react';
import PageContainer from './components/PageContainer';
import PageHeader from './components/PageHeader';
import Card from './components/Card';
import ConfirmDialog from './components/ConfirmDialog';

function StatCard({ icon: Icon, label, value, sub, color, gradient }) {
    return (
        <div className={`relative overflow-hidden rounded-2xl p-5 ${gradient || 'bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)]'}`}>
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-white/70 uppercase tracking-wider">{label}</p>
                    <p className="text-3xl font-bold text-white mt-2 tracking-tight">{value}</p>
                    {sub && <p className="text-xs text-white/60 mt-1.5">{sub}</p>}
                </div>
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center flex-shrink-0">
                    <Icon size={20} className="text-white/90" />
                </div>
            </div>
            {/* Decorative circle */}
            <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-white/5" />
        </div>
    );
}

function LightStatCard({ icon: Icon, label, value, sub, iconBg, iconColor }) {
    return (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] p-5">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</p>
                    <p className="text-2xl font-bold text-slate-800 mt-1.5 tracking-tight">{value}</p>
                    {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
                </div>
                <div className={`w-10 h-10 rounded-xl ${iconBg || 'bg-blue-50'} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={iconColor || 'text-blue-500'} />
                </div>
            </div>
        </div>
    );
}

export default function Dashboard() {
    const { storeId: routeStoreId } = useParams();
    const location = useLocation();

    const isMainAdmin = location.pathname.startsWith('/admin');
    const storeId = isMainAdmin ? 'default' : routeStoreId;
    const authKey = isMainAdmin ? null : sessionStorage.getItem(`storeKey_${storeId}`);

    const [platformStats, setPlatformStats] = useState({ total: 0, active: 0, closed: 0 });
    const [stats, setStats] = useState({ online: false, storeName: 'Loading...', uptime: 0 });
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        fetch('/api/health')
            .then(res => res.json())
            .then(data => setStats(prev => ({ ...prev, online: true, uptime: data.uptime })))
            .catch(() => setStats(prev => ({ ...prev, online: false })));

        if (isMainAdmin) {
            const key = sessionStorage.getItem('superKey');
            if (key) {
                fetch(`/api/super/stores?superKey=${key}`)
                    .then(res => res.json())
                    .then(data => {
                        if (Array.isArray(data)) {
                            const active = data.filter(s => s.status !== 'closed').length;
                            setPlatformStats({ total: data.length, active, closed: data.length - active });
                            setStats(prev => ({ ...prev, storeName: '平台总控' }));
                        }
                    })
                    .catch(() => {});
            }
        } else {
            fetch(`/api/store/${storeId}`)
                .then(res => {
                    if (!res.ok) {
                        if (res.status === 404) setNotFound(true);
                        throw new Error('Store not found');
                    }
                    return res.json();
                })
                .then(data => setStats(prev => ({ ...prev, storeName: data.name || 'Unknown' })))
                .catch(() => {});
        }
    }, [storeId, isMainAdmin]);

    if (notFound) {
        return (
            <PageContainer>
                <div className="flex flex-col items-center justify-center min-h-[400px]">
                    <Card className="p-10 text-center max-w-sm">
                        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
                            <AlertCircle size={28} className="text-red-400" />
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">站点不存在</h2>
                        <p className="text-slate-400 text-sm">该站点已被删除或无法访问。</p>
                    </Card>
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader
                icon={LayoutDashboard}
                title={isMainAdmin ? '概览面板' : '分站概览'}
                description={isMainAdmin ? '管理系统全局状态与数据概览' : `门店 ${storeId}`}
            />

            {/* Gradient Stat Cards */}
            {isMainAdmin ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatCard icon={Activity} label="系统状态" value={stats.online ? '运行中' : '离线'}
                        gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
                    <StatCard icon={Store} label="托管门店" value={platformStats.total} sub={`${platformStats.active} 营业 / ${platformStats.closed} 暂停`}
                        gradient="bg-gradient-to-br from-[#1e3a5f] to-[#2a5a8f]" />
                    <StatCard icon={Wifi} label="在线设备" value={platformStats.active}
                        gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
                    <StatCard icon={BarChart3} label="运营率" value={platformStats.total ? Math.round(platformStats.active / platformStats.total * 100) + '%' : '--'}
                        sub={platformStats.active + ' / ' + platformStats.total}
                        gradient="bg-gradient-to-br from-violet-500 to-violet-600" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <StatCard icon={Activity} label="系统状态" value={stats.online ? '运行中' : '离线'}
                        gradient="bg-gradient-to-br from-emerald-500 to-emerald-600" />
                    <LightStatCard icon={Store} label="操作站点" value={stats.storeName} />
                    <LightStatCard icon={Wifi} label="功能状态" value="正常" iconBg="bg-emerald-50" iconColor="text-emerald-500" />
                </div>
            )}

            {/* Quick Actions */}
            <div className="p-5 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] rounded-2xl text-white shadow-lg shadow-blue-900/10 mb-8 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
                <div className="absolute left-1/2 bottom-0 w-40 h-40 bg-white/5 rounded-full translate-y-1/2" />
                <div className="relative">
                    <h3 className="text-base font-semibold mb-4">快速操作</h3>
                    <div className="flex gap-3">
                        {isMainAdmin ? (
                            <>
                                <a href="/#/s/default" target="_blank"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#1e3a5f] rounded-xl font-medium text-sm hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.98]">
                                    <ExternalLink size={14} /> 预览主站
                                </a>
                                <a href="/#/admin/stores"
                                    className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white rounded-xl font-medium text-sm hover:bg-white/20 transition-colors border border-white/10 active:scale-[0.98]">
                                    <Globe size={14} /> 管理分站
                                </a>
                            </>
                        ) : (
                            <a href={`/#/s/${storeId}`} target="_blank"
                                className="flex items-center gap-2 px-5 py-2.5 bg-white text-[#1e3a5f] rounded-xl font-medium text-sm hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.98]">
                                <ExternalLink size={14} /> 预览当前站点
                            </a>
                        )}
                    </div>
                </div>
            </div>

            <SuperAnalytics isMainAdmin={isMainAdmin} storeId={storeId} adminKey={authKey} />
        </PageContainer>
    );
}

function SuperAnalytics({ isMainAdmin, storeId, adminKey }) {
    const [analytics, setAnalytics] = useState({});
    const [tickets, setTickets] = useState([]);
    const [stores, setStores] = useState([]);
    const [period, setPeriod] = useState('');
    const [periodList, setPeriodList] = useState([]);
    const [selectedStore, setSelectedStore] = useState('');
    const [loading, setLoading] = useState(false);
    const [timeFilter, setTimeFilter] = useState('today');
    const [showClearConfirm, setShowClearConfirm] = useState(false);

    useEffect(() => {
        fetch('/data.json')
            .then(res => res.json())
            .then(data => {
                const list = [];
                if (data.latest?.period) list.push(data.latest.period.replace(/[^\d]/g, ''));
                if (data.history) data.history.forEach(h => list.push(String(h.period).replace(/[^\d]/g, '')));
                setPeriodList([...new Set(list)].sort((a, b) => b - a));
            })
            .catch(e => console.error("Failed to load periods", e));
    }, []);

    useEffect(() => {
        const superKey = sessionStorage.getItem('superKey');
        if (superKey) {
            fetch(`/api/super/analytics?superKey=${superKey}`)
                .then(res => res.json())
                .then(data => setAnalytics(data))
                .catch(() => {});

            fetch(`/api/super/stores?superKey=${superKey}`)
                .then(res => res.json())
                .then(data => setStores(Array.isArray(data) ? data : []))
                .catch(() => setStores([]));

            loadTickets('', '', superKey, null);
        } else if (storeId && adminKey) {
            fetch(`/api/store/analytics?id=${storeId}&adminKey=${adminKey}`)
                .then(res => {
                    if (!res.ok) throw new Error(`API_ERROR_${res.status}`);
                    return res.json();
                })
                .then(data => {
                    if (Object.keys(data).length === 0) {
                        setAnalytics({ [storeId]: { click_regular: 0, click_package: 0, share_count: 0, share_amount: 0 } });
                    } else {
                        setAnalytics(data);
                    }
                })
                .catch(() => setAnalytics({}));

            setStores([{ id: storeId, name: '当前门店' }]);
            loadTickets('', storeId, null, adminKey);
        }
    }, [storeId, adminKey, isMainAdmin]);

    const loadTickets = (p, sId, sKey, aKey) => {
        setLoading(true);
        const superKey = sKey || sessionStorage.getItem('superKey');
        const currentAdminKey = aKey || adminKey;
        const currentStoreId = isMainAdmin ? sId : storeId;

        let url = '';
        if (superKey) {
            url = `/api/super/tickets?superKey=${superKey}`;
            if (p) url += `&period=${p}`;
            if (sId) url += `&storeId=${sId}`;
        } else if (currentStoreId && currentAdminKey) {
            url = `/api/store/tickets?id=${currentStoreId}&adminKey=${currentAdminKey}`;
            if (p) url += `&period=${p}`;
        }
        if (!url) return;

        fetch(url)
            .then(res => { if (!res.ok) throw new Error('API Error'); return res.json(); })
            .then(data => { setTickets(Array.isArray(data) ? data : []); setLoading(false); })
            .catch(() => { setTickets([]); setLoading(false); });
    };

    const handleQuery = () => {
        loadTickets(period, selectedStore, sessionStorage.getItem('superKey'), adminKey);
    };

    const handleClearTickets = () => {
        setShowClearConfirm(false);
        if (isMainAdmin) {
            const key = sessionStorage.getItem('superKey');
            fetch('/api/super/clear-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey: key })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) { setTickets([]); setAnalytics({}); }
                });
        } else {
            fetch('/api/store/clear-tickets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: storeId, adminKey })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        setTickets([]);
                        setAnalytics({ [storeId]: { click_regular: 0, click_package: 0, share_count: 0, share_amount: 0 } });
                    }
                });
        }
    };

    const getStoreName = (sid) => {
        const s = stores.find(st => st.id === sid);
        return s ? s.name : sid;
    };

    const formatDate = (ts) => {
        if (!ts) return '-';
        return new Date(ts).toLocaleString('zh-CN', {
            year: 'numeric', month: 'numeric', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
        });
    };

    // Compute summary stats for analytics
    const totalClicks = Object.values(analytics).reduce((sum, s) => sum + (s.click_regular || 0) + (s.click_package || 0), 0);
    const totalShares = Object.values(analytics).reduce((sum, s) => sum + (s.share_count || 0), 0);
    const totalAmount = Object.values(analytics).reduce((sum, s) => sum + (s.share_amount || 0), 0);

    return (
        <div className="space-y-6">
            <ConfirmDialog
                open={showClearConfirm}
                title="确认清空"
                message="确定要清空所有彩票和报表记录吗？此操作不可撤销！"
                confirmLabel="确认清空"
                danger
                onConfirm={handleClearTickets}
                onCancel={() => setShowClearConfirm(false)}
            />

            {/* Summary Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <LightStatCard icon={TrendingUp} label="总点击量" value={totalClicks.toLocaleString()} sub="常规 + 套餐" iconBg="bg-blue-50" iconColor="text-blue-500" />
                <LightStatCard icon={Ticket} label="分享总注数" value={totalShares.toLocaleString()} iconBg="bg-purple-50" iconColor="text-purple-500" />
                <LightStatCard icon={BarChart3} label="分享总金额" value={`¥${totalAmount.toLocaleString()}`} iconBg="bg-amber-50" iconColor="text-amber-500" />
            </div>

            {/* Business Report Table */}
            <Card noPadding>
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                            <TrendingUp size={15} className="text-blue-500" />
                        </div>
                        <h3 className="text-sm font-semibold text-slate-700">经营报表</h3>
                    </div>
                    <button
                        onClick={() => setShowClearConfirm(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <Trash2 size={12} /> 清空
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            <tr>
                                <th className="px-6 py-3">门店</th>
                                <th className="px-6 py-3">常规点击</th>
                                <th className="px-6 py-3">套餐点击</th>
                                <th className="px-6 py-3">分享注数</th>
                                <th className="px-6 py-3">分享金额</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {Object.entries(analytics).length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-300 text-sm">暂无数据</td></tr>
                            ) : (
                                Object.entries(analytics).map(([sid, stat]) => (
                                    <tr key={sid} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-[#1e3a5f]/10 flex items-center justify-center">
                                                    <Store size={12} className="text-[#1e3a5f]" />
                                                </div>
                                                <span className="font-medium text-slate-700">{getStoreName(sid)}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3.5 text-slate-600 tabular-nums">{stat.click_regular || 0}</td>
                                        <td className="px-6 py-3.5 text-slate-600 tabular-nums">{stat.click_package || 0}</td>
                                        <td className="px-6 py-3.5 font-semibold text-blue-600 tabular-nums">{stat.share_count || 0}</td>
                                        <td className="px-6 py-3.5 font-semibold text-emerald-600 tabular-nums">¥{(stat.share_amount || 0).toLocaleString()}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Ticket Center */}
            <Card noPadding>
                <div className="px-6 py-4 border-b border-slate-100">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                                    <Ticket size={15} className="text-orange-500" />
                                </div>
                                <h3 className="text-sm font-semibold text-slate-700">彩票中心</h3>
                            </div>
                            {/* Time Filters */}
                            <div className="flex bg-slate-100 rounded-lg p-0.5 gap-0.5">
                                {[['yesterday', '昨日'], ['today', '今日'], ['week', '本周'], ['month', '本月'], ['year', '今年'], ['all', '全部']].map(([key, label]) => (
                                    <button
                                        key={key}
                                        onClick={() => setTimeFilter(key)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${timeFilter === key
                                            ? 'bg-white text-[#1e3a5f] shadow-sm'
                                            : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <select value={period} onChange={e => setPeriod(e.target.value)}
                                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none">
                                <option value="">全部期号</option>
                                {periodList.map(p => <option key={p} value={p}>第{p}期</option>)}
                            </select>

                            {isMainAdmin && (
                                <select value={selectedStore} onChange={e => setSelectedStore(e.target.value)}
                                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none">
                                    <option value="">所有门店</option>
                                    {stores.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}
                                </select>
                            )}

                            <button onClick={handleQuery}
                                className="px-4 py-1.5 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white text-sm font-medium rounded-lg hover:from-[#163050] hover:to-[#1e3a5f] transition-all active:scale-[0.98]">
                                {loading ? '...' : '查询'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead>
                            <tr className="bg-slate-50/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                <th className="px-6 py-3">时间</th>
                                <th className="px-6 py-3">门店</th>
                                <th className="px-6 py-3">期号</th>
                                <th className="px-6 py-3">类型</th>
                                <th className="px-6 py-3">注数/金额</th>
                                <th className="px-6 py-3">号码详情</th>
                                <th className="px-6 py-3">状态</th>
                                <th className="px-6 py-3">中奖金额</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600">
                            {(() => {
                                const now = new Date();
                                const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
                                const yesterdayStart = todayStart - 86400000;
                                const day = now.getDay() || 7;
                                const weekStart = todayStart - (day - 1) * 86400000;
                                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
                                const yearStart = new Date(now.getFullYear(), 0, 1).getTime();

                                const filteredTickets = tickets.filter(t => {
                                    if (timeFilter === 'all') return true;
                                    const ts = t.timestamp;
                                    if (timeFilter === 'today') return ts >= todayStart;
                                    if (timeFilter === 'yesterday') return ts >= yesterdayStart && ts < todayStart;
                                    if (timeFilter === 'week') return ts >= weekStart;
                                    if (timeFilter === 'month') return ts >= monthStart;
                                    if (timeFilter === 'year') return ts >= yearStart;
                                    return true;
                                });

                                if (filteredTickets.length === 0) {
                                    return <tr><td colSpan="8" className="px-6 py-10 text-center text-slate-300">暂无记录</td></tr>;
                                }

                                return filteredTickets.map(ticket => (
                                    <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3 text-slate-400 whitespace-nowrap text-xs">{formatDate(ticket.timestamp)}</td>
                                        <td className="px-6 py-3 font-medium text-slate-700">{getStoreName(ticket.storeId)}</td>
                                        <td className="px-6 py-3 text-blue-600 font-semibold font-mono">{ticket.period}</td>
                                        <td className="px-6 py-3">
                                            <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${ticket.mode === 'package' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
                                                {ticket.mode === 'package' ? '套餐' : '普通'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{ticket.count}注</span>
                                                <span className="text-xs text-slate-400">￥{ticket.price}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-xs text-slate-600 max-w-xs break-all">
                                            {Array.isArray(ticket.numbers)
                                                ? ticket.numbers.map((n, i) => (
                                                    <div key={i} className="flex items-center gap-2 mb-1 last:mb-0">
                                                        <div className="flex gap-0.5 flex-wrap">
                                                            {(n.red || n.reds || []).map((num, idx) => (
                                                                <span key={`r-${idx}`} className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                                    {String(num).padStart(2, '0')}
                                                                </span>
                                                            ))}
                                                        </div>
                                                        <div className="w-px h-3 bg-gray-200" />
                                                        <div className="flex gap-0.5 flex-wrap">
                                                            {(n.blue || n.blues || []).map((num, idx) => (
                                                                <span key={`b-${idx}`} className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-bold">
                                                                    {String(num).padStart(2, '0')}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))
                                                : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            {ticket.status === 'won'
                                                ? <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-md text-xs font-semibold">已中奖</span>
                                                : ticket.status === 'lost'
                                                    ? <span className="text-slate-300 text-xs">未中奖</span>
                                                    : <span className="bg-amber-50 text-amber-600 px-2.5 py-1 rounded-md text-xs font-semibold">待开奖</span>
                                            }
                                        </td>
                                        <td className="px-6 py-3 font-semibold text-slate-800 text-center tabular-nums">
                                            {ticket.status === 'won' ? `￥${ticket.winAmount}` : '-'}
                                        </td>
                                    </tr>
                                ));
                            })()}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
