import React, { useState, useEffect, useRef } from 'react';
import {
    Megaphone, Plus, Trash2, Edit2, Save, Tag, Eye, Settings,
    X, Search, ChevronDown, ArrowLeft, RotateCcw, Activity, CheckCircle
} from 'lucide-react';

import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';
import { getTagColor, normalizeColorToRgb, rgbaFromColor, parseColorToRgb } from '../../utils/adminHelpers';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FUJIAN_CITIES = ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'];

const DEFAULT_TAGS = [
    { name: '全省投放', color: 'rgb(249, 115, 22)' },
    { name: '福州', color: 'rgb(59, 130, 246)' },
    { name: '厦门', color: 'rgb(239, 68, 68)' },
    { name: '泉州', color: 'rgb(16, 185, 129)' },
    { name: '待办', color: 'rgb(148, 163, 184)' },
];

// ---------------------------------------------------------------------------
// PremiumColorPicker (local HSV color picker with canvas + hue slider)
// ---------------------------------------------------------------------------

const PremiumColorPicker = ({ color, onChange }) => {
    const [hsv, setHsv] = useState({ h: 210, s: 75, v: 95 });
    const canvasRef = useRef(null);
    const hueRef = useRef(null);
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [isDraggingHue, setIsDraggingHue] = useState(false);

    useEffect(() => {
        const rgb = parseColorToRgb(color);
        if (rgb) {
            const r = rgb.r / 255, g = rgb.g / 255, b = rgb.b / 255;
            const max = Math.max(r, g, b), min = Math.min(r, g, b);
            const d = max - min;
            let h;
            if (d === 0) h = 0;
            else if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h = Math.round(h * 60);
            if (h < 0) h += 360;
            const s = max === 0 ? 0 : d / max;
            const v = max;
            setHsv({ h, s: s * 100, v: v * 100 });
        }
    }, [color]);

    const updateFromHSV = (newHsv) => {
        setHsv(newHsv);
        const h = newHsv.h, s = newHsv.s / 100, v = newHsv.v / 100;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r_ = 0, g_ = 0, b_ = 0;
        if (h < 60) { r_ = c; g_ = x; }
        else if (h < 120) { r_ = x; g_ = c; }
        else if (h < 180) { g_ = c; b_ = x; }
        else if (h < 240) { g_ = x; b_ = c; }
        else if (h < 300) { r_ = x; b_ = c; }
        else { r_ = c; b_ = x; }
        const r = Math.round((r_ + m) * 255);
        const g = Math.round((g_ + m) * 255);
        const b = Math.round((b_ + m) * 255);
        onChange(`rgb(${r}, ${g}, ${b})`);
    };

    const handleCanvasMove = (e) => {
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, (e.clientX || e.touches?.[0]?.clientX) - rect.left));
        const y = Math.max(0, Math.min(rect.height, (e.clientY || e.touches?.[0]?.clientY) - rect.top));
        updateFromHSV({ ...hsv, s: (x / rect.width) * 100, v: (1 - y / rect.height) * 100 });
    };

    const handleHueMove = (e) => {
        if (!hueRef.current) return;
        const rect = hueRef.current.getBoundingClientRect();
        const x = Math.max(0, Math.min(rect.width, (e.clientX || e.touches?.[0]?.clientX) - rect.left));
        updateFromHSV({ ...hsv, h: (x / rect.width) * 360 });
    };

    useEffect(() => {
        const up = () => { setIsDraggingCanvas(false); setIsDraggingHue(false); };
        const move = (e) => {
            if (isDraggingCanvas) handleCanvasMove(e);
            if (isDraggingHue) handleHueMove(e);
        };
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', up);
        window.addEventListener('touchmove', move);
        window.addEventListener('touchend', up);
        return () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', up);
            window.removeEventListener('touchmove', move);
            window.removeEventListener('touchend', up);
        };
    }, [isDraggingCanvas, isDraggingHue, hsv]);

    const rgbToHex = (rgbStr) => {
        const rgb = parseColorToRgb(rgbStr);
        if (!rgb) return '#000000';
        return '#' + [rgb.r, rgb.g, rgb.b].map(v => v.toString(16).padStart(2, '0')).join('').toUpperCase();
    };

    const handleHexInput = (val) => {
        const clean = val.startsWith('#') ? val : '#' + val;
        if (/^#[0-9A-F]{6}$/i.test(clean)) {
            onChange(normalizeColorToRgb(clean));
        }
    };

    return (
        <div className="flex flex-col gap-4 select-none">
            {/* SV Canvas */}
            <div
                ref={canvasRef}
                className="relative aspect-video rounded-xl cursor-crosshair overflow-hidden shadow-inner border border-gray-100"
                style={{ backgroundColor: `hsl(${hsv.h}, 100%, 50%)` }}
                onMouseDown={(e) => { setIsDraggingCanvas(true); handleCanvasMove(e); }}
                onTouchStart={(e) => { setIsDraggingCanvas(true); handleCanvasMove(e); }}
            >
                <div className="absolute inset-0 bg-gradient-to-r from-white to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent" />
                <div
                    className="absolute w-4 h-4 -ml-2 -mt-2 border-2 border-white rounded-full shadow-lg pointer-events-none active:scale-125 transition-transform"
                    style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
                />
            </div>

            {/* Hue Slider */}
            <div
                ref={hueRef}
                className="relative h-4 rounded-full cursor-pointer shadow-inner border border-gray-100"
                style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
                onMouseDown={(e) => { setIsDraggingHue(true); handleHueMove(e); }}
                onTouchStart={(e) => { setIsDraggingHue(true); handleHueMove(e); }}
            >
                <div
                    className="absolute w-5 h-5 -mt-0.5 -ml-2.5 bg-white border-2 border-white rounded-full shadow-md pointer-events-none ring-1 ring-gray-200"
                    style={{ left: `${(hsv.h / 360) * 100}%` }}
                />
            </div>

            {/* Hex Display & Input */}
            <div className="flex items-center gap-3 p-3 bg-white border border-gray-100 rounded-xl shadow-sm">
                <div className="w-10 h-10 rounded-lg shadow-inner ring-1 ring-gray-100" style={{ backgroundColor: color }} />
                <div className="flex-1">
                    <div className="flex items-center gap-1 text-gray-400 font-black text-[10px] uppercase">
                        <span>#</span>
                        <input
                            className="bg-transparent border-none outline-none text-gray-800 font-black text-sm w-full p-0 tracking-widest"
                            value={rgbToHex(color).replace('#', '')}
                            onChange={(e) => handleHexInput(e.target.value)}
                            maxLength={6}
                        />
                    </div>
                </div>
                <div className="px-3 py-1 bg-gray-50 rounded-lg text-[10px] font-black text-gray-500 uppercase tracking-tighter">HEX</div>
            </div>

            <button
                type="button"
                onClick={() => {
                    const r = Math.floor(Math.random() * 256);
                    const g = Math.floor(Math.random() * 256);
                    const b = Math.floor(Math.random() * 256);
                    onChange(`rgb(${r}, ${g}, ${b})`);
                }}
                className="w-full py-2.5 bg-gray-50 text-gray-500 font-bold text-xs rounded-xl hover:bg-gray-100 transition-all border border-gray-100 flex items-center justify-center gap-2"
            >
                <RotateCcw size={14} /> 随机变换色盘
            </button>
        </div>
    );
};

// ---------------------------------------------------------------------------
// AdminMarqueePreview (local scrolling ticker preview)
// ---------------------------------------------------------------------------

const AdminMarqueePreview = React.memo(({ announcements, availableTags }) => {
    const activeAnns = (announcements || []).filter(a => a.status);

    if (activeAnns.length === 0) return null;

    return (
        <div className="absolute inset-0">
            <style>{`
                @keyframes tickerMove {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
            `}</style>
            <div className="mx-0 mt-3 flex items-center relative h-10 group bg-transparent text-center">
                <div className="flex-1 overflow-hidden relative h-full flex items-center">
                    <div
                        key="marquee-inner"
                        className="absolute inset-0 flex items-center whitespace-nowrap"
                        style={{
                            animation: `marqueeTrainAnimation ${Math.max(20, activeAnns.length * 10)}s linear infinite`,
                            willChange: 'transform'
                        }}
                    >
                        <div className="flex items-center gap-20 pr-4">
                            {[...activeAnns, { isSpacer: true }, ...activeAnns, { isSpacer: true }].map((ann, idx) => (
                                ann.isSpacer ? (
                                    <div key={`spacer-${idx}`} className="shrink-0" style={{ width: '100%' }} />
                                ) : (
                                    <div key={idx}
                                        className="h-9 pl-0 pr-4 rounded-full border border-white/25 shadow-md flex items-center shrink-0 overflow-hidden"
                                        style={{
                                            background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
                                            backdropFilter: 'blur(20px)',
                                            WebkitBackdropFilter: 'blur(20px)',
                                            boxShadow: '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.3)'
                                        }}
                                    >
                                        {ann.tags && ann.tags[0] && (() => {
                                            const t = ann.tags[0];
                                            const tagColor = getTagColor(t, availableTags);
                                            const tagName = typeof t === 'string' ? t : t?.name;
                                            return (
                                                <div className="flex items-center gap-2 px-4 h-full border-r border-white/20 shrink-0" style={{ backgroundColor: rgbaFromColor(tagColor, 0.38) }}>
                                                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                                                    <span className="text-sm font-black text-white uppercase tracking-tight">{tagName}</span>
                                                </div>
                                            );
                                        })()}
                                        <div className="pl-3 pr-2 flex items-center h-full">
                                            <span className="text-white font-black text-base tracking-normal drop-shadow-md">{ann.content}</span>
                                        </div>
                                    </div>
                                )
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}, (prev, next) => {
    if (JSON.stringify(prev.announcements) !== JSON.stringify(next.announcements)) return false;
    return true;
});

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function Announcements() {
    // Auth
    const [isAuthed, setIsAuthed] = useState(() => !!sessionStorage.getItem('superKey'));
    const [superKey, setSuperKey] = useState(() => sessionStorage.getItem('superKey') || '');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    // Announcements
    const [announcements, setAnnouncements] = useState([]);
    const [annConfig, setAnnConfig] = useState({ rounds: 99, interval: 0, intervalUnit: 's' });
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Tag Management
    const [availableTags, setAvailableTags] = useState([...DEFAULT_TAGS]);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('rgb(59, 130, 246)');
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [editingTagIndex, setEditingTagIndex] = useState(null);
    const tagManagerRef = useRef(null);

    // Confirm dialog state
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
    const [tagDeleteConfirm, setTagDeleteConfirm] = useState({ open: false, index: null });

    // Click outside to close tag manager
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tagManagerRef.current && !tagManagerRef.current.contains(event.target)) {
                setIsTagManagerOpen(false);
                setEditingTagIndex(null);
            }
        };
        if (isTagManagerOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isTagManagerOpen]);

    // Restore session on mount
    useEffect(() => {
        const storedKey = sessionStorage.getItem('superKey');
        if (storedKey) {
            setSuperKey(storedKey);
            loadAnnouncements(storedKey);
        }
    }, []);

    // ---- Auth ----

    const handleLogin = async (key) => {
        setSuperKey(key);
        sessionStorage.setItem('superKey', key);
        await loadAnnouncements(key);
        setIsAuthed(true);
    };

    // ---- Data loading ----

    const loadAnnouncements = (key = superKey) => {
        if (!key) return;
        setLoading(true);
        fetch(`/api/super/announcements?superKey=${key}`)
            .then(res => {
                if (!res.ok) throw new Error('Auth failed');
                return res.json();
            })
            .then(data => {
                setAnnouncements(Array.isArray(data.announcements) ? data.announcements : []);
                setAnnConfig(data.config || { rounds: 99, interval: 0, intervalUnit: 's' });
                if (Array.isArray(data.availableTags)) {
                    setAvailableTags(
                        data.availableTags.map((tag) => ({
                            name: String(tag?.name || '').trim(),
                            color: normalizeColorToRgb(tag?.color)
                        })).filter(tag => tag.name)
                    );
                }
                setHasChanges(false);
                setIsAuthed(true);
                setMessage('');
            })
            .catch(err => {
                console.error('Failed to load announcements:', err);
                setMessage('数据加载失败');
            })
            .finally(() => setLoading(false));
    };

    // ---- Save ----

    const handleBatchSave = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/super/announcements/batch-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    superKey,
                    announcements,
                    config: annConfig,
                    availableTags: availableTags.map(tag => ({
                        name: String(tag?.name || '').trim(),
                        color: normalizeColorToRgb(tag?.color)
                    })).filter(tag => tag.name)
                })
            });
            const data = await res.json();
            if (data.success) {
                setHasChanges(false);
                setMessage('发布成功！');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('保存失败: ' + (data.error || '未知错误'));
            }
        } catch {
            setMessage('保存失败');
        } finally {
            setLoading(false);
        }
    };

    // ---- Announcement CRUD ----

    const handleAnnouncementSave = (e) => {
        e.preventDefault();
        if (editingAnnouncement.id) {
            setAnnouncements(announcements.map(a => a.id === editingAnnouncement.id ? editingAnnouncement : a));
        } else {
            setAnnouncements([...announcements, { ...editingAnnouncement, id: `temp-${Date.now()}` }]);
        }
        setHasChanges(true);
        setIsAnnouncementModalOpen(false);
    };

    const handleAnnouncementDelete = (id) => {
        setAnnouncements(announcements.filter(a => a.id !== id));
        setHasChanges(true);
        setDeleteConfirm({ open: false, id: null });
    };

    const toggleAnnouncementStatus = (id) => {
        setAnnouncements(announcements.map(a =>
            a.id === id ? { ...a, status: !a.status } : a
        ));
        setHasChanges(true);
    };

    // ---- Tag CRUD ----

    const handleTagSave = () => {
        if (!newTagName.trim()) return;
        const normalizedColor = normalizeColorToRgb(newTagColor);
        if (editingTagIndex === -1) {
            setAvailableTags([...availableTags, { name: newTagName.trim(), color: normalizedColor }]);
        } else {
            const next = [...availableTags];
            next[editingTagIndex] = { name: newTagName.trim(), color: normalizedColor };
            setAvailableTags(next);
        }
        setHasChanges(true);
        setEditingTagIndex(null);
        setNewTagName('');
        setNewTagColor('rgb(59, 130, 246)');
    };

    const handleTagDelete = (index) => {
        setAvailableTags(availableTags.filter((_, i) => i !== index));
        setHasChanges(true);
        setTagDeleteConfirm({ open: false, index: null });
        setEditingTagIndex(null);
    };

    // ---- Auth Gate ----

    if (!isAuthed) {
        return <PageContainer><div className="flex items-center justify-center min-h-[40vh] text-slate-400">正在加载公告...</div></PageContainer>;
    }

    // ---- Render ----

    return (
        <PageContainer>
            <ConfirmDialog
                open={deleteConfirm.open}
                title="删除公告"
                message="确定要移除此公告吗？删除后需点击「保存发布」生效。"
                confirmLabel="确认删除"
                danger
                onConfirm={() => handleAnnouncementDelete(deleteConfirm.id)}
                onCancel={() => setDeleteConfirm({ open: false, id: null })}
            />

            <ConfirmDialog
                open={tagDeleteConfirm.open}
                title="删除标签"
                message="确定要移除此标签吗？删除后需点击「保存发布」生效。"
                confirmLabel="确认删除"
                danger
                onConfirm={() => handleTagDelete(tagDeleteConfirm.index)}
                onCancel={() => setTagDeleteConfirm({ open: false, index: null })}
            />

            {/* Header */}
            <PageHeader
                icon={Megaphone}
                title="公告管理"
                description="管理全局公告投放与标签"
            >
                <button
                    onClick={() => loadAnnouncements()}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                    <RotateCcw size={14} className={loading ? 'animate-spin' : ''} />
                    刷新
                </button>
                <button
                    onClick={handleBatchSave}
                    disabled={!hasChanges || loading}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl transition-all active:scale-[0.98] ${
                        hasChanges
                            ? 'bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white hover:from-[#163050] hover:to-[#1e3a5f] shadow-sm'
                            : 'bg-slate-100 text-slate-300 cursor-not-allowed'
                    }`}
                >
                    <Save size={14} />
                    保存发布
                </button>
            </PageHeader>

            {/* Status Message */}
            {message && (
                <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 font-medium flex items-center gap-2">
                    <CheckCircle size={14} />
                    {message}
                </div>
            )}

            {/* Unsaved changes indicator */}
            {hasChanges && (
                <div className="mb-4 px-4 py-2.5 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-600 font-semibold flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    有未保存的变更，请点击「保存发布」同步到终端
                </div>
            )}

            {/* Preview */}
            <Card className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                        <Eye size={15} className="text-[#1e3a5f]" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-slate-800">实时预览</h3>
                        <p className="text-[10px] text-slate-400">1:1 终端还原效果</p>
                    </div>
                </div>
                <div className="relative w-full aspect-[16/2.2] bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-800 shadow-inner">
                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
                    <AdminMarqueePreview announcements={announcements} availableTags={availableTags} />
                    {announcements.filter(a => a.status).length === 0 && (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-gray-500 text-sm font-medium">暂无活跃公告</span>
                        </div>
                    )}
                </div>
                <p className="text-xs text-slate-400 mt-3">
                    * 预览区模拟终端效果，实际展示以终端为准
                </p>
            </Card>

            {/* Control Bar */}
            <div className="mb-6 p-5 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] rounded-2xl text-white shadow-lg shadow-blue-900/10 relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div>
                        <h3 className="text-base font-semibold mb-1">公告控制面板</h3>
                        <p className="text-blue-200 text-xs">
                            编辑公告内容、调整标签，完成后点击保存发布同步到终端。
                        </p>
                    </div>
                    <div className="flex gap-3 w-full md:w-auto">
                        <button
                            onClick={() => {
                                setEditingAnnouncement({ content: '', scope: 'ALL', tags: [], status: true });
                                setIsAnnouncementModalOpen(true);
                                setIsTagManagerOpen(false);
                                setEditingTagIndex(null);
                            }}
                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 bg-white text-[#1e3a5f] font-semibold rounded-xl hover:bg-slate-100 transition-colors text-sm shadow-sm active:scale-[0.98]"
                        >
                            <Plus size={16} /> 添加公告
                        </button>
                        <button
                            onClick={handleBatchSave}
                            disabled={!hasChanges || loading}
                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3 font-semibold rounded-xl transition-colors text-sm ${
                                hasChanges
                                    ? 'bg-white/20 text-white hover:bg-white/30'
                                    : 'bg-white/5 text-white/40 cursor-not-allowed'
                            }`}
                        >
                            <Save size={16} /> 保存发布
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content: Two Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Announcement List */}
                <div className="lg:col-span-2">
                    <Card noPadding>
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                    <Megaphone size={15} className="text-[#1e3a5f]" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">
                                    公告列表
                                    <span className="ml-2 text-xs text-slate-400 font-normal">
                                        ({announcements.length} 条)
                                    </span>
                                </h3>
                            </div>
                            {hasChanges && (
                                <span className="text-[10px] font-semibold text-red-500 bg-red-50 px-3 py-1 rounded-full">
                                    有未保存变更
                                </span>
                            )}
                        </div>

                        {announcements.length === 0 ? (
                            <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                                <Megaphone size={40} className="mb-3 opacity-40" />
                                <p className="text-sm font-medium">暂无公告内容</p>
                                <p className="text-xs mt-1">点击上方「添加公告」创建第一条公告</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {announcements.map((ann, idx) => (
                                    <div key={ann.id || idx} className="px-6 py-4 hover:bg-slate-50/50 transition-colors group">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                {/* Tags + Scope */}
                                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                    {ann.scope && (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                                            ann.scope === 'ALL'
                                                                ? 'bg-orange-100 text-orange-600'
                                                                : 'bg-blue-100 text-blue-600'
                                                        }`}>
                                                            {ann.scope === 'ALL' ? '全省投放' : `${ann.scope}市`}
                                                        </span>
                                                    )}
                                                    {(ann.tags || []).map(tagName => {
                                                        const tag = availableTags.find(t => t.name === tagName);
                                                        const color = tag ? tag.color : 'rgb(148, 163, 184)';
                                                        return (
                                                            <span
                                                                key={tagName}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                                                style={{ backgroundColor: rgbaFromColor(color, 0.12), color }}
                                                            >
                                                                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                                                                {tagName}
                                                            </span>
                                                        );
                                                    })}
                                                </div>
                                                {/* Content */}
                                                <p className="text-sm text-slate-700 font-medium line-clamp-2">{ann.content}</p>
                                            </div>

                                            {/* Status + Actions */}
                                            <div className="flex items-center gap-2 flex-shrink-0">
                                                <button
                                                    onClick={() => toggleAnnouncementStatus(ann.id)}
                                                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-colors ${
                                                        ann.status
                                                            ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                                                            : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-1">
                                                        <div className={`w-1.5 h-1.5 rounded-full ${ann.status ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                                                        {ann.status ? '活跃' : '隐藏'}
                                                    </div>
                                                </button>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        onClick={() => {
                                                            setEditingAnnouncement({ ...ann });
                                                            setIsAnnouncementModalOpen(true);
                                                            setIsTagManagerOpen(false);
                                                            setEditingTagIndex(null);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                        title="编辑"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={() => setDeleteConfirm({ open: true, id: ann.id })}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                                        title="删除"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </Card>
                </div>

                {/* Right: Tag Management */}
                <div className="lg:col-span-1">
                    <Card noPadding>
                        <div className="px-5 py-4 border-b border-gray-100 bg-slate-50/50 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                    <Tag size={15} className="text-[#1e3a5f]" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">标签管理</h3>
                            </div>
                            <button
                                onClick={() => {
                                    setEditingTagIndex(-1);
                                    setNewTagName('');
                                    setNewTagColor('rgb(59, 130, 246)');
                                    setIsAddingTag(true);
                                }}
                                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <Plus size={12} /> 新增
                            </button>
                        </div>

                        <div className="p-4 space-y-2">
                            {availableTags.map((tag, idx) => (
                                <div key={tag.name + idx} className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-colors group">
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <div
                                            className="w-3 h-3 rounded-full flex-shrink-0 ring-2 ring-offset-1"
                                            style={{ backgroundColor: tag.color, ringColor: rgbaFromColor(tag.color, 0.2) }}
                                        />
                                        <span className="text-sm text-slate-700 font-medium truncate">{tag.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => {
                                                setEditingTagIndex(idx);
                                                setNewTagName(tag.name);
                                                setNewTagColor(normalizeColorToRgb(tag.color));
                                                setIsAddingTag(true);
                                            }}
                                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                                            title="编辑标签"
                                        >
                                            <Edit2 size={12} />
                                        </button>
                                        <button
                                            onClick={() => setTagDeleteConfirm({ open: true, index: idx })}
                                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                                            title="删除标签"
                                        >
                                            <Trash2 size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {availableTags.length === 0 && (
                                <div className="py-8 text-center text-slate-400 text-xs">
                                    暂无标签，点击上方「新增」创建
                                </div>
                            )}
                        </div>

                        {/* Inline Tag Editor (shown when adding/editing) */}
                        {isAddingTag && (
                            <div className="border-t border-gray-100 p-4 bg-slate-50/30 animate-in slide-in-from-bottom-2 duration-200">
                                <div className="space-y-3">
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1 block">
                                            标签名称
                                        </label>
                                        <input
                                            autoFocus
                                            value={newTagName}
                                            onChange={e => setNewTagName(e.target.value)}
                                            className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                            placeholder="输入标签名称..."
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                            标签颜色
                                        </label>
                                        <PremiumColorPicker
                                            color={newTagColor}
                                            onChange={setNewTagColor}
                                        />
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsAddingTag(false);
                                                setEditingTagIndex(null);
                                                setNewTagName('');
                                                setNewTagColor('rgb(59, 130, 246)');
                                            }}
                                            className="flex-1 py-2 text-sm font-medium text-slate-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                        >
                                            取消
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleTagSave}
                                            disabled={!newTagName.trim()}
                                            className="flex-1 py-2 text-sm font-medium text-white bg-[#1e3a5f] rounded-lg hover:bg-[#163050] disabled:opacity-50 transition-colors"
                                        >
                                            {editingTagIndex >= 0 ? '保存修改' : '创建标签'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </Card>
                </div>
            </div>

            {/* Announcement Edit Modal */}
            {isAnnouncementModalOpen && editingAnnouncement && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-xl border border-slate-200 p-6 animate-in zoom-in-95 relative overflow-hidden">
                        {/* Gradient top bar */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1e3a5f] via-[#3b82f6] to-[#06b6d4]" />
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-slate-900">
                                {editingAnnouncement.id ? '编辑公告' : '发布新公告'}
                            </h3>
                            <button
                                onClick={() => { setIsAnnouncementModalOpen(false); setIsTagManagerOpen(false); }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleAnnouncementSave} className="space-y-5">
                            {/* Content */}
                            <div>
                                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                    公告文本内容
                                </label>
                                <textarea
                                    value={editingAnnouncement.content}
                                    onChange={e => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                                    className="w-full px-4 py-3 bg-slate-50 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                                    rows={3}
                                    placeholder="请输入公告条目主要文本内容..."
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {/* Scope */}
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                        投放范围
                                    </label>
                                    <select
                                        value={editingAnnouncement.scope || 'ALL'}
                                        onChange={e => setEditingAnnouncement({ ...editingAnnouncement, scope: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-lg text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                                    >
                                        <option value="ALL">全省投放</option>
                                        {FUJIAN_CITIES.map(c => (
                                            <option key={c} value={c}>{c}市</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Tag Selector */}
                                <div>
                                    <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-2 block">
                                        属性标签
                                    </label>
                                    <div className="relative">
                                        <div
                                            className="flex flex-wrap items-center gap-1.5 px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-lg text-sm font-medium focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all cursor-pointer min-h-[40px]"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setIsTagManagerOpen(!isTagManagerOpen);
                                            }}
                                        >
                                            <div className="flex-1 flex flex-wrap gap-1.5 overflow-hidden">
                                                {(editingAnnouncement.tags || []).length > 0 ? (
                                                    (editingAnnouncement.tags || []).map(tagName => {
                                                        const tag = availableTags.find(t => t.name === tagName);
                                                        const color = tag ? tag.color : 'rgb(148, 163, 184)';
                                                        return (
                                                            <span
                                                                key={tagName}
                                                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                                                                style={{ backgroundColor: rgbaFromColor(color, 0.12), color }}
                                                            >
                                                                <span className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                                                                {tagName}
                                                            </span>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-slate-300 text-xs">请选择标签...</span>
                                                )}
                                            </div>
                                            <ChevronDown size={14} className={`text-slate-400 flex-shrink-0 transition-transform ${isTagManagerOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {/* Tag Dropdown */}
                                        {isTagManagerOpen && (
                                            <div
                                                ref={tagManagerRef}
                                                className="absolute top-full left-0 right-0 mt-1 z-[160] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl animate-in fade-in slide-in-from-top-1 duration-200"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {editingTagIndex === null ? (
                                                    <div className="flex flex-col max-h-72">
                                                        {/* Search */}
                                                        <div className="p-2 border-b border-gray-100 bg-slate-50/50">
                                                            <div className="relative">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                                                    <Search size={14} />
                                                                </div>
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    placeholder="搜索或输入新名称..."
                                                                    value={tagSearchQuery}
                                                                    onChange={e => setTagSearchQuery(e.target.value)}
                                                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                                />
                                                            </div>
                                                        </div>

                                                        {/* Tag List */}
                                                        <div className="flex-1 overflow-y-auto px-1 py-1">
                                                            {availableTags
                                                                .filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                                                                .map((tag) => (
                                                                    <div
                                                                        key={tag.name}
                                                                        className={`flex items-center justify-between p-2 rounded-lg transition-colors cursor-pointer ${
                                                                            editingAnnouncement.tags?.includes(tag.name)
                                                                                ? 'bg-blue-500 text-white shadow-sm'
                                                                                : 'hover:bg-slate-50'
                                                                        }`}
                                                                        onClick={() => {
                                                                            const newTags = editingAnnouncement.tags?.includes(tag.name)
                                                                                ? editingAnnouncement.tags.filter(t => t !== tag.name)
                                                                                : [...(editingAnnouncement.tags || []), tag.name];
                                                                            setEditingAnnouncement({ ...editingAnnouncement, tags: newTags });
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                                                            <div
                                                                                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                                                                    editingAnnouncement.tags?.includes(tag.name) ? 'ring-2 ring-white/50' : ''
                                                                                }`}
                                                                                style={{ backgroundColor: tag.color }}
                                                                            />
                                                                            <span className="text-xs font-medium truncate">{tag.name}</span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingTagIndex(availableTags.indexOf(tag));
                                                                                setNewTagName(tag.name);
                                                                                setNewTagColor(normalizeColorToRgb(tag.color));
                                                                            }}
                                                                            className={`p-1 rounded-md transition-colors ${
                                                                                editingAnnouncement.tags?.includes(tag.name)
                                                                                    ? 'hover:bg-white/20 text-white'
                                                                                    : 'hover:bg-white text-slate-300 hover:text-blue-500'
                                                                            }`}
                                                                        >
                                                                            <Settings size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                            {/* Create new tag from search */}
                                                            {tagSearchQuery && !availableTags.some(t => t.name === tagSearchQuery) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingTagIndex(-1);
                                                                        setNewTagName(tagSearchQuery);
                                                                        setNewTagColor('rgb(59, 130, 246)');
                                                                    }}
                                                                    className="w-full flex items-center gap-2 p-3 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors text-xs font-semibold mt-1 border border-dashed border-blue-100"
                                                                >
                                                                    <Plus size={16} />
                                                                    <span>创建标签 "{tagSearchQuery}"</span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingTagIndex(-1);
                                                                setNewTagName('');
                                                                setNewTagColor('rgb(59, 130, 246)');
                                                            }}
                                                            className="flex items-center gap-2 p-3 text-slate-400 hover:text-blue-600 hover:bg-slate-50 border-t border-gray-100 transition-colors text-xs font-medium"
                                                        >
                                                            <Plus size={16} />
                                                            <span>自定义新标签</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    /* Tag editor panel */
                                                    <div className="flex flex-col animate-in slide-in-from-right-2">
                                                        <div className="flex items-center gap-2 p-3 border-b border-gray-100 bg-slate-50/50">
                                                            <button
                                                                type="button"
                                                                onClick={() => setEditingTagIndex(null)}
                                                                className="p-1 hover:bg-white rounded-md transition-colors text-slate-400 hover:text-slate-800"
                                                            >
                                                                <ArrowLeft size={16} />
                                                            </button>
                                                            <span className="text-xs font-semibold text-slate-700">
                                                                {editingTagIndex === -1 ? '新增标签' : '编辑标签'}
                                                            </span>
                                                        </div>

                                                        <div className="p-4 space-y-4">
                                                            <div>
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase mb-1 block">
                                                                    名称
                                                                </label>
                                                                <input
                                                                    autoFocus
                                                                    value={newTagName}
                                                                    onChange={e => setNewTagName(e.target.value)}
                                                                    className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                                    placeholder="标签名称..."
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-semibold text-slate-400 uppercase mb-2 block">
                                                                    配色
                                                                </label>
                                                                <PremiumColorPicker
                                                                    color={newTagColor || 'rgb(59, 130, 246)'}
                                                                    onChange={setNewTagColor}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="p-3 border-t border-gray-100 flex gap-2 bg-slate-50/30">
                                                            {editingTagIndex >= 0 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setTagDeleteConfirm({ open: true, index: editingTagIndex })}
                                                                    className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    handleTagSave();
                                                                    if (editingTagIndex === -1 && newTagName.trim()) {
                                                                        setEditingAnnouncement({
                                                                            ...editingAnnouncement,
                                                                            tags: [...(editingAnnouncement.tags || []), newTagName.trim()]
                                                                        });
                                                                    }
                                                                    setEditingTagIndex(null);
                                                                }}
                                                                disabled={!newTagName.trim()}
                                                                className="flex-1 py-2 bg-[#1e3a5f] text-white font-medium rounded-lg hover:bg-[#163050] active:scale-95 transition-all text-sm disabled:opacity-50"
                                                            >
                                                                完成并保存
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Status Toggle */}
                            <label className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-xl cursor-pointer group transition-colors hover:bg-emerald-50 border border-emerald-100/50">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-md border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    checked={editingAnnouncement.status}
                                    onChange={e => setEditingAnnouncement({ ...editingAnnouncement, status: e.target.checked })}
                                />
                                <div>
                                    <span className="text-sm font-semibold text-emerald-800">立即生效并同步</span>
                                    <p className="text-[10px] text-emerald-600 font-medium opacity-60">
                                        勾选后预览区及终端将立即看到该公告
                                    </p>
                                </div>
                            </label>

                            {/* Submit */}
                            <button
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white font-semibold rounded-xl hover:from-[#163050] hover:to-[#1e3a5f] active:scale-[0.98] transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
                            >
                                <Activity size={16} />
                                {editingAnnouncement.id ? '保存修改' : '确定并加入公告编排列表'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
