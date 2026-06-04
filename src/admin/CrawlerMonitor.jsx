import React, { useState, useEffect } from 'react';
import { Globe, RefreshCcw, Flag, Cpu, Clock, CheckCircle, AlertTriangle, Zap } from 'lucide-react';
import PageContainer from './components/PageContainer';
import PageHeader from './components/PageHeader';
import Card from './components/Card';

export default function CrawlerMonitor() {
    const DEFAULT_CRON_CONFIG = {
        days: [1, 3, 6],
        startHour: 21, startMinute: 25,
        endHour: 22, endMinute: 0,
        interval: 5,
        enabled: true
    };
    const [sourcesData, setSourcesData] = useState(null);
    const [refreshingSources, setRefreshingSources] = useState(false);
    const [historyData, setHistoryData] = useState(null);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [drawHistorySize, setDrawHistorySize] = useState(6);
    const [scrollHoldMs, setScrollHoldMs] = useState(3000);
    const [cronConfig, setCronConfig] = useState(() => {
        try {
            const cached = sessionStorage.getItem('cronConfig');
            if (cached) return { ...DEFAULT_CRON_CONFIG, ...JSON.parse(cached) };
        } catch { /* ignore */ }
        return DEFAULT_CRON_CONFIG;
    });
    const [cronSaving, setCronSaving] = useState(false);
    const [cronMessage, setCronMessage] = useState('');
    const [cronLoading, setCronLoading] = useState(false);
    const [nowTime, setNowTime] = useState(() => new Date());
    const [configMessage, setConfigMessage] = useState({ type: '', text: '' });

    const superKey = sessionStorage.getItem('superKey');

    const loadSources = () => {
        fetch('/api/system/sources')
            .then(r => r.json())
            .then(data => {
                const payload = data?.data || data;
                setSourcesData(payload);
                if (payload?.drawHistory?.games?.length > 0) setHistoryData(payload.drawHistory);
                if (payload?.status === 'uninitialized') handleRefreshSources();
            })
            .catch(console.error);
    };

    const loadHistory = async (force = false) => {
        setLoadingHistory(true);
        try {
            const res = await fetch(`/api/system/draw-history?size=50${force ? '&force=true' : ''}`);
            const data = await res.json();
            if (data?.success && data.data) setHistoryData(data.data);
            else if (data?.games) setHistoryData(data);
        } catch (e) {
            console.error('历史开奖抓取失败: ' + e.message);
        }
        setLoadingHistory(false);
    };

    const loadConfig = async () => {
        if (!superKey) return;
        setCronLoading(true);
        try {
            const res = await fetch(`/api/super/config?superKey=${superKey}`);
            if (!res.ok) return;
            const cfg = await res.json();
            if (cfg.drawHistorySize !== undefined) setDrawHistorySize(cfg.drawHistorySize);
            if (cfg.scrollHoldMs !== undefined) setScrollHoldMs(cfg.scrollHoldMs);
            if (cfg.cronConfig) {
                setCronConfig(cfg.cronConfig);
                sessionStorage.setItem('cronConfig', JSON.stringify(cfg.cronConfig));
            }
        } catch (e) {
            console.error('加载配置失败:', e);
        } finally {
            setCronLoading(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!superKey) {
            setConfigMessage({ type: 'error', text: '请先登录超级管理员' });
            setTimeout(() => setConfigMessage({ type: '', text: '' }), 3000);
            return;
        }
        setConfigMessage({ type: 'info', text: '保存中...' });
        try {
            const res = await fetch('/api/super/update-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, drawHistorySize, scrollHoldMs })
            });
            const data = await res.json();
            if (data.success) {
                setConfigMessage({ type: 'success', text: '配置已保存' });
            } else {
                setConfigMessage({ type: 'error', text: '保存失败：' + (data.error || '未知错误') });
            }
        } catch {
            setConfigMessage({ type: 'error', text: '保存失败：网络错误' });
        }
        setTimeout(() => setConfigMessage({ type: '', text: '' }), 3000);
    };

    const toggleCronDay = (day) => {
        setCronConfig(prev => {
            const days = prev.days.includes(day) ? prev.days.filter(d => d !== day) : [...prev.days, day].sort();
            return { ...prev, days };
        });
    };

    const handleSaveCron = async () => {
        if (!superKey) {
            setCronMessage('请先登录超级管理员');
            setTimeout(() => setCronMessage(''), 3000);
            return;
        }
        setCronSaving(true);
        try {
            const res = await fetch('/api/super/update-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, cronConfig })
            });
            const data = await res.json();
            if (data.success) {
                sessionStorage.setItem('cronConfig', JSON.stringify(cronConfig));
                setCronMessage('自动抓取配置已保存');
            } else {
                setCronMessage('保存失败：' + (data.error || '未知错误'));
            }
        } catch {
            setCronMessage('保存失败：网络错误');
        } finally {
            setCronSaving(false);
            setTimeout(() => setCronMessage(''), 3000);
        }
    };

    const handleRefreshSources = async () => {
        setRefreshingSources(true);
        try {
            const res = await fetch('/api/system/sources/refresh', { method: 'POST' });
            const result = await res.json();
            if (result.success) {
                setSourcesData(result.data);
                if (result.data?.drawHistory?.games?.length > 0) setHistoryData(result.data.drawHistory);
                else await loadHistory(true);
            }
        } catch (e) {
            console.error('抓取失败: ' + e.message);
        }
        setRefreshingSources(false);
    };

    useEffect(() => {
        loadSources();
        loadHistory();
        if (superKey) loadConfig();
    }, []);

    useEffect(() => {
        const timer = setInterval(() => setNowTime(new Date()), 60000);
        return () => clearInterval(timer);
    }, []);

    const getNextCronTime = (config, now) => {
        if (!config?.enabled) return null;
        const days = Array.isArray(config.days) ? config.days.map(Number).filter(n => Number.isInteger(n)) : [];
        if (days.length === 0) return null;
        const interval = Math.max(1, Number(config.interval) || 1);
        const startHour = Number(config.startHour) || 0;
        const startMinute = Number(config.startMinute) || 0;
        const endHour = Number(config.endHour) || 0;
        const endMinute = Number(config.endMinute) || 0;
        const startMins = startHour * 60 + startMinute;
        let endMins = endHour * 60 + endMinute;
        if (endMins < startMins) endMins += 24 * 60;

        for (let offset = 0; offset <= 7; offset += 1) {
            const dayBase = new Date(now);
            dayBase.setDate(now.getDate() + offset);
            dayBase.setHours(0, 0, 0, 0);
            if (!days.includes(dayBase.getDay())) continue;
            const nowMins = now.getHours() * 60 + now.getMinutes();
            let candidateMins = offset === 0 ? Math.max(startMins, nowMins) : startMins;
            const delta = (candidateMins - startMins) % interval;
            if (delta !== 0) candidateMins += (interval - delta);
            if (candidateMins > endMins) continue;
            const candidate = new Date(dayBase);
            const normalized = candidateMins >= 24 * 60 ? candidateMins - 24 * 60 : candidateMins;
            candidate.setHours(Math.floor(normalized / 60), normalized % 60, 0, 0);
            if (candidate.getTime() < now.getTime() && offset === 0) {
                const nextMins = candidateMins + interval;
                if (nextMins <= endMins) {
                    candidate.setHours(Math.floor(nextMins / 60) % 24, nextMins % 60, 0, 0);
                } else continue;
            }
            return candidate;
        }
        return null;
    };

    const formatDateTime = (date) => date.toLocaleString('zh-CN', {
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: false
    });

    const nextCronTime = getNextCronTime(cronConfig, nowTime);
    const nextCronText = cronLoading
        ? '加载中...'
        : (cronConfig?.enabled
            ? (nextCronTime ? formatDateTime(nextCronTime) : '未配置')
            : '未启用');

    const fujian = sourcesData?.fujianDraws || [];
    const puppeteerEnabled = sourcesData?.puppeteerEnabled;
    const historyGames = (historyData?.games?.length > 0)
        ? historyData.games
        : (sourcesData?.drawHistory?.games || []);

    const DrawCard = ({ draw, isFujian }) => (
        <div className={`relative flex flex-col gap-1 p-3 rounded-xl border overflow-hidden ${isFujian ? 'border-orange-100 bg-gradient-to-br from-orange-50/80 to-orange-100/40' : 'border-purple-100 bg-gradient-to-br from-purple-50/80 to-purple-100/40'}`}>
            <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-sm">{draw.name}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${isFujian ? 'text-orange-700 bg-orange-100' : 'text-purple-700 bg-purple-100'}`}>
                    {draw.issue || '同步官方'}
                </span>
            </div>
            {draw.numbers?.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-1">
                    {draw.numbers.map((n, i) => (
                        <span key={i} className={`inline-flex items-center justify-center text-xs font-bold rounded-full w-6 h-6 shadow-sm ${isFujian ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white' : 'bg-gradient-to-br from-purple-600 to-purple-700 text-white'}`}>{n}</span>
                    ))}
                    {draw.bonusNumbers?.length > 0 && (
                        <>
                            <span className="text-gray-400 text-xs self-center">+</span>
                            {draw.bonusNumbers.map((n, i) => (
                                <span key={`b-${i}`} className="inline-flex items-center justify-center text-xs font-bold rounded-full w-6 h-6 bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm">{n}</span>
                            ))}
                        </>
                    )}
                </div>
            ) : (
                <div className="text-slate-400 text-xs mt-1">暂未抓取号码</div>
            )}
            <div className="flex items-center justify-between mt-1">
                <span className="text-xs text-slate-400">{draw.time}</span>
                <span className={`text-xs font-semibold ${draw.pool && draw.pool !== '--' ? 'text-emerald-600' : 'text-slate-300'}`}>
                    奖池: {draw.pool && draw.pool !== '--' ? `¥${draw.pool}` : '--'}
                </span>
            </div>
        </div>
    );

    const MessageBanner = ({ message, className = '' }) => {
        if (!message.text) return null;
        const styles = {
            success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            error: 'bg-red-50 text-red-700 border-red-100',
            info: 'bg-blue-50 text-blue-700 border-blue-100'
        };
        return (
            <div className={`px-3 py-2 rounded-xl text-xs font-medium border ${styles[message.type] || styles.info} ${className}`}>
                {message.text}
            </div>
        );
    };

    return (
        <PageContainer>
            <PageHeader
                icon={Globe}
                title="信源监控"
                description="官方信源接入与自动化抓取配置"
            >
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => loadHistory(true)}
                        disabled={loadingHistory}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-violet-50 text-violet-600 hover:bg-violet-100 transition-colors disabled:opacity-50"
                    >
                        <RefreshCcw size={15} className={loadingHistory ? 'animate-spin' : ''} />
                        {loadingHistory ? '加载中...' : '刷新历史'}
                    </button>
                    <button
                        onClick={handleRefreshSources}
                        disabled={refreshingSources}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-[#1e3a5f] text-white hover:bg-[#2a4d7a] transition-colors disabled:opacity-50"
                    >
                        <Zap size={15} />
                        {refreshingSources ? '全网抓取中...' : '强制抓取'}
                    </button>
                </div>
            </PageHeader>

            {/* Status Overview Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {/* 最后通信 - dark blue gradient */}
                <div className="relative bg-gradient-to-br from-[#1e3a5f] to-[#2a5a8f] rounded-2xl p-4 flex items-center gap-3 text-white overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
                    <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                        <Clock size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="text-[11px] text-white/60">最后通信</div>
                        <div className="text-xs font-semibold text-white">
                            {sourcesData?.timestamp && sourcesData?.status !== 'uninitialized'
                                ? new Date(sourcesData.timestamp).toLocaleTimeString('zh-CN')
                                : '未初始化'}
                        </div>
                    </div>
                </div>
                {/* 自动化浏览器 - green gradient */}
                <div className={`relative rounded-2xl p-4 flex items-center gap-3 text-white overflow-hidden ${puppeteerEnabled ? 'bg-gradient-to-br from-emerald-500 to-emerald-600' : 'bg-gradient-to-br from-amber-500 to-amber-600'}`}>
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
                    <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                        <Cpu size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="text-[11px] text-white/60">自动化浏览器</div>
                        <div className="text-xs font-semibold text-white">
                            {puppeteerEnabled ? '已启用' : '未安装'}
                        </div>
                    </div>
                </div>
                {/* 下次自动抓取 - purple gradient */}
                <div className="relative bg-gradient-to-br from-violet-500 to-violet-600 rounded-2xl p-4 flex items-center gap-3 text-white overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
                    <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                        <Clock size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="text-[11px] text-white/60">下次自动抓取</div>
                        <div className="text-xs font-semibold text-white">{nextCronText}</div>
                    </div>
                </div>
                {/* 福建玩法 - orange gradient */}
                <div className="relative bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-4 flex items-center gap-3 text-white overflow-hidden">
                    <div className="absolute -bottom-4 -right-4 w-20 h-20 rounded-full bg-white/5" />
                    <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                        <Flag size={18} className="text-white" />
                    </div>
                    <div>
                        <div className="text-[11px] text-white/60">福建玩法</div>
                        <div className="text-xs font-semibold text-white">{fujian.length} 个已同步</div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Auto Fetch Config */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-5 bg-violet-500 rounded-full" />
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700">自动抓取配置</h3>
                                <p className="text-xs text-slate-400 mt-0.5">配置定时抓取信源的周期与时间段</p>
                            </div>
                        </div>
                        {cronMessage && <span className="text-xs font-medium text-slate-500">{cronMessage}</span>}
                        {cronLoading && !cronMessage && <span className="text-xs text-slate-400">配置加载中...</span>}
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-4">
                            <label className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 cursor-pointer hover:bg-slate-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={cronConfig.enabled}
                                    onChange={e => setCronConfig({ ...cronConfig, enabled: e.target.checked })}
                                    disabled={cronLoading}
                                    className="w-4 h-4 accent-[#1e3a5f] disabled:opacity-50"
                                />
                                <span className="text-sm font-medium text-slate-600">启用自动抓取</span>
                            </label>
                        </div>

                        <div>
                            <label className="text-xs text-slate-500 font-medium">抓取日</label>
                            <div className="mt-2 flex gap-2">
                                {['日', '一', '二', '三', '四', '五', '六'].map((label, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => toggleCronDay(idx)}
                                        disabled={cronLoading}
                                        className={`w-9 h-9 rounded-xl text-xs font-semibold transition-all disabled:opacity-50 ${cronConfig.days.includes(idx) ? 'bg-[#1e3a5f] text-white shadow-sm' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                    >
                                        {label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 font-medium">开始时间</label>
                                <div className="mt-1 flex items-center gap-1">
                                    <input type="number" min="0" max="23" value={cronConfig.startHour}
                                        onChange={e => setCronConfig({ ...cronConfig, startHour: parseInt(e.target.value) || 0 })}
                                        disabled={cronLoading}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50" />
                                    <span className="text-slate-400">:</span>
                                    <input type="number" min="0" max="59" value={cronConfig.startMinute}
                                        onChange={e => setCronConfig({ ...cronConfig, startMinute: parseInt(e.target.value) || 0 })}
                                        disabled={cronLoading}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium">结束时间</label>
                                <div className="mt-1 flex items-center gap-1">
                                    <input type="number" min="0" max="23" value={cronConfig.endHour}
                                        onChange={e => setCronConfig({ ...cronConfig, endHour: parseInt(e.target.value) || 0 })}
                                        disabled={cronLoading}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50" />
                                    <span className="text-slate-400">:</span>
                                    <input type="number" min="0" max="59" value={cronConfig.endMinute}
                                        onChange={e => setCronConfig({ ...cronConfig, endMinute: parseInt(e.target.value) || 0 })}
                                        disabled={cronLoading}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-center text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-medium">间隔 (分钟)</label>
                                <input type="number" min="1" max="60" value={cronConfig.interval}
                                    onChange={e => setCronConfig({ ...cronConfig, interval: parseInt(e.target.value) || 1 })}
                                    disabled={cronLoading}
                                    className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 disabled:opacity-50" />
                            </div>
                        </div>

                        <button
                            onClick={handleSaveCron}
                            disabled={cronSaving || cronLoading}
                            className="w-full py-2.5 bg-[#1e3a5f] text-white rounded-xl font-medium text-sm hover:bg-[#2a4d7a] transition-colors disabled:opacity-50"
                        >
                            {cronSaving ? '保存中...' : '保存抓取配置'}
                        </button>
                    </div>
                </Card>

                {/* History Scroll Config */}
                <Card>
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
                            <div>
                                <h3 className="text-sm font-semibold text-slate-700">历史开奖滚动配置</h3>
                                <p className="text-xs text-slate-400 mt-0.5">配置往期轮播期数和滚动停留时间</p>
                            </div>
                        </div>
                    </div>
                    <MessageBanner message={configMessage} className="mb-4" />
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="text-xs text-slate-500 font-medium">往期轮播期数</label>
                            <input type="number" min="1" max="50" value={drawHistorySize}
                                onChange={e => setDrawHistorySize(Number(e.target.value) || 1)}
                                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-medium">滚动停留 (毫秒)</label>
                            <input type="number" min="1000" max="10000" value={scrollHoldMs}
                                onChange={e => setScrollHoldMs(Number(e.target.value) || 1000)}
                                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
                        </div>
                        <div className="flex items-end gap-2">
                            <button onClick={loadConfig}
                                className="px-4 py-2 text-sm font-medium rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                                读取配置
                            </button>
                            <button onClick={handleSaveConfig}
                                className="px-4 py-2 text-sm font-medium rounded-xl bg-[#1e3a5f] text-white hover:bg-[#2a4d7a] transition-colors">
                                保存配置
                            </button>
                        </div>
                    </div>
                </Card>

                {/* Data Source Status */}
                <Card>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1.5 h-5 bg-emerald-500 rounded-full" />
                        <h3 className="text-sm font-semibold text-slate-700">数据源状态</h3>
                    </div>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: '公益金数据', key: 'welfare', desc: (d) => d ? `${(d.national?.length || 0) + (d.fujian?.length || 0)} 项` : '暂无' },
                            { label: '全国行业资讯', key: 'industry', desc: (d) => d ? `${d.length} 条` : '暂无' },
                            { label: '地方体彩动态', key: 'local', desc: (d) => d ? `${d.length} 条` : '暂无' },
                            { label: '大盘开奖公告', key: 'draws', desc: (d) => d ? `${d.length} 个玩法` : '暂无' },
                        ].map(card => {
                            const hasData = sourcesData?.[card.key]?.length > 0 || (card.key === 'welfare' && sourcesData?.welfare);
                            return (
                                <div key={card.key} className="relative p-4 rounded-xl bg-slate-50/80 flex items-center justify-between hover:shadow-sm transition-shadow overflow-hidden border-l-4 border-l-emerald-500">
                                    <div>
                                        <div className="text-sm font-semibold text-slate-700">{card.label}</div>
                                        <div className="text-xs text-slate-400 mt-0.5">{card.desc(sourcesData?.[card.key])}</div>
                                    </div>
                                    <span className={`w-2.5 h-2.5 rounded-full ${hasData ? 'bg-emerald-500' : 'bg-red-400'}`} />
                                </div>
                            );
                        })}
                    </div>

                    {/* Fujian games */}
                    <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: '福建36选7', id: 'fj367' },
                            { label: '福建31选7', id: 'fj317' },
                            { label: '福建31选7附加', id: 'fj317fj' },
                            { label: '福建22选5', id: 'fj225' },
                        ].map(card => {
                            const game = fujian.find(d => d.id === card.id);
                            const hasData = game?.numbers?.length > 0;
                            return (
                                <div key={card.id} className="relative p-4 rounded-xl bg-orange-50/40 flex items-center justify-between hover:shadow-sm transition-shadow overflow-hidden border-l-4 border-l-orange-500">
                                    <div>
                                        <div className="text-sm font-semibold text-orange-700">{card.label}</div>
                                        <div className="text-xs text-orange-400 mt-0.5">
                                            {hasData ? `期号 ${game.issue} · 已同步` : (puppeteerEnabled ? '等待爬取' : '浏览器未启用')}
                                        </div>
                                    </div>
                                    <span className={`w-2.5 h-2.5 rounded-full ${hasData ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                                </div>
                            );
                        })}
                    </div>
                </Card>

                {/* Refreshing indicator */}
                {refreshingSources && (
                    <div className="flex items-center justify-center p-8 bg-blue-50/50 rounded-2xl border border-blue-100 animate-pulse">
                        <div className="flex flex-col items-center gap-3">
                            <RefreshCcw className="text-[#1e3a5f] animate-spin" size={28} />
                            <span className="text-sm font-medium text-[#1e3a5f]">正在抓取国家+福建省最新数据...</span>
                        </div>
                    </div>
                )}

                {/* Detailed data */}
                {sourcesData && sourcesData.status !== 'uninitialized' && (
                    <>
                        {/* Welfare data */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-5 bg-blue-500 rounded-full" />
                                        <h3 className="text-sm font-semibold text-slate-700">国家体彩公益金</h3>
                                    </div>
                                    <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full font-medium">全国统筹</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {sourcesData.welfare?.national?.map(item => (
                                        <div key={item.id} className="bg-blue-50/30 rounded-xl p-4 border border-blue-100/50 flex flex-col items-center text-center">
                                            <div className="text-slate-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">{item.title}</div>
                                            <div className={`font-bold text-blue-600 flex items-baseline gap-1 ${item.isDate ? 'text-lg' : 'text-2xl'}`}>
                                                {item.value} <span className="text-xs font-normal text-slate-400">{item.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!sourcesData.welfare?.national?.length) && (
                                        <div className="col-span-3 text-center text-slate-400 text-sm py-4">等待抓取全国数据...</div>
                                    )}
                                </div>
                            </Card>

                            <Card>
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                                        <h3 className="text-sm font-semibold text-slate-700">福建体彩公益金</h3>
                                    </div>
                                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-medium">地方留存</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    {sourcesData.welfare?.fujian?.map(item => (
                                        <div key={item.id} className="bg-orange-50/30 rounded-xl p-4 border border-orange-200/50 flex flex-col items-center text-center">
                                            <div className="text-orange-400 text-[10px] font-semibold mb-1 uppercase tracking-wider">{item.title}</div>
                                            <div className={`font-bold text-orange-600 flex items-baseline gap-1 ${item.isDate ? 'text-lg' : 'text-2xl'}`}>
                                                {item.value} <span className="text-xs font-normal text-orange-400">{item.unit}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {(!sourcesData.welfare?.fujian?.length) && (
                                        <div className="col-span-3 text-center text-slate-400 text-sm py-4">等待抓取福建数据...</div>
                                    )}
                                </div>
                            </Card>
                        </div>

                        {/* Fujian draws */}
                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-5 bg-orange-500 rounded-full" />
                                    <h3 className="text-sm font-semibold text-slate-700">福建省信源 · 最新开奖</h3>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${puppeteerEnabled ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {puppeteerEnabled ? '自动化浏览器已启用' : 'Fallback 模式'}
                                    </span>
                                    <span className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded-full font-medium">{fujian.length} 个玩法</span>
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                                {fujian.map(draw => <DrawCard key={draw.id} draw={draw} isFujian={true} />)}
                                {fujian.length === 0 && <div className="col-span-4 text-center text-slate-400 text-sm py-4">无数据</div>}
                            </div>
                        </Card>

                        {/* History tables */}
                        {historyGames.map(game => (
                            <Card key={game.key} noPadding>
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1.5 h-5 bg-purple-500 rounded-full" />
                                        <h3 className="text-sm font-semibold text-slate-700">{game.name} · 历史开奖</h3>
                                    </div>
                                    <span className="text-xs text-slate-400">共 {game.history?.length || 0} 期</span>
                                </div>
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50/80 text-slate-400 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10">
                                            <tr>
                                                <th className="px-5 py-3 w-28">期号</th>
                                                <th className="px-5 py-3 w-36">日期</th>
                                                <th className="px-5 py-3">开奖号码</th>
                                                <th className="px-5 py-3 w-32 text-right">奖池</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {game.history?.map((item, index) => (
                                                <tr key={`${game.key}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3 font-semibold text-slate-700 whitespace-nowrap">{item.issue || '--'}</td>
                                                    <td className="px-5 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{item.date || '--'}</td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex flex-wrap items-center gap-1">
                                                            {(item.numbers || []).map((n, i) => (
                                                                <span key={i} className="inline-flex items-center justify-center text-xs font-bold rounded-full w-6 h-6 bg-gradient-to-br from-purple-600 to-purple-700 text-white shadow-sm">{n}</span>
                                                            ))}
                                                            {item.bonusNumbers?.length > 0 && (
                                                                <>
                                                                    <span className="text-slate-400 text-xs self-center">+</span>
                                                                    {item.bonusNumbers.map((n, i) => (
                                                                        <span key={`b-${i}`} className="inline-flex items-center justify-center text-xs font-bold rounded-full w-6 h-6 bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-sm">{n}</span>
                                                                    ))}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-right text-xs font-semibold text-emerald-600 whitespace-nowrap">
                                                        {item.pool ?? '--'}
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!game.history?.length) && (
                                                <tr><td colSpan="4" className="px-5 py-6 text-center text-slate-400">暂无数据</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        ))}
                        {historyGames.length === 0 && (
                            <Card>
                                <div className="text-center text-slate-400 text-sm py-6">暂无历史开奖数据</div>
                            </Card>
                        )}

                        {/* News tables */}
                        {[
                            { key: 'industry', title: '全国体彩行业资讯', color: 'blue' },
                            { key: 'local', title: '地方动态', color: 'green' },
                            { key: 'culture', title: '公益文化', color: 'purple' }
                        ].map(category => (
                            <Card key={category.key} noPadding>
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-5 bg-${category.color}-500 rounded-full`} />
                                        <h3 className="text-sm font-semibold text-slate-700">{category.title}</h3>
                                    </div>
                                    <span className="text-xs text-slate-400">合计 {sourcesData[category.key]?.length || 0} 条</span>
                                </div>
                                <div className="overflow-x-auto max-h-[400px]">
                                    <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50/80 text-slate-400 text-xs font-semibold uppercase tracking-wider sticky top-0 z-10">
                                            <tr>
                                                <th className="px-5 py-3 w-28">栏目标签</th>
                                                <th className="px-5 py-3">文章标题</th>
                                                <th className="px-5 py-3 w-32">发布日期</th>
                                                <th className="px-5 py-3 w-20 text-right">操作</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {sourcesData[category.key]?.map((item, index) => (
                                                <tr key={item.id || `${category.key}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <span className="px-2 py-1 rounded-lg text-xs font-semibold" style={{ backgroundColor: item.tagBg, color: item.tagColor }}>
                                                            {item.tag || category.key}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3 font-medium text-slate-800">
                                                        <div className="line-clamp-2 max-w-xl">{item.title}</div>
                                                    </td>
                                                    <td className="px-5 py-3 text-slate-400 font-mono text-xs whitespace-nowrap">{item.date}</td>
                                                    <td className="px-5 py-3 text-right">
                                                        <a href={item.url} target="_blank" rel="noreferrer"
                                                            className="inline-flex items-center gap-1 text-blue-500 hover:text-blue-600 text-xs font-semibold bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap">
                                                            查看源 ↗
                                                        </a>
                                                    </td>
                                                </tr>
                                            ))}
                                            {(!sourcesData[category.key]?.length) && (
                                                <tr><td colSpan="4" className="px-5 py-6 text-center text-slate-400">无数据</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        ))}
                    </>
                )}
            </div>
        </PageContainer>
    );
}
