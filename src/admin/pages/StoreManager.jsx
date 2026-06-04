import React, { useState, useEffect } from 'react';
import { Store, Plus, Trash2, RefreshCcw, Tv, Smartphone, Search, Globe, Key, MapPin, Eye, Settings, Wifi, WifiOff, Clock, FileText, X, Zap, Share2, AlertTriangle, Cpu, Monitor } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import TabBar from '../components/TabBar';
import ConfirmDialog from '../components/ConfirmDialog';
import StoreConfig from '../StoreConfig';
import { getChannelLabel } from '../../utils/adminHelpers';

const FUJIAN_CITIES = ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'];

// Shared UI helpers
const Section = ({ title, children }) => (
    <div className="mb-4">
        <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">{title}</h4>
        <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">{children}</div>
    </div>
);
const Row = ({ label, value, accent }) => (
    <div className="flex items-center justify-between text-xs">
        <span className="text-slate-500">{label}</span>
        <span className={`font-medium ${accent || 'text-slate-700'}`}>{value ?? '-'}</span>
    </div>
);
const ProgressBar = ({ pct, color }) => (
    <div className="mt-1">
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
        </div>
        <div className="text-[10px] text-slate-400 mt-0.5 text-right">{pct}%</div>
    </div>
);
const GaugeCard = ({ label, value, unit, color, icon }) => (
    <div className="bg-white border border-slate-100 rounded-xl p-3 text-center shadow-sm">
        <div className="text-[10px] text-slate-400 font-semibold mb-1 flex items-center justify-center gap-1">{icon}{label}</div>
        <div className={`text-xl font-bold ${color}`}>{value ?? '-'}</div>
        {unit && <div className="text-[10px] text-slate-400">{unit}</div>}
    </div>
);

function formatUptime(sec) {
    if (!sec) return '-';
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (h > 0) return `${h}小时${m}分`;
    return `${m}分${sec % 60}秒`;
}

function DeviceInfoPanel({ info, perf }) {
    if (!info && !perf) return <div className="text-center py-8 text-slate-400 text-sm">暂无设备信息（设备上线后约 30 秒开始采集）</div>;

    // Parse UA
    const parseUA = (ua) => {
        if (!ua) return { os: '未知', browser: '未知', device: '' };
        let os = '未知';
        const androidMatch = ua.match(/Android\s([\d.]+)/);
        if (androidMatch) os = `Android ${androidMatch[1]}`;
        else if (/Windows/.test(ua)) os = ua.match(/Windows NT ([\d.]+)/)?.[0] || 'Windows';
        else if (/Mac OS/.test(ua)) os = 'macOS';
        else if (/Linux/.test(ua)) os = 'Linux';
        let browser = '未知';
        if (/Chrome\/([\d.]+)/.test(ua)) browser = `Chrome ${ua.match(/Chrome\/([\d.]+)/)[1]}`;
        if (/wv\)/.test(ua) || /WebView/.test(ua)) browser += ' (WebView)';
        const model = ua.match(/;\s*([^;)]+)\s*Build\//)?.[1]?.trim() || '';
        return { os, browser, device: model };
    };

    const uaInfo = info ? parseUA(info.userAgent) : null;

    // Memory from perf snapshot (most recent)
    const mem = perf?.memory || info?.memory;
    const memPct = mem ? Math.round(mem.jsHeapUsed / mem.jsHeapLimit * 100) : null;
    const memBarColor = memPct > 80 ? 'bg-red-500' : memPct > 60 ? 'bg-amber-500' : 'bg-emerald-500';
    const memTextColor = memPct > 80 ? 'text-red-600' : memPct > 60 ? 'text-amber-600' : 'text-emerald-600';

    // FPS
    const fpsColor = perf?.fps >= 50 ? 'text-emerald-600' : perf?.fps >= 30 ? 'text-amber-600' : 'text-red-600';

    return (
        <div>
            {/* ═══ Real-time Performance Gauges ═══ */}
            {perf && (
                <>
                    <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">📊 实时性能（每 30 秒刷新）</h4>
                    <div className="grid grid-cols-4 gap-2 mb-4">
                        <GaugeCard label="FPS" value={perf.fps} unit={`最低 ${perf.fpsMin} / 最高 ${perf.fpsMax}`} color={fpsColor} />
                        <GaugeCard label="内存" value={mem ? `${mem.jsHeapUsed}` : '-'} unit={mem ? `/ ${mem.jsHeapLimit} MB` : ''} color={memTextColor} />
                        <GaugeCard label="DOM 节点" value={perf.domNodes} unit="个" color={perf.domNodes > 3000 ? 'text-amber-600' : 'text-slate-700'} />
                        <GaugeCard label="运行时长" value={formatUptime(perf.uptimeSec)} color="text-slate-700" />
                    </div>

                    {/* Memory bar */}
                    {mem && (
                        <div className="mb-4">
                            <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                                <span>JS 内存使用率</span>
                                <span className={`font-bold ${memTextColor}`}>{mem.jsHeapUsed} / {mem.jsHeapLimit} MB ({memPct}%)</span>
                            </div>
                            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${memBarColor}`} style={{ width: `${memPct}%` }} />
                            </div>
                        </div>
                    )}

                    {/* Long tasks / jank */}
                    {(perf.longTasks > 0) && (
                        <Section title="⚠️ 卡顿检测">
                            <Row label="长任务次数 (>50ms)" value={`${perf.longTasks} 次`}
                                accent={perf.longTasks > 20 ? 'text-red-600' : perf.longTasks > 5 ? 'text-amber-600' : 'text-slate-700'} />
                            <Row label="长任务总耗时" value={`${perf.longTaskMs} ms`}
                                accent={perf.longTaskMs > 5000 ? 'text-red-600' : 'text-slate-700'} />
                        </Section>
                    )}
                </>
            )}

            {/* ═══ Static Device Info ═══ */}
            {info && uaInfo && (
                <>
                    <Section title="系统">
                        <Row label="操作系统" value={uaInfo.os} />
                        {uaInfo.device && <Row label="设备型号" value={uaInfo.device} />}
                        <Row label="浏览器" value={uaInfo.browser} />
                        <Row label="CPU 核心" value={info.cores ? `${info.cores} 核` : null} />
                        <Row label="设备内存" value={info.deviceMemory ? `${info.deviceMemory} GB` : null} />
                        <Row label="语言" value={info.language} />
                    </Section>

                    <Section title="屏幕 & 显示">
                        <Row label="屏幕分辨率" value={`${info.screenW} × ${info.screenH}`} />
                        <Row label="可用区域" value={`${info.screenAvailW} × ${info.screenAvailH}`} />
                        <Row label="视口" value={`${info.viewportW} × ${info.viewportH}`} />
                        <Row label="设备像素比" value={`${info.dpr}x`} />
                        <Row label="色深" value={info.colorDepth ? `${info.colorDepth} bit` : null} />
                    </Section>

                    {info.gpu && (
                        <Section title="GPU">
                            <Row label="厂商" value={info.gpu.vendor} />
                            <Row label="渲染器" value={info.gpu.renderer} />
                        </Section>
                    )}

                    {info.connection && (
                        <Section title="网络">
                            <Row label="类型" value={info.connection.type} />
                            <Row label="下行带宽" value={info.connection.downlink != null ? `${info.connection.downlink} Mbps` : null} />
                            <Row label="延迟 (RTT)" value={info.connection.rtt != null ? `${info.connection.rtt} ms` : null} />
                            <Row label="省流模式" value={info.connection.saveData ? '开启' : '关闭'} />
                        </Section>
                    )}

                    {info.battery && (
                        <Section title="电池">
                            <Row label="电量" value={`${info.battery.level}%`}
                                accent={info.battery.level < 20 ? 'text-red-600' : info.battery.level < 50 ? 'text-amber-600' : 'text-emerald-600'} />
                            <Row label="充电状态" value={info.battery.charging ? '充电中' : '未充电'} />
                        </Section>
                    )}

                    {info.storage && (
                        <Section title="存储">
                            <Row label="已使用" value={`${info.storage.usedMB} MB`} />
                            <Row label="配额" value={info.storage.quotaMB > 1024 ? `${(info.storage.quotaMB / 1024).toFixed(1)} GB` : `${info.storage.quotaMB} MB`} />
                        </Section>
                    )}
                </>
            )}
        </div>
    );
}

export default function StoreManager() {
    const [superKey, setSuperKey] = useState(() => sessionStorage.getItem('superKey') || '');
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAuthed, setIsAuthed] = useState(() => !!sessionStorage.getItem('superKey'));
    const [message, setMessage] = useState({ type: '', text: '' });
    const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });

    const [channelTab, setChannelTab] = useState('tv');
    const [cityFilter, setCityFilter] = useState('ALL');
    const [settingsStore, setSettingsStore] = useState(null);
    const [newStore, setNewStore] = useState({ id: '', name: '', adminKey: '', city: '福州' });
    const [searchQuery, setSearchQuery] = useState('');
    const [logStore, setLogStore] = useState(null);
    const [logs, setLogs] = useState([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const [deviceInfoStore, setDeviceInfoStore] = useState(null);
    const [logDetailData, setLogDetailData] = useState(null);

    const showToast = (type, text) => {
        setMessage({ type, text });
        setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    };

    useEffect(() => {
        if (superKey) loadAllData(superKey);
    }, []);

    // Auto refresh every 15s
    useEffect(() => {
        if (!isAuthed) return;
        const interval = setInterval(loadStores, 15000);
        return () => clearInterval(interval);
    }, [isAuthed, superKey]);

    const loadAllData = async (key = superKey) => {
        if (!key) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/super/stores?superKey=${key}`);
            const data = await res.json();
            setStores(Array.isArray(data) ? data : []);
            setIsAuthed(true);
        } catch {
            showToast('error', '数据加载失败');
        } finally {
            setLoading(false);
        }
    };

    const loadStores = () => {
        const key = superKey || sessionStorage.getItem('superKey');
        if (!key) return;
        fetch(`/api/super/stores?superKey=${key}`)
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => { setStores(Array.isArray(data) ? data : []); setIsAuthed(true); })
            .catch(() => {});
    };

    const handleLogin = async (key) => {
        setSuperKey(key);
        sessionStorage.setItem('superKey', key);
        await loadAllData(key);
    };

    const handleCreate = (e) => {
        e.preventDefault();
        let payloadKey = newStore.adminKey;
        if (channelTab === 'android' && !payloadKey) {
            payloadKey = 'android_' + Math.random().toString(36).substr(2, 6);
        }
        fetch('/api/super/create-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ superKey, storeData: { ...newStore, adminKey: payloadKey, channel: channelTab } })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    showToast('success', `子站点 ${data.store.id} 创建成功`);
                    setNewStore({ id: '', name: '', adminKey: '', city: '福州' });
                    loadStores();
                } else {
                    showToast('error', '创建失败: ' + data.error);
                }
            });
    };

    const handleDelete = (storeId) => {
        setConfirmState({
            open: true, title: '确认删除', danger: true,
            message: `确定要永久删除分站 "${storeId}" 吗？所有数据将无法恢复！`,
            onConfirm: async () => {
                setConfirmState(prev => ({ ...prev, open: false }));
                try {
                    const res = await fetch('/api/super/delete-store', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ superKey, storeId })
                    });
                    const data = await res.json();
                    if (data.success) { showToast('success', `分站 ${storeId} 已删除`); loadStores(); }
                    else showToast('error', '删除失败: ' + (data.error || '未知错误'));
                } catch { showToast('error', '网络错误'); }
            }
        });
    };

    if (!isAuthed && !loading) {
        return <PageContainer><div className="flex items-center justify-center min-h-[40vh] text-slate-400">正在验证权限...</div></PageContainer>;
    }

    const tabs = [
        { key: 'tv', label: '电视盒子', icon: Tv },
        { key: 'android', label: 'PC端', icon: Smartphone },
    ];

    const filteredStores = stores.filter(s => {
        if ((s.channel || 'tv') !== channelTab) return false;
        if (cityFilter !== 'ALL' && s.city !== cityFilter) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return (s.id || '').toLowerCase().includes(q) || (s.name || '').toLowerCase().includes(q);
        }
        return true;
    });

    const totalStores = stores.length;
    const onlineStores = filteredStores.filter(s => s.isOnline).length;

    const formatLastPing = (ts) => {
        if (!ts) return '从未连接';
        const diff = Date.now() - ts;
        if (diff < 60000) return '刚刚';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`;
        return `${Math.floor(diff / 86400000)} 天前`;
    };

    const openLogs = async (store) => {
        setLogStore(store);
        setLogsLoading(true);
        setLogs([]);
        try {
            const res = await fetch(`/api/super/store/${store.id}/logs?superKey=${superKey}&limit=200`);
            const data = await res.json();
            if (data.success) setLogs(data.logs || []);
        } catch { /* ignore */ }
        setLogsLoading(false);
    };

    const EVENT_LABELS = {
        online: { label: '上线', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Wifi },
        offline: { label: '离线', color: 'text-red-500', bg: 'bg-red-50', icon: WifiOff },
        navigate: { label: '页面跳转', color: 'text-blue-600', bg: 'bg-blue-50', icon: Eye },
        command: { label: '执行指令', color: 'text-amber-600', bg: 'bg-amber-50', icon: Settings },
        command_push: { label: '推送指令', color: 'text-amber-600', bg: 'bg-amber-50', icon: Zap },
        draw: { label: '抽奖', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: Zap },
        share: { label: '出票', color: 'text-violet-600', bg: 'bg-violet-50', icon: Share2 },
        clear_tickets: { label: '清除票据', color: 'text-orange-600', bg: 'bg-orange-50', icon: Trash2 },
        clean_logs: { label: '日志清理', color: 'text-slate-500', bg: 'bg-slate-50', icon: Trash2 },
        client_error: { label: '前端错误', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle },
        memory_warning: { label: '内存警告', color: 'text-orange-600', bg: 'bg-orange-50', icon: AlertTriangle },
        page_close: { label: '页面关闭', color: 'text-rose-600', bg: 'bg-rose-50', icon: Monitor },
    };

    return (
        <PageContainer>
            <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message}
                confirmLabel="确认删除" danger onConfirm={confirmState.onConfirm || (() => {})}
                onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))} />

            <PageHeader icon={Store} title="门店管理" description={`共 ${totalStores} 个子站点 · ${onlineStores} 个在线`}>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                            placeholder="搜索门店..." className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 w-52 transition-all" />
                    </div>
                </div>
            </PageHeader>

            {/* Toast */}
            {message.text && (
                <div className={`mb-4 p-3.5 rounded-xl flex items-center gap-2 text-sm font-medium ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                    <span>{message.text}</span>
                </div>
            )}

            <TabBar tabs={tabs} activeKey={channelTab} onChange={setChannelTab} />

            {/* City filter */}
            <div className="flex items-center gap-2 mt-5 mb-6 overflow-x-auto pb-1">
                <button onClick={() => setCityFilter('ALL')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${cityFilter === 'ALL' ? 'bg-[#1e3a5f] text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-200 hover:text-slate-600'}`}>
                    全部
                </button>
                {FUJIAN_CITIES.map(city => (
                    <button key={city} onClick={() => setCityFilter(city)}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${cityFilter === city ? 'bg-blue-500 text-white shadow-sm' : 'bg-white text-slate-400 border border-slate-200 hover:border-blue-200 hover:text-slate-600'}`}>
                        {city}
                    </button>
                ))}
            </div>

            {/* Create form */}
            <Card>
                <div className="flex items-center gap-3 mb-5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                        <Plus size={15} className="text-emerald-500" />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800">新增门店</h3>
                </div>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                    <div>
                        <label className="block text-xs text-slate-400 font-semibold mb-1.5">门店 ID</label>
                        <input type="text" value={newStore.id} onChange={e => setNewStore(prev => ({ ...prev, id: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 font-semibold mb-1.5">门店名称</label>
                        <input type="text" value={newStore.name} onChange={e => setNewStore(prev => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" required />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 font-semibold mb-1.5">管理密钥</label>
                        <input type="text" value={newStore.adminKey} onChange={e => setNewStore(prev => ({ ...prev, adminKey: e.target.value }))}
                            placeholder={channelTab === 'android' ? '自动生成' : '必填'}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 font-semibold mb-1.5">城市</label>
                        <select value={newStore.city} onChange={e => setNewStore(prev => ({ ...prev, city: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                            {FUJIAN_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>
                    <button type="submit" className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white rounded-xl text-sm font-semibold hover:from-[#163050] hover:to-[#1e3a5f] transition-all shadow-sm active:scale-[0.98]">
                        <Plus size={15} /> 创建门店
                    </button>
                </form>
            </Card>

            {/* Store list */}
            <div className="mt-6 space-y-3">
                {filteredStores.length === 0 ? (
                    <Card>
                        <div className="text-center py-10 text-slate-300 text-sm">暂无匹配的门店</div>
                    </Card>
                ) : (
                    filteredStores.map(store => (
                        <Card key={store.id} className="hover:shadow-md transition-all group">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e3a5f]/10 to-blue-100/50 flex items-center justify-center group-hover:from-[#1e3a5f]/20 transition-colors">
                                        <Globe size={18} className="text-[#1e3a5f]" />
                                        <span className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${store.isOnline ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-slate-800">{store.name || store.id}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold flex items-center gap-1 ${
                                                store.isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'
                                            }`}>
                                                {store.isOnline ? <><Wifi size={9} /> 在线</> : <><WifiOff size={9} /> 离线</>}
                                            </span>
                                            {store.isOnline && store.currentPage && store.currentPage !== 'offline' && (
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-500 font-medium">
                                                    {store.currentPage}
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
                                            <span className="font-mono">{store.id}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span className="flex items-center gap-1"><MapPin size={10} />{store.city || '未设置'}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span>{store.channel === 'android' ? 'PC端' : '电视盒子'}</span>
                                            <span className="w-1 h-1 rounded-full bg-slate-300" />
                                            <span className="flex items-center gap-1"><Clock size={9} />{formatLastPing(store.lastPing)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {(store.deviceInfo || store.perfSnapshot) && (
                                        <button onClick={() => setDeviceInfoStore(store)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-50 text-cyan-600 border border-cyan-100 rounded-xl text-xs font-medium hover:bg-cyan-100 transition-all">
                                            <Cpu size={12} /> 监控
                                        </button>
                                    )}
                                    <button onClick={() => openLogs(store)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-600 border border-violet-100 rounded-xl text-xs font-medium hover:bg-violet-100 transition-all">
                                        <FileText size={12} /> 日志
                                    </button>
                                    <button onClick={() => setSettingsStore(store)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-medium hover:bg-slate-100 hover:border-slate-300 transition-all">
                                        <Settings size={12} /> 配置
                                    </button>
                                    <a href={`/#/s/${store.id}`} target="_blank"
                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-xs font-medium hover:bg-blue-100 transition-all">
                                        <Eye size={12} /> 预览
                                    </a>
                                    {store.id !== 'default' && (
                                        <button onClick={() => handleDelete(store.id)}
                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-500 border border-red-100 rounded-xl text-xs font-medium hover:bg-red-100 transition-all">
                                            <Trash2 size={12} /> 删除
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>

            {/* Store Log Modal */}
            {logStore && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setLogStore(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl border border-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-none">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                                    <FileText size={15} className="text-violet-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">门店日志: {logStore.name || logStore.id}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{logStore.id} · 最近 200 条</p>
                                </div>
                            </div>
                            <button onClick={() => setLogStore(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                            {logsLoading ? (
                                <div className="text-center py-10 text-slate-400 text-sm">加载中...</div>
                            ) : logs.length === 0 ? (
                                <div className="text-center py-10 text-slate-300 text-sm">暂无日志</div>
                            ) : (
                                <div className="space-y-2">
                                    {logs.map(log => {
                                        const ev = EVENT_LABELS[log.event] || { label: log.event, color: 'text-slate-600', bg: 'bg-slate-50', icon: Clock };
                                        const IconComp = ev.icon;
                                        const time = new Date(log.created_at);

                                        // Try to parse structured JSON detail (page_close / offline)
                                        let parsed = null;
                                        let briefText = log.detail;
                                        if ((log.event === 'page_close' || log.event === 'offline') && log.detail) {
                                            try {
                                                const d = JSON.parse(log.detail);
                                                if (d && typeof d === 'object' && (d.perf || d.deviceInfo)) {
                                                    parsed = d;
                                                    const p = d.perf;
                                                    const m = p?.memory;
                                                    const reasonMap = { beforeunload: '正常关闭', pagehide: '页面隐藏', pagehide_bfcache: '返回缓存', visibilitychange_hidden: '切到后台', heartbeat_timeout: '心跳超时(疑似崩溃)' };
                                                    briefText = reasonMap[d.reason] || d.reason || '';
                                                    if (p) {
                                                        const parts = [];
                                                        if (p.fps != null) parts.push(`FPS:${p.fps}`);
                                                        if (m) parts.push(`内存:${m.jsHeapUsed}/${m.jsHeapLimit}MB`);
                                                        if (p.domNodes) parts.push(`DOM:${p.domNodes}`);
                                                        if (parts.length) briefText += ' · ' + parts.join(' · ');
                                                    }
                                                }
                                            } catch { /* not JSON, use raw text */ }
                                        }

                                        return (
                                            <div key={log.id} className={`flex items-start gap-3 p-3 rounded-xl ${ev.bg} border border-transparent`}>
                                                <div className={`mt-0.5 flex-none ${ev.color}`}><IconComp size={14} /></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-xs font-bold ${ev.color}`}>{ev.label}</span>
                                                        <span className="text-[10px] text-slate-400">
                                                            {time.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}{' '}
                                                            {time.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                                        </span>
                                                        {parsed && (
                                                            <button onClick={() => setLogDetailData(parsed)}
                                                                className="ml-auto px-2 py-0.5 text-[10px] font-semibold bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all flex items-center gap-1">
                                                                <Cpu size={10} /> 详情
                                                            </button>
                                                        )}
                                                    </div>
                                                    {briefText && <p className="text-xs text-slate-500 mt-0.5 truncate">{briefText}</p>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Log Detail Sub-Modal (perf snapshot at page_close / offline) */}
            {logDetailData && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setLogDetailData(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl border border-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-none">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                                    <Monitor size={15} className="text-rose-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">
                                        {logDetailData.reason === 'heartbeat_timeout' ? '离线时设备快照' : '关闭时设备快照'}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        {{ beforeunload: '正常关闭', pagehide: '页面隐藏', pagehide_bfcache: '返回缓存', visibilitychange_hidden: '切到后台/被杀', heartbeat_timeout: '心跳超时(疑似崩溃)' }[logDetailData.reason] || logDetailData.reason}
                                        {logDetailData.url ? ` · ${logDetailData.url}` : ''}
                                    </p>
                                </div>
                            </div>
                            <button onClick={() => setLogDetailData(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                            <DeviceInfoPanel info={logDetailData.deviceInfo} perf={logDetailData.perf} />
                        </div>
                    </div>
                </div>
            )}

            {/* Device Info Modal */}
            {deviceInfoStore && (deviceInfoStore.deviceInfo || deviceInfoStore.perfSnapshot) && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeviceInfoStore(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl border border-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-none">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-cyan-50 flex items-center justify-center">
                                    <Cpu size={15} className="text-cyan-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">设备监控: {deviceInfoStore.name || deviceInfoStore.id}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">实时性能 · 每 30 秒刷新 | 硬件信息 · 每 5 分钟采集</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    id="btn-manual-collect"
                                    onClick={async () => {
                                        const btn = document.getElementById('btn-manual-collect');
                                        if (btn) { btn.disabled = true; btn.textContent = '采集中...'; }
                                        const sid = deviceInfoStore.id;
                                        try {
                                            await fetch(`/api/super/store/${sid}/command`, {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ superKey, command: { action: 'collect_info', timestamp: Date.now() } })
                                            });
                                            showToast('success', '采集指令已发送，等待设备响应...');
                                            // Wait for device heartbeat to deliver command + respond
                                            const refreshModal = async (delay) => {
                                                await new Promise(r => setTimeout(r, delay));
                                                const key = superKey || sessionStorage.getItem('superKey');
                                                const res = await fetch(`/api/super/stores?superKey=${key}`);
                                                const data = await res.json();
                                                if (Array.isArray(data)) {
                                                    setStores(data);
                                                    const updated = data.find(s => s.id === sid);
                                                    if (updated) setDeviceInfoStore(updated);
                                                }
                                            };
                                            // Retry at 3s and 8s to catch the response
                                            refreshModal(3000);
                                            refreshModal(8000).finally(() => {
                                                if (btn) { btn.disabled = false; btn.textContent = ''; }
                                            });
                                        } catch {
                                            showToast('error', '发送采集指令失败');
                                            if (btn) { btn.disabled = false; btn.textContent = ''; }
                                        }
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 text-white rounded-xl text-xs font-semibold hover:bg-cyan-600 transition-all shadow-sm active:scale-[0.97] disabled:opacity-50"
                                >
                                    <RefreshCcw size={12} /> 手动采集
                                </button>
                                <button onClick={() => setDeviceInfoStore(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4">
                            <DeviceInfoPanel info={deviceInfoStore.deviceInfo} perf={deviceInfoStore.perfSnapshot} />
                        </div>
                    </div>
                </div>
            )}

            {/* Store Config Modal */}
            {settingsStore && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setSettingsStore(null)}>
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-y-auto shadow-xl border border-slate-200" onClick={e => e.stopPropagation()}>
                        <div className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 flex items-center justify-between z-10">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                    <Settings size={15} className="text-[#1e3a5f]" />
                                </div>
                                <h3 className="font-bold text-slate-800">编辑门店: {settingsStore.name || settingsStore.id}</h3>
                            </div>
                            <button onClick={() => setSettingsStore(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors">
                                <Key size={18} />
                            </button>
                        </div>
                        <div className="p-6">
                            <StoreConfig storeId={settingsStore.id} superKey={superKey} onClose={() => setSettingsStore(null)} />
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
