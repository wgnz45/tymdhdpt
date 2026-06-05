import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Save, Plus, X, Clock, Trash2, FileText, QrCode, Upload, RefreshCw } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';

const DEFAULT_MANAGER_TITLES = ['店长', '先生', '女士'];

export default function GlobalConfig() {
    const [isAuthed, setIsAuthed] = useState(() => !!sessionStorage.getItem('superKey'));
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Config state
    const [showCalculator, setShowCalculator] = useState(true);
    const [animationDuration, setAnimationDuration] = useState(5000);
    const [packageDuration, setPackageDuration] = useState(30000);
    const [managerTitleTemplates, setManagerTitleTemplates] = useState([...DEFAULT_MANAGER_TITLES]);

    const [logRetentionDays, setLogRetentionDays] = useState(30);
    const [logCount, setLogCount] = useState(null);
    const [cleaningLogs, setCleaningLogs] = useState(false);

    // Extra info from config
    const [cronConfig, setCronConfig] = useState(null);

    // QR Config state
    const [qrConfig, setQrConfig] = useState(null);
    const [qrLabel, setQrLabel] = useState('');
    const [qrSourceUrl, setQrSourceUrl] = useState('');
    const [qrMode, setQrMode] = useState('auto');
    const [qrEnabled, setQrEnabled] = useState(true);
    const [qrSaving, setQrSaving] = useState(false);
    const [qrUploading, setQrUploading] = useState(false);
    const [qrTimestamp, setQrTimestamp] = useState(Date.now());

    // Template add input
    const [newTemplate, setNewTemplate] = useState('');

    const superKey = sessionStorage.getItem('superKey');

    const loadConfig = useCallback(async (key) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/super/config?superKey=${key}`);
            const data = await res.json();
            if (data.error) {
                setMessage('加载失败: ' + data.error);
                return;
            }
            if (data.showCalculator !== undefined) setShowCalculator(data.showCalculator);
            if (data.animationDuration !== undefined) setAnimationDuration(data.animationDuration);
            if (data.packageDuration !== undefined) setPackageDuration(data.packageDuration);
            if (Array.isArray(data.managerTitleTemplates)) {
                setManagerTitleTemplates(
                    data.managerTitleTemplates.map(t => String(t).trim()).filter(Boolean)
                );
            }
            if (data.cronConfig) setCronConfig(data.cronConfig);
            if (data.logRetentionDays !== undefined) setLogRetentionDays(data.logRetentionDays);
        } catch {
            setMessage('网络错误，无法加载配置');
        } finally {
            setLoading(false);
        }
    }, []);

    const loadQRConfig = useCallback(async (key) => {
        try {
            const res = await fetch(`/api/super/qr-config?superKey=${key}`);
            const data = await res.json();
            if (!data.error) {
                setQrConfig(data);
                setQrLabel(data.label || '');
                setQrSourceUrl(data.sourceUrl || '');
                setQrMode(data.mode || 'auto');
                setQrEnabled(data.enabled !== false);
                setQrTimestamp(Date.now());
            }
        } catch (_) {}
    }, []);

    const handleSaveQR = async () => {
        setQrSaving(true);
        try {
            const res = await fetch('/api/super/qr-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, label: qrLabel, sourceUrl: qrSourceUrl, mode: qrMode, enabled: qrEnabled })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('二维码配置已保存');
                setQrTimestamp(Date.now());
                loadQRConfig(superKey);
            } else {
                setMessage('保存失败: ' + (data.error || ''));
            }
        } catch { setMessage('网络错误'); }
        setQrSaving(false);
        setTimeout(() => setMessage(''), 3000);
    };

    const handleUploadQR = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setQrUploading(true);
        try {
            const fd = new FormData();
            fd.append('superKey', superKey);
            fd.append('qrImage', file);
            const res = await fetch('/api/super/qr-upload', { method: 'POST', body: fd });
            const data = await res.json();
            if (data.success) {
                setMessage('二维码已上传，已切换为手动模式');
                setQrMode('manual');
                setQrTimestamp(Date.now());
                loadQRConfig(superKey);
            } else {
                setMessage('上传失败: ' + (data.error || ''));
            }
        } catch { setMessage('网络错误'); }
        setQrUploading(false);
        e.target.value = '';
        setTimeout(() => setMessage(''), 3000);
    };

    const handleLogin = async (key) => {
        await loadConfig(key);
        await loadQRConfig(key);
        setIsAuthed(true);
    };

    useEffect(() => {
        if (superKey) {
            loadConfig(superKey).then(() => setIsAuthed(true));
            loadQRConfig(superKey);
        }
    }, []);

    const handleSave = async () => {
        setLoading(true);
        setMessage('');
        try {
            const res = await fetch('/api/super/update-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    superKey,
                    showCalculator,
                    animationDuration,
                    packageDuration,
                    managerTitleTemplates,
                    logRetentionDays
                })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('全局配置已保存');
            } else {
                setMessage('保存失败: ' + (data.error || '未知错误'));
            }
        } catch {
            setMessage('网络错误，保存失败');
        } finally {
            setLoading(false);
            setTimeout(() => setMessage(''), 3000);
        }
    };

    const addTemplate = () => {
        const trimmed = newTemplate.trim();
        if (!trimmed) return;
        if (managerTitleTemplates.includes(trimmed)) {
            setNewTemplate('');
            return;
        }
        setManagerTitleTemplates(prev => [...prev, trimmed]);
        setNewTemplate('');
    };

    const removeTemplate = (title) => {
        if (managerTitleTemplates.length <= 1) {
            setMessage('至少需要保留一个称呼模板');
            setTimeout(() => setMessage(''), 2000);
            return;
        }
        setManagerTitleTemplates(prev => prev.filter(t => t !== title));
    };

    const handleTemplateKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            addTemplate();
        }
    };

    if (!isAuthed) {
        return <PageContainer><div className="flex items-center justify-center min-h-[40vh] text-slate-400">正在加载配置...</div></PageContainer>;
    }

    return (
        <PageContainer>
            <PageHeader
                icon={Settings}
                title="全局设置"
                description="系统级配置和参数调整"
            />

            {/* Status message */}
            {message && (
                <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center justify-between ${
                    message.includes('失败') || message.includes('错误')
                        ? 'bg-red-50 text-red-600 border border-red-100'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                }`}>
                    <span>{message}</span>
                    <button onClick={() => setMessage('')} className="text-current opacity-60 hover:opacity-100">
                        <X size={14} />
                    </button>
                </div>
            )}

            <div className="space-y-6">
                {/* Display Settings Card */}
                <Card>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                            <Settings size={15} className="text-[#1e3a5f]" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-800">显示设置</h3>
                    </div>

                    <div className="space-y-6">
                        {/* Calculator Toggle */}
                        <div className="flex items-center justify-between py-2">
                            <div>
                                <div className="text-sm font-medium text-slate-700">计算器按钮</div>
                                <div className="text-xs text-slate-400 mt-0.5">在门店前台显示计算器快捷入口</div>
                            </div>
                            <div
                                onClick={() => setShowCalculator(prev => !prev)}
                                className={`w-11 h-6 rounded-full transition-all cursor-pointer relative ${showCalculator ? 'bg-[#1e3a5f]' : 'bg-slate-300'}`}
                                role="switch"
                                aria-checked={showCalculator}
                                aria-label={showCalculator ? '关闭计算器' : '开启计算器'}
                            >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${showCalculator ? 'left-5' : 'left-0.5'}`} />
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* Animation Duration */}
                        <div className="py-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                        <Clock size={15} className="text-[#1e3a5f]" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">开奖动画时长</span>
                                </div>
                                <span className="text-sm font-semibold text-[#1e3a5f] tabular-nums">
                                    {(animationDuration / 1000).toFixed(1)}s
                                </span>
                            </div>
                            <input
                                type="range"
                                min={1000}
                                max={15000}
                                step={500}
                                value={animationDuration}
                                onChange={e => setAnimationDuration(Number(e.target.value))}
                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#1e3a5f]"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                <span>1.0s</span>
                                <span>15.0s</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="number"
                                    min={1000}
                                    max={15000}
                                    step={100}
                                    value={animationDuration}
                                    onChange={e => {
                                        const v = Number(e.target.value);
                                        if (v >= 1000 && v <= 15000) setAnimationDuration(v);
                                    }}
                                    className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none tabular-nums"
                                />
                                <span className="text-xs text-slate-400">ms</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* Package Duration */}
                        <div className="py-2">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                        <Clock size={15} className="text-[#1e3a5f]" />
                                    </div>
                                    <span className="text-sm font-medium text-slate-700">套餐展示时长</span>
                                </div>
                                <span className="text-sm font-semibold text-[#1e3a5f] tabular-nums">
                                    {(packageDuration / 1000).toFixed(1)}s
                                </span>
                            </div>
                            <input
                                type="range"
                                min={5000}
                                max={120000}
                                step={1000}
                                value={packageDuration}
                                onChange={e => setPackageDuration(Number(e.target.value))}
                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-[#1e3a5f]"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                <span>5s</span>
                                <span>120s</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="number"
                                    min={5000}
                                    max={120000}
                                    step={500}
                                    value={packageDuration}
                                    onChange={e => {
                                        const v = Number(e.target.value);
                                        if (v >= 5000 && v <= 120000) setPackageDuration(v);
                                    }}
                                    className="w-28 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none tabular-nums"
                                />
                                <span className="text-xs text-slate-400">ms</span>
                            </div>
                        </div>
                    </div>
                </Card>

                {/* Title Templates Card */}
                <Card>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                            <span className="text-[#1e3a5f] text-sm font-bold">T</span>
                        </div>
                        <h3 className="text-base font-semibold text-slate-800">称呼模板管理</h3>
                    </div>

                    <div className="space-y-4">
                        <p className="text-xs text-slate-400">
                            管理门店联系人的称呼选项。门店联系人格式为"姓氏 + 称呼模板"。
                        </p>

                        {/* Existing templates as pills */}
                        <div className="flex flex-wrap gap-2">
                            {managerTitleTemplates.map(title => (
                                <span
                                    key={title}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-[#1e3a5f]/10 text-[#1e3a5f] border border-[#1e3a5f]/20"
                                >
                                    {title}
                                    <button
                                        type="button"
                                        onClick={() => removeTemplate(title)}
                                        className="text-[#1e3a5f]/40 hover:text-red-500 transition-colors"
                                        aria-label={`移除 ${title}`}
                                    >
                                        <X size={14} />
                                    </button>
                                </span>
                            ))}
                        </div>

                        {/* Add new template */}
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newTemplate}
                                onChange={e => setNewTemplate(e.target.value)}
                                onKeyDown={handleTemplateKeyDown}
                                placeholder="输入新称呼模板"
                                maxLength={10}
                                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none"
                            />
                            <button
                                type="button"
                                onClick={addTemplate}
                                disabled={!newTemplate.trim()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-[#1e3a5f] text-white rounded-xl text-sm font-medium hover:bg-[#2a5a8f] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                <Plus size={14} />
                                添加
                            </button>
                        </div>
                    </div>
                </Card>

                {/* QR Code Management Card */}
                <Card>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                            <QrCode size={15} className="text-orange-500" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-800">二维码配置</h3>
                    </div>

                    <div className="space-y-5">
                        {/* 当前二维码预览 */}
                        <div className="flex items-start gap-4">
                            <div className="w-24 h-24 rounded-xl border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
                                {qrEnabled ? (
                                    <img
                                        src={`/api/fujian-lottery-qr?t=${qrTimestamp}`}
                                        alt="当前二维码"
                                        className="w-full h-full object-contain p-1"
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                    />
                                ) : (
                                    <span className="text-xs text-slate-400">已禁用</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0 space-y-1.5">
                                <div className="text-sm font-medium text-slate-700">{qrLabel || '未配置'}</div>
                                <div className="text-xs text-slate-400">
                                    模式：{qrMode === 'auto' ? '自动抓取' : '手动上传'}
                                </div>
                                {qrConfig?.currentFile && (
                                    <div className="text-xs text-slate-400">
                                        文件大小：{(qrConfig.currentFile.size / 1024).toFixed(1)} KB
                                        <span className="mx-1.5">|</span>
                                        更新时间：{new Date(qrConfig.currentFile.updatedAt).toLocaleString('zh-CN')}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* 开关 */}
                        <div className="flex items-center justify-between py-1">
                            <div>
                                <div className="text-sm font-medium text-slate-700">显示二维码</div>
                                <div className="text-xs text-slate-400 mt-0.5">关闭后前端不再显示此二维码</div>
                            </div>
                            <div
                                onClick={() => setQrEnabled(prev => !prev)}
                                className={`w-11 h-6 rounded-full transition-all cursor-pointer relative ${qrEnabled ? 'bg-orange-500' : 'bg-slate-300'}`}
                                role="switch" aria-checked={qrEnabled}
                            >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${qrEnabled ? 'left-5' : 'left-0.5'}`} />
                            </div>
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* 标签名称 */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1.5 block">显示名称</label>
                            <input
                                type="text"
                                value={qrLabel}
                                onChange={e => setQrLabel(e.target.value)}
                                placeholder="如：福建体彩服务号"
                                maxLength={20}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                            />
                        </div>

                        <div className="border-t border-gray-100" />

                        {/* 模式切换 */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">获取模式</label>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setQrMode('auto')}
                                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${qrMode === 'auto' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <RefreshCw size={14} className="inline mr-1.5 -mt-0.5" />
                                    自动抓取
                                </button>
                                <button
                                    onClick={() => setQrMode('manual')}
                                    className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-medium border transition-all ${qrMode === 'manual' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                                >
                                    <Upload size={14} className="inline mr-1.5 -mt-0.5" />
                                    手动上传
                                </button>
                            </div>
                        </div>

                        {/* 自动模式：源地址 */}
                        {qrMode === 'auto' && (
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">抓取地址</label>
                                <input
                                    type="url"
                                    value={qrSourceUrl}
                                    onChange={e => setQrSourceUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 outline-none"
                                />
                                <div className="text-[10px] text-slate-400 mt-1">系统将每 24 小时自动抓取一次该地址的图片</div>
                            </div>
                        )}

                        {/* 手动模式：上传 */}
                        {qrMode === 'manual' && (
                            <div>
                                <label className="text-sm font-medium text-slate-700 mb-1.5 block">上传二维码图片</label>
                                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-50 border-2 border-dashed border-orange-200 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors">
                                    <Upload size={16} className="text-orange-500" />
                                    <span className="text-sm font-medium text-orange-600">
                                        {qrUploading ? '上传中...' : '点击选择图片'}
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handleUploadQR}
                                        disabled={qrUploading}
                                        className="hidden"
                                    />
                                </label>
                            </div>
                        )}

                        {/* 保存按钮 */}
                        <button
                            onClick={handleSaveQR}
                            disabled={qrSaving}
                            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 disabled:opacity-50 transition-all"
                        >
                            {qrSaving ? (
                                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> 保存中...</>
                            ) : (
                                <><Save size={14} /> 保存二维码配置</>
                            )}
                        </button>
                    </div>
                </Card>

                {/* Log Management Card */}
                <Card>
                    <div className="flex items-center gap-2 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                            <FileText size={15} className="text-violet-500" />
                        </div>
                        <h3 className="text-base font-semibold text-slate-800">日志管理</h3>
                    </div>
                    <div className="space-y-5">
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <div className="text-sm font-medium text-slate-700">日志保留天数</div>
                                    <div className="text-xs text-slate-400 mt-0.5">超过此天数的门店日志将自动清理（每小时检查一次）</div>
                                </div>
                                <span className="text-sm font-semibold text-violet-600 tabular-nums">{logRetentionDays} 天</span>
                            </div>
                            <input
                                type="range"
                                min={1}
                                max={180}
                                step={1}
                                value={logRetentionDays}
                                onChange={e => setLogRetentionDays(Number(e.target.value))}
                                className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-violet-500"
                            />
                            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                                <span>1天</span>
                                <span>180天</span>
                            </div>
                        </div>
                        <div className="border-t border-gray-100" />
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-medium text-slate-700">手动清理</div>
                                <div className="text-xs text-slate-400 mt-0.5">立即清除超过保留天数的旧日志</div>
                            </div>
                            <button
                                onClick={async () => {
                                    setCleaningLogs(true);
                                    try {
                                        const res = await fetch('/api/super/clean-logs', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({ superKey, olderThanDays: logRetentionDays })
                                        });
                                        const data = await res.json();
                                        if (data.success) setMessage(`已清理 ${data.deleted} 条日志`);
                                        else setMessage('清理失败');
                                    } catch { setMessage('网络错误'); }
                                    setCleaningLogs(false);
                                    setTimeout(() => setMessage(''), 3000);
                                }}
                                disabled={cleaningLogs}
                                className="flex items-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-xl text-xs font-medium hover:bg-red-100 disabled:opacity-50 transition-all"
                            >
                                <Trash2 size={13} />
                                {cleaningLogs ? '清理中...' : '立即清理'}
                            </button>
                        </div>
                    </div>
                </Card>

                {/* System Info Card (cron) */}
                {cronConfig && (
                    <Card>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                <Clock size={15} className="text-[#1e3a5f]" />
                            </div>
                            <h3 className="text-sm font-semibold text-slate-700">系统调度信息</h3>
                        </div>
                        <div className="space-y-3 text-sm text-slate-600">
                            {cronConfig && (
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-slate-400 shrink-0 w-20 pt-0.5">Cron 配置</span>
                                    <span className="bg-slate-900 text-emerald-400 font-mono px-3 py-2 rounded-lg text-xs">
                                        {typeof cronConfig === 'string' ? cronConfig : JSON.stringify(cronConfig)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </Card>
                )}

                {/* Save Button */}
                <div className="pt-2 pb-4">
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-blue-900/20"
                    >
                        {loading ? (
                            <>
                                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                保存中...
                            </>
                        ) : (
                            <>
                                <Save size={16} />
                                保存配置
                            </>
                        )}
                    </button>
                </div>
            </div>
        </PageContainer>
    );
}
