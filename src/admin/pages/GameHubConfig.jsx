import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Gamepad2, Save, RotateCcw, Loader2, Check, AlertCircle, Eye, GripVertical } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';

const GAME_SLOTS = [
    { key: 'lotto',       name: '大乐透随机选号',   emoji: '🎰' },
    { key: 'scratch',     name: '顶呱刮运选票', emoji: '🎫' },
    { key: 'lianliankan', name: '体彩连连乐',   emoji: '🎯' },
    { key: 'sticker',     name: '乐小星大头贴', emoji: '📷' },
    { key: 'xiaoxiaole',  name: '体彩消消乐',   emoji: '💎' },
    { key: 'flappy',      name: '乐小星快飞',   emoji: '🐦' },
];

function getDefaultGames() {
    return GAME_SLOTS.map((s, i) => ({ key: s.key, name: s.name, displayName: s.name, enabled: true, order: i }));
}

const TOKEN = () => sessionStorage.getItem('adminToken');

export default function GameHubConfig() {
    const [games, setGames] = useState(getDefaultGames());
    const [logos, setLogos] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [dragIdx, setDragIdx] = useState(null);
    const [overIdx, setOverIdx] = useState(null);
    const rowRefs = useRef({});

    const fetchConfig = useCallback(() => {
        setLoading(true);
        Promise.all([
            fetch('/api/super/game-hub-config', { cache: 'no-store', headers: { Authorization: `Bearer ${TOKEN()}` } }).then(r => {
                if (r.status === 401) throw new Error('LOGIN_EXPIRED');
                return r.json();
            }),
            fetch('/api/game-logos', { cache: 'no-store' }).then(r => r.json()),
        ]).then(([configRes, logosRes]) => {
            if (configRes.config?.games?.length) {
                setGames(configRes.config.games.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
            }
            if (logosRes.logos) setLogos(logosRes.logos);
        }).catch((e) => {
            if (e.message === 'LOGIN_EXPIRED') {
                sessionStorage.removeItem('adminToken');
                sessionStorage.removeItem('adminUser');
                window.location.reload();
                return;
            }
            setMessage({ type: 'error', text: '加载失败' });
        }).finally(() => setLoading(false));
    }, []);

    useEffect(() => { fetchConfig(); }, [fetchConfig]);

    const handleDragStart = (idx) => {
        setDragIdx(idx);
    };

    const handleDragOver = (e, idx) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === idx) return;
        setOverIdx(idx);
    };

    const handleDrop = (idx) => {
        if (dragIdx === null || dragIdx === idx) {
            setDragIdx(null);
            setOverIdx(null);
            return;
        }
        const next = [...games];
        const [moved] = next.splice(dragIdx, 1);
        next.splice(idx, 0, moved);
        next.forEach((g, i) => g.order = i);
        setGames(next);
        setDragIdx(null);
        setOverIdx(null);
    };

    const handleDragEnd = () => {
        setDragIdx(null);
        setOverIdx(null);
    };

    const toggleEnabled = (idx) => {
        const next = [...games];
        next[idx] = { ...next[idx], enabled: !next[idx].enabled };
        setGames(next);
    };

    const updateDisplayName = (idx, val) => {
        const next = [...games];
        next[idx] = { ...next[idx], displayName: val };
        setGames(next);
    };

    const save = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/super/game-hub-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN()}` },
                body: JSON.stringify({ games }),
            });
            if (res.status === 401) {
                sessionStorage.removeItem('adminToken');
                sessionStorage.removeItem('adminUser');
                window.location.reload();
                return;
            }
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: '保存成功' });
            } else {
                setMessage({ type: 'error', text: data.error || '保存失败' });
            }
        } catch {
            setMessage({ type: 'error', text: '网络错误' });
        } finally {
            setSaving(false);
        }
    };

    const resetDefaults = () => {
        setGames(getDefaultGames());
        setMessage({ type: 'success', text: '已恢复默认，需点击保存生效' });
    };

    if (loading) {
        return (
            <PageContainer>
                <div className="flex items-center justify-center h-64 text-gray-400 gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" /> 加载中...
                </div>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <PageHeader icon={Gamepad2} title="互动中心配置" description="拖拽调整游戏展示顺序、名称和显示状态">
                <button onClick={resetDefaults} className="px-4 py-2 text-sm font-bold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-1.5">
                    <RotateCcw size={14} /> 恢复默认
                </button>
                <button onClick={save} disabled={saving} className="px-5 py-2 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-1.5 disabled:opacity-50">
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 保存配置
                </button>
            </PageHeader>

            {message && (
                <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                    {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />} {message.text}
                </div>
            )}

            <Card title="游戏列表管理" icon={Gamepad2}>
                <div className="divide-y divide-gray-100">
                    {games.map((game, idx) => {
                        const slot = GAME_SLOTS.find(s => s.key === game.key);
                        const logo = logos[game.key];
                        const isDragging = dragIdx === idx;
                        const isTarget = overIdx === idx && dragIdx !== idx;
                        const dropAbove = isTarget && dragIdx !== null && idx > dragIdx;
                        const dropBelow = isTarget && dragIdx !== null && idx < dragIdx;
                        return (
                            <div key={game.key} ref={el => rowRefs.current[idx] = el}>
                                {dropAbove && <div className="h-0.5 bg-blue-500 rounded-full mx-2 transition-all" />}
                                <div
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDrop={() => handleDrop(idx)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-4 py-4 px-2 transition-all select-none ${
                                        !game.enabled ? 'opacity-40' : ''
                                    } ${isDragging ? 'opacity-30 bg-gray-50' : ''} ${
                                        isTarget ? 'bg-blue-50/50' : ''
                                    }`}
                                >
                                    <div className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-gray-100 transition-colors" style={{ touchAction: 'none' }}>
                                        <GripVertical size={18} className="text-gray-400" />
                                    </div>

                                    <span className="w-6 text-center text-sm font-black text-gray-400">{idx + 1}</span>

                                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-200">
                                        {logo?.url ? (
                                            <img src={logo.url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-lg">{slot?.emoji}</div>
                                        )}
                                    </div>

                                    <span className="text-sm font-bold text-gray-500 w-24 flex-shrink-0">{game.name}</span>

                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={game.displayName || ''}
                                            onChange={(e) => updateDisplayName(idx, e.target.value)}
                                            placeholder={game.name}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                                        />
                                    </div>

                                    <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                                        <div className={`relative w-10 h-5 rounded-full transition-colors ${game.enabled ? 'bg-blue-500' : 'bg-gray-300'}`} onClick={() => toggleEnabled(idx)}>
                                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${game.enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                        </div>
                                        <span className="text-xs font-bold text-gray-500">{game.enabled ? '启用' : '禁用'}</span>
                                    </label>
                                </div>
                                {dropBelow && <div className="h-0.5 bg-blue-500 rounded-full mx-2 transition-all" />}
                            </div>
                        );
                    })}
                </div>
            </Card>

            <Card title="预览" icon={Eye}>
                <div className="bg-gray-50 rounded-2xl p-6">
                    <div className="text-center mb-4">
                        <div className="text-lg font-black text-gray-800">体彩互动中心</div>
                        <div className="text-xs text-gray-500 font-bold mt-1">点击图标进入互动体验</div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 max-w-xs mx-auto">
                        {games.filter(g => g.enabled).map(game => {
                            const logo = logos[game.key];
                            const slot = GAME_SLOTS.find(s => s.key === game.key);
                            return (
                                <div key={game.key} className="flex flex-col items-center gap-1.5">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100">
                                        {logo?.url ? (
                                            <img src={logo.url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-base bg-gray-100">{slot?.emoji}</div>
                                        )}
                                    </div>
                                    <span className="text-[10px] font-bold text-gray-600 text-center leading-tight line-clamp-1">{game.displayName || game.name}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Card>
        </PageContainer>
    );
}
