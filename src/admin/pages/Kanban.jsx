import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    BarChart3, Globe, Radio, Monitor, Maximize, Minimize, RefreshCcw,
    Store, Eye, Share2, TrendingUp, AlertTriangle, CheckCircle,
    Wifi, WifiOff
} from 'lucide-react';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';

const FUJIAN_CITIES = ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'];

export default function Kanban() {
    const [superKey, setSuperKey] = useState(() => sessionStorage.getItem('superKey') || '');
    const [isAuthed, setIsAuthed] = useState(() => !!sessionStorage.getItem('superKey'));
    const [stores, setStores] = useState([]);
    const [analytics, setAnalytics] = useState({});
    const [sourcesData, setSourcesData] = useState(null);
    const [activeTab, setActiveTab] = useState('全省总览');
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    // ---------- Auth ----------
    const handleLogin = async (key) => {
        setSuperKey(key);
        sessionStorage.setItem('superKey', key);
        await loadAllData(key);
        setIsAuthed(true);
    };

    // ---------- Data Loading ----------
    const loadAllData = useCallback(async (key) => {
        const sk = key || superKey;
        if (!sk) return;
        setRefreshing(true);
        try {
            const [storesRes, analyticsRes, sourcesRes] = await Promise.allSettled([
                fetch(`/api/super/stores?superKey=${sk}`).then(r => r.json()),
                fetch(`/api/super/analytics?superKey=${sk}`).then(r => r.json()),
                fetch('/api/system/sources').then(r => r.json()),
            ]);
            if (storesRes.status === 'fulfilled') {
                setStores(Array.isArray(storesRes.value) ? storesRes.value : []);
            }
            if (analyticsRes.status === 'fulfilled') {
                setAnalytics(analyticsRes.value || {});
            }
            if (sourcesRes.status === 'fulfilled') {
                const payload = sourcesRes.value?.data || sourcesRes.value;
                setSourcesData(payload);
            }
            setLastRefresh(new Date());
        } catch (err) {
            console.error('Kanban data load error:', err);
        } finally {
            setRefreshing(false);
        }
    }, [superKey]);

    useEffect(() => {
        if (superKey) {
            loadAllData(superKey).then(() => setIsAuthed(true)).catch(() => {});
        }
    }, []);

    // Auto-refresh every 30s
    useEffect(() => {
        if (!isAuthed) return;
        const interval = setInterval(() => loadAllData(), 30000);
        return () => clearInterval(interval);
    }, [isAuthed, loadAllData]);

    // Fullscreen change listener
    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            document.exitFullscreen().catch(() => {});
        }
    };

    // ---------- Derived Data ----------
    const filteredStores = useMemo(() => {
        if (activeTab === '全省总览') return stores;
        return stores.filter(s => s.city === activeTab);
    }, [stores, activeTab]);

    const totalStores = filteredStores.length;
    const onlineStores = filteredStores.filter(s => s.isOnline).length;
    const offlineStores = totalStores - onlineStores;

    const totalClicks = useMemo(() => {
        let sum = 0;
        const relevant = activeTab === '全省总览'
            ? Object.entries(analytics)
            : Object.entries(analytics).filter(([sid]) => {
                const s = stores.find(st => st.id === sid);
                return s && s.city === activeTab;
            });
        for (const [, stat] of relevant) {
            sum += (stat.click_regular || 0) + (stat.click_package || 0);
        }
        return sum;
    }, [analytics, activeTab, stores]);

    const totalShares = useMemo(() => {
        let sum = 0;
        const relevant = activeTab === '全省总览'
            ? Object.entries(analytics)
            : Object.entries(analytics).filter(([sid]) => {
                const s = stores.find(st => st.id === sid);
                return s && s.city === activeTab;
            });
        for (const [, stat] of relevant) {
            sum += (stat.share_count || 0);
        }
        return sum;
    }, [analytics, activeTab, stores]);

    // Draw freshness
    const drawStatus = useMemo(() => {
        const fujian = sourcesData?.fujianDraws || [];
        if (fujian.length === 0) return { label: '无数据', color: 'text-slate-400' };
        const today = new Date().toDateString();
        const updated = fujian.filter(d => {
            if (!d.date) return false;
            try { return new Date(d.date).toDateString() === today; } catch { return false; }
        });
        if (updated.length === fujian.length) return { label: '已更新', color: 'text-emerald-600' };
        if (updated.length > 0) return { label: `部分更新 ${updated.length}/${fujian.length}`, color: 'text-amber-600' };
        return { label: '待更新', color: 'text-red-600' };
    }, [sourcesData]);

    // City stats
    const cityStats = useMemo(() => {
        return FUJIAN_CITIES.map(city => {
            const cityStores = stores.filter(s => s.city === city);
            const total = cityStores.length;
            const online = cityStores.filter(s => s.isOnline).length;
            const rate = total > 0 ? Math.round((online / total) * 100) : 0;
            return { city, total, online, rate };
        });
    }, [stores]);

    // Channel distribution
    const channelCounts = useMemo(() => {
        const tv = filteredStores.filter(s => (s.channel || 'tv') === 'tv').length;
        const android = filteredStores.filter(s => s.channel === 'android').length;
        return { tv, android };
    }, [filteredStores]);

    // Offline store alerts sorted by offline duration
    const offlineAlerts = useMemo(() => {
        return filteredStores
            .filter(s => !s.isOnline && s.id !== 'default')
            .map(s => {
                const offlineSince = s.lastPing;
                let duration = '-';
                if (offlineSince) {
                    const diff = Date.now() - offlineSince;
                    const hours = Math.floor(diff / 3600000);
                    const mins = Math.floor((diff % 3600000) / 60000);
                    duration = hours > 0 ? `${hours}h${mins}m` : `${mins}m`;
                }
                return { ...s, duration, offlineSince };
            })
            .sort((a, b) => {
                if (!a.offlineSince) return 1;
                if (!b.offlineSince) return -1;
                return a.offlineSince - b.offlineSince;
            });
    }, [filteredStores]);

    // Store activity table
    const storeActivity = useMemo(() => {
        return [...filteredStores]
            .filter(s => s.id !== 'default')
            .sort((a, b) => (b.lastPing || 0) - (a.lastPing || 0))
            .slice(0, 20);
    }, [filteredStores]);

    // ---------- Render ----------
    if (!isAuthed) {
        return <PageContainer><div className="flex items-center justify-center min-h-[40vh] text-slate-400">正在加载数据...</div></PageContainer>;
    }

    const formatTime = (ts) => {
        if (!ts) return '-';
        try {
            return new Date(ts).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
        } catch { return '-'; }
    };

    const getRateColor = (rate) => {
        if (rate > 80) return { bar: 'bg-emerald-500', text: 'text-emerald-600' };
        if (rate > 50) return { bar: 'bg-amber-500', text: 'text-amber-600' };
        return { bar: 'bg-red-500', text: 'text-red-600' };
    };

    return (
        <PageContainer>
            {/* Header */}
            <PageHeader
                icon={BarChart3}
                title="福建省体彩数据看板"
                description={lastRefresh ? `更新于 ${lastRefresh.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}` : '加载中...'}
            >
                <button
                    onClick={() => loadAllData()}
                    disabled={refreshing}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs hover:bg-slate-100 transition-colors"
                >
                    <RefreshCcw size={13} className={refreshing ? 'animate-spin' : ''} />
                    刷新
                </button>
                <button
                    onClick={toggleFullscreen}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-xs hover:bg-slate-100 transition-colors"
                >
                    {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                    {isFullscreen ? '退出全屏' : '全屏'}
                </button>
            </PageHeader>

            {/* Top Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
                <StatCard icon={<Store size={16} />} label="门店总数" value={totalStores} color="text-blue-500" />
                <StatCard icon={<Wifi size={16} />} label="在线门店" value={onlineStores} color="text-emerald-500" />
                <StatCard icon={<WifiOff size={16} />} label="离线门店" value={offlineStores} color="text-red-500" />
                <StatCard icon={<Eye size={16} />} label="今日点击" value={totalClicks} color="text-blue-500" />
                <StatCard icon={<Share2 size={16} />} label="今日分享" value={totalShares} color="text-amber-500" />
                <StatCard icon={<Radio size={16} />} label="开奖状态" value={drawStatus.label} valueClass={drawStatus.color} />
            </div>

            {/* Tab Bar */}
            <div className="flex items-center gap-1.5 mb-5 overflow-x-auto pb-1">
                {['全省总览', ...FUJIAN_CITIES].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                            activeTab === tab
                                ? 'bg-[#1e3a5f] text-white'
                                : 'bg-slate-50 text-slate-400 hover:text-slate-600'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Left Column (span 2) */}
                <div className="lg:col-span-2 space-y-4">
                    {/* City Status Cards */}
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                <Globe size={15} className="text-[#1e3a5f]" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-800">各地市门店状态</h2>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            {cityStats.map(cs => {
                                const rc = getRateColor(cs.rate);
                                return (
                                    <div key={cs.city} className="bg-slate-50 rounded-xl border border-slate-100 p-3 hover:border-slate-200 transition-colors">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <span className="text-sm font-semibold text-slate-800">{cs.city}</span>
                                            <span className={`text-xs font-bold ${rc.text}`}>{cs.rate}%</span>
                                        </div>
                                        <div className="text-[10px] text-slate-400 mb-2">
                                            {cs.online}/{cs.total} 在线
                                        </div>
                                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-500 ${rc.bar}`} style={{ width: `${cs.rate}%` }} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </Card>

                    {/* Store Activity Table */}
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                <TrendingUp size={15} className="text-[#1e3a5f]" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-800">门店活动</h2>
                            <span className="text-[10px] text-slate-400 ml-auto">最近 {storeActivity.length} 条</span>
                        </div>
                        <div className="overflow-y-auto max-h-[320px]">
                            <table className="w-full text-xs">
                                <thead className="sticky top-0 bg-slate-50/80 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                                    <tr>
                                        <th className="text-left px-4 py-3">门店</th>
                                        <th className="text-left px-4 py-3">城市</th>
                                        <th className="text-left px-4 py-3">渠道</th>
                                        <th className="text-left px-4 py-3">状态</th>
                                        <th className="text-right px-4 py-3">最后活动</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {storeActivity.length === 0 ? (
                                        <tr><td colSpan={5} className="py-6 text-center text-slate-400">暂无数据</td></tr>
                                    ) : (
                                        storeActivity.map(store => (
                                            <tr key={store.id} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-4 py-3">
                                                    <div className="font-medium text-slate-800 truncate max-w-[140px]">{store.name || store.id}</div>
                                                    <div className="text-[10px] text-slate-400 font-mono">{store.id}</div>
                                                </td>
                                                <td className="px-4 py-3 text-slate-600">{store.city || '-'}</td>
                                                <td className="px-4 py-3">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                        (store.channel || 'tv') === 'tv'
                                                            ? 'bg-blue-50 text-blue-600'
                                                            : 'bg-purple-50 text-purple-600'
                                                    }`}>
                                                        {(store.channel || 'tv') === 'tv' ? 'TV' : 'Android'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={`flex items-center gap-1 ${
                                                        store.isOnline ? 'text-emerald-600' : 'text-red-500'
                                                    }`}>
                                                        {store.isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
                                                        {store.isOnline ? '在线' : '离线'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-400">{formatTime(store.lastPing)}</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>

                {/* Right Column (span 1) */}
                <div className="space-y-4">
                    {/* Channel Distribution */}
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                <Monitor size={15} className="text-[#1e3a5f]" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-800">渠道分布</h2>
                        </div>
                        <div className="space-y-3">
                            <ChannelBar label="电视盒子" count={channelCounts.tv} total={Math.max(filteredStores.length, 1)} color="bg-blue-500" />
                            <ChannelBar label="Android" count={channelCounts.android} total={Math.max(filteredStores.length, 1)} color="bg-purple-500" />
                        </div>
                        <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
                            <div>
                                <div className="text-lg font-bold text-blue-600">{channelCounts.tv}</div>
                                <div className="text-[10px] text-slate-400">TV 渠道</div>
                            </div>
                            <div>
                                <div className="text-lg font-bold text-purple-600">{channelCounts.android}</div>
                                <div className="text-[10px] text-slate-400">Android 渠道</div>
                            </div>
                        </div>
                    </Card>

                    {/* Draw Status */}
                    <Card>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                <Radio size={15} className="text-[#1e3a5f]" />
                            </div>
                            <h2 className="text-sm font-bold text-slate-800">开奖状态</h2>
                        </div>
                        <div className="space-y-2">
                            {(sourcesData?.fujianDraws || []).length === 0 ? (
                                <div className="text-xs text-slate-400 py-2 text-center">暂无开奖数据</div>
                            ) : (
                                (sourcesData?.fujianDraws || []).map(draw => {
                                    const isToday = (() => {
                                        if (!draw.date) return false;
                                        try { return new Date(draw.date).toDateString() === new Date().toDateString(); } catch { return false; }
                                    })();
                                    return (
                                        <div key={draw.id || draw.name} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50">
                                            <div className="flex items-center gap-2">
                                                {isToday ? (
                                                    <CheckCircle size={12} className="text-emerald-500" />
                                                ) : (
                                                    <AlertTriangle size={12} className="text-amber-500" />
                                                )}
                                                <span className="text-xs text-slate-600">{draw.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-slate-400 font-mono">{draw.issue || '-'}</span>
                                                <span className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </Card>

                    {/* Alert List - Offline Stores */}
                    <Card>
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                                    <AlertTriangle size={15} className="text-red-500" />
                                </div>
                                <h2 className="text-sm font-bold text-slate-800">离线告警</h2>
                            </div>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-600 font-medium">
                                {offlineAlerts.length}
                            </span>
                        </div>
                        <div className="overflow-y-auto max-h-[240px] space-y-1.5">
                            {offlineAlerts.length === 0 ? (
                                <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                                    <CheckCircle size={12} className="text-emerald-500" />
                                    所有门店在线运行中
                                </div>
                            ) : (
                                offlineAlerts.map(store => (
                                    <div key={store.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <WifiOff size={11} className="text-red-500 flex-shrink-0" />
                                            <div className="min-w-0">
                                                <div className="text-xs text-slate-600 truncate">{store.name || store.id}</div>
                                                <div className="text-[10px] text-slate-400">{store.city || '-'}</div>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-red-500 font-mono flex-shrink-0 ml-2">{store.duration}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </PageContainer>
    );
}

// ---------- Sub Components ----------

function StatCard({ icon, label, value, color, valueClass }) {
    return (
        <div className="bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] p-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</span>
                <span className={color || 'text-blue-500'}>{icon}</span>
            </div>
            <div className={`text-2xl font-bold text-slate-800 ${valueClass || ''}`}>
                {typeof value === 'number' ? value.toLocaleString() : value}
            </div>
        </div>
    );
}

function ChannelBar({ label, count, total, color }) {
    const pct = total > 0 ? Math.round((count / total) * 100) : 0;
    return (
        <div>
            <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-500">{label}</span>
                <span className="text-slate-400">{count} 家 ({pct}%)</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    );
}
