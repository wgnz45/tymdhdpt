import React, { useState, useEffect } from 'react';
import { Sparkles, RefreshCw, CheckCircle, AlertCircle, Info } from 'lucide-react';
import PageContainer from './components/PageContainer';
import PageHeader from './components/PageHeader';
import Card from './components/Card';
import ConfirmDialog from './components/ConfirmDialog';

export default function FortuneManager() {
    const [data, setData] = useState({ zodiacs: [], constellations: [], lastUpdated: null });
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [showConfirm, setShowConfirm] = useState(false);

    const fetchFortune = async () => {
        try {
            const res = await fetch('/api/super/fortune');
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const result = await res.json();
            if (result.success) setData(result.data);
        } catch (e) {
            console.error('Fetch error:', e);
            setMessage({ type: 'error', text: '数据加载失败，请检查后端连接' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchFortune(); }, []);

    const handleRefresh = async () => {
        setShowConfirm(false);
        setRefreshing(true);
        setMessage({ type: 'info', text: '同步指令已发送，正在爬取数据，请绝对不要刷新页面...' });
        try {
            const superKey = sessionStorage.getItem('superKey');
            if (!superKey) { setMessage({ type: 'error', text: '鉴权失效：请重新登录超级管理员' }); return; }
            const res = await fetch('/api/super/fortune/refresh', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({ superKey })
            });
            if (!res.ok) throw new Error(`服务器响应异常 (${res.status})`);
            const result = await res.json();
            if (result.success) {
                setData(result.data);
                setMessage({ type: 'success', text: '同步成功！数据和图标均已更新。' });
            } else {
                setMessage({ type: 'error', text: `抓取失败: ${result.error || '未知错误'}` });
            }
        } catch (e) {
            setMessage({ type: 'error', text: `同步中断: ${e.message}` });
        } finally {
            setRefreshing(false);
            setTimeout(() => setMessage({ type: '', text: '' }), 15000);
        }
    };

    if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">正在加载数据...</div>;

    return (
        <PageContainer>
            <ConfirmDialog
                open={showConfirm}
                title="确认同步"
                message="确定要立即抓取最新的十二生肖和星座运势吗？整个过程约需 20-30 秒。"
                confirmLabel="开始同步"
                onConfirm={handleRefresh}
                onCancel={() => setShowConfirm(false)}
            />

            {/* Header area with subtle grid decoration */}
            <div className="relative">
                <div
                    className="pointer-events-none absolute -top-6 -right-6 w-48 h-48 opacity-[0.03]"
                    style={{
                        backgroundImage: `radial-gradient(circle, #7c3aed 1px, transparent 1px)`,
                        backgroundSize: '16px 16px'
                    }}
                />
                <PageHeader
                    icon={Sparkles}
                    title="今日运势"
                    description={`上次同步: ${data.lastUpdated ? new Date(data.lastUpdated).toLocaleString('zh-CN') : '从未同步'}`}
                >
                    <button
                        onClick={() => setShowConfirm(true)}
                        disabled={refreshing}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                            refreshing
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-sm shadow-purple-200 hover:shadow-md hover:shadow-purple-200'
                        }`}
                    >
                        <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                        {refreshing ? '同步中...' : '一键同步'}
                    </button>
                </PageHeader>
            </div>

            {/* Alert */}
            {message.text && (
                <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                    message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> :
                     message.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
                    <span>{message.text}</span>
                </div>
            )}

            <div className="space-y-6">
                {/* 12 Zodiacs */}
                <Card>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1 h-5 bg-purple-500 rounded-full" />
                            <h3 className="text-sm font-semibold text-slate-700">12 生肖运势预览</h3>
                        </div>
                        <span className="text-xs text-slate-400">每天凌晨自动更新</span>
                    </div>
                    {!data.zodiacs.length ? (
                        <div className="py-10 text-center text-slate-400 text-sm">暂无生肖数据，请点击上方同步</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {data.zodiacs.map(item => (
                                <div key={item.id} className="p-4 bg-slate-50/80 rounded-xl border border-gray-100 hover:border-purple-200 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all group">
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className="w-16 h-16 bg-gradient-to-br from-purple-50 to-purple-100/50 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden border border-purple-100/60 group-hover:scale-105 transition-transform">
                                            {item.icon ? <img src={item.icon} alt={item.name} className="w-full h-full object-contain" /> : <div className="text-xl font-bold text-purple-200">{item.name[0]}</div>}
                                        </div>
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        <div className="w-full pt-2 border-t border-gray-100 space-y-1.5 text-[11px]">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">幸运色</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3 h-3 rounded-full border border-gray-100" style={{ background: item.luckyColorHex || '#F0F0F0' }} />
                                                    <span className="text-slate-700 font-semibold">{item.luckyColor || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">幸运数</span>
                                                <span className="text-slate-700 font-semibold">{item.luckyNumber || '-'}</span>
                                            </div>
                                            <div className="text-left">
                                                <div className="text-purple-500 font-bold mb-1">今日吉宜：</div>
                                                <div className="text-slate-600 leading-snug h-8 overflow-hidden">{item.yi || '平稳顺遂'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* 12 Constellations */}
                <Card>
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                            <h3 className="text-sm font-semibold text-slate-700">12 星座运势预览</h3>
                        </div>
                        <span className="text-xs text-slate-400">实时抓取最新动态</span>
                    </div>
                    {!data.constellations.length ? (
                        <div className="py-10 text-center text-slate-400 text-sm">暂无星座数据，请点击上方同步</div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                            {data.constellations.map(item => (
                                <div key={item.id} className="p-4 bg-slate-50/80 rounded-xl border border-gray-100 hover:border-indigo-200 hover:bg-white hover:shadow-md hover:-translate-y-0.5 transition-all group">
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className="w-16 h-16 bg-gradient-to-br from-indigo-50 to-indigo-100/50 rounded-2xl shadow-sm flex items-center justify-center overflow-hidden border border-indigo-100/60 group-hover:scale-105 transition-transform">
                                            {item.icon ? <img src={item.icon} alt={item.name} className="w-full h-full object-contain" /> : <div className="text-xl font-bold text-indigo-200">{item.name[0]}</div>}
                                        </div>
                                        <div className="font-bold text-slate-800">{item.name}</div>
                                        <div className="w-full pt-2 border-t border-gray-100 space-y-1.5 text-[11px]">
                                            <div className="flex justify-between items-center">
                                                <span className="text-slate-400">幸运色</span>
                                                <div className="flex items-center gap-1.5">
                                                    <div className="w-3 h-3 rounded-full border border-gray-100" style={{ background: item.luckyColorHex || '#F0F0F0' }} />
                                                    <span className="text-slate-700 font-semibold">{item.luckyColor || '-'}</span>
                                                </div>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">幸运数</span>
                                                <span className="text-slate-700 font-semibold">{item.luckyNumber || '-'}</span>
                                            </div>
                                            <div className="text-left">
                                                <div className="text-indigo-500 font-bold mb-1">今日吉宜：</div>
                                                <div className="text-slate-600 leading-snug h-8 overflow-hidden">{item.yi || '顺其自然'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Card>

                {/* Info Note */}
                <div className="flex items-start gap-3 p-4 bg-amber-50/80 rounded-xl border border-amber-100 text-amber-800" style={{ borderLeft: '3px solid transparent', borderImage: 'linear-gradient(to bottom, #f59e0b, #d97706) 1' }}>
                    <Info size={18} className="shrink-0 text-amber-500 mt-0.5" />
                    <p className="text-xs leading-relaxed">
                        <b>管理说明：</b>运势数据抓取自星xz移动端。点击"一键同步"将同时刷新所有生肖和星座数据。抓取过程大约需要 20-30 秒，期间请不要离开此页面。系统已配置每日凌晨 00:05 自动执行全量同步。
                    </p>
                </div>
            </div>
        </PageContainer>
    );
}
