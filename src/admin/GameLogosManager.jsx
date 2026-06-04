import React, { useState, useEffect } from 'react';
import { RefreshCw, Loader2, AlertCircle, CheckCircle, ImageIcon, Gamepad2 } from 'lucide-react';
import PageContainer from './components/PageContainer';
import PageHeader from './components/PageHeader';
import Card from './components/Card';

/**
 * 互动中心游戏Logo管理页
 *  - 固定6个游戏格，仅支持替换Logo图片，不支持增删
 *  - 替换后前端互动中心弹窗即时生效（无需重启服务）
 *
 * 路由：/admin/game-logos
 */

const GAME_SLOTS = [
    { key: 'lotto',       label: '大乐透随机选号', desc: '超级大乐透入口' },
    { key: 'scratch',     label: '顶呱刮幸运选票', desc: '体彩顶呱刮入口' },
    { key: 'lianliankan', label: '体彩连连乐',     desc: '体彩连连看入口' },
    { key: 'sticker',     label: '乐小星大头贴',   desc: '中奖大头贴入口' },
    { key: 'xiaoxiaole',  label: '体彩消消乐',     desc: '体彩消消乐入口' },
    { key: 'flappy',      label: '乐小星快飞',     desc: '乐小星快飞入口' },
];

export default function GameLogosManager() {
    const superKey = sessionStorage.getItem('superKey') || '';
    const adminToken = sessionStorage.getItem('adminToken') || '';

    const [logos, setLogos] = useState({});
    const [loading, setLoading] = useState(false);
    const [replacing, setReplacing] = useState(null); // key of logo being replaced
    const [toast, setToast] = useState({ type: '', text: '' });

    const showToast = (type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast({ type: '', text: '' }), 2800);
    };

    const fetchLogos = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/game-logos', { cache: 'no-store' });
            const text = await res.text();
            if (text.trim().startsWith('<')) throw new Error('后端服务未启动，请重启 Node 服务');
            const data = JSON.parse(text);
            setLogos(data.logos || {});
        } catch (e) {
            showToast('error', '加载失败：' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLogos(); }, []);

    const handleReplace = (gameKey) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/webp';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 10 * 1024 * 1024) {
                showToast('error', '图片不能超过 10MB');
                return;
            }
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target.result);
                reader.readAsDataURL(file);
            });
            setReplacing(gameKey);
            try {
                const headers = { 'Content-Type': 'application/json' };
                if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;
                const res = await fetch('/api/game-logos/update', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ superKey, key: gameKey, imageDataUrl: dataUrl }),
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || '替换失败');
                showToast('success', `「${GAME_SLOTS.find(s => s.key === gameKey)?.label}」Logo已更新`);
                // 强制刷新：在URL加时间戳避免缓存
                setLogos(prev => ({
                    ...prev,
                    [gameKey]: { ...data.logo, url: data.logo.url + '?t=' + Date.now() }
                }));
            } catch (err) {
                showToast('error', err.message);
            } finally {
                setReplacing(null);
            }
        };
        input.click();
    };

    return (
        <PageContainer>
            <PageHeader
                icon={Gamepad2}
                title="互动中心游戏Logo"
                description="管理互动中心弹窗中6个游戏入口的Logo图片，替换后立即生效，无需重启。"
            />

            {/* Toast */}
            {toast.text && (
                <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium ${
                    toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {toast.text}
                </div>
            )}

            <Card>
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <ImageIcon size={18} className="text-violet-500" />
                        全部游戏Logo（{GAME_SLOTS.length}个固定位置）
                    </h3>
                    <button
                        onClick={fetchLogos}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition flex items-center gap-1.5"
                    >
                        <RefreshCw size={12} />
                        刷新
                    </button>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="text-center py-16 text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 size={18} className="animate-spin" /> 加载中…
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                            {GAME_SLOTS.map((slot) => {
                                const logo = logos[slot.key];
                                const isReplacing = replacing === slot.key;
                                return (
                                    <div
                                        key={slot.key}
                                        className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        {/* 图片预览区 */}
                                        <div className="aspect-square bg-slate-50 flex items-center justify-center overflow-hidden relative">
                                            {logo?.url ? (
                                                <img
                                                    src={logo.url}
                                                    alt={slot.label}
                                                    className="w-full h-full object-contain p-3"
                                                />
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-slate-300">
                                                    <ImageIcon size={36} />
                                                    <span className="text-xs">暂无图片</span>
                                                </div>
                                            )}
                                            {isReplacing && (
                                                <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                                    <Loader2 size={24} className="animate-spin text-violet-500" />
                                                </div>
                                            )}
                                        </div>

                                        {/* 信息与操作 */}
                                        <div className="p-3">
                                            <div className="text-sm font-semibold text-slate-800 truncate">{slot.label}</div>
                                            <div className="text-[10px] text-slate-400 mt-0.5 mb-2">{slot.desc}</div>
                                            {logo?.updatedAt && (
                                                <div className="text-[10px] text-slate-400 mb-3">
                                                    更新：{new Date(logo.updatedAt).toLocaleString('zh-CN')}
                                                </div>
                                            )}
                                            <button
                                                onClick={() => handleReplace(slot.key)}
                                                disabled={isReplacing}
                                                className="w-full px-3 py-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-700 text-xs font-semibold flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                                            >
                                                <RefreshCw size={12} />
                                                {isReplacing ? '上传中…' : '换图'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </Card>

            {/* Usage tips */}
            <div className="mt-4 px-1">
                <p className="text-xs text-slate-400">
                    💡 建议尺寸：500×500 px，PNG格式，支持透明背景。替换后前端互动中心弹窗立即显示新Logo（下次用户刷新页面后生效）。
                </p>
            </div>
        </PageContainer>
    );
}
