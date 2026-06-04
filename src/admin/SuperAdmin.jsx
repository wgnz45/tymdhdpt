import React, { useState, useEffect, useRef } from 'react';
import { Plus, Store, Trash2, Key, Settings, RefreshCcw, Tv, Smartphone, LayoutGrid, List, Link as LinkIcon, Activity, Home, X, Save, ArrowLeft, Search, ChevronRight, RotateCcw, ChevronDown } from 'lucide-react';

import StoreConfig from './StoreConfig';

const PremiumColorPicker = ({ color, onChange }) => {
    const [hsv, setHsv] = useState({ h: 210, s: 75, v: 95 });
    const canvasRef = useRef(null);
    const hueRef = useRef(null);
    const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
    const [isDraggingHue, setIsDraggingHue] = useState(false);

    // Initial sync from prop
    useEffect(() => {
        const rgb = parseColorToRgb(color);
        if (rgb) {
            // Simple RGB to HSV conversion
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
        // HSV to RGB
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

    // Convert RGB string to Hex for display
    const rgbToHex = (rgbStr) => {
        const rgb = parseColorToRgb(rgbStr);
        if (!rgb) return '#000000';
        return '#' + [rgb.r, rgb.g, rgb.b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
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

const DEFAULT_MANAGER_TITLES = ['店长', '先生', '女士'];
const SURNAME_PATTERN = /^[\u4e00-\u9fa5]{1,2}$/;
const PHONE_PATTERN = /^\d{11}$/;

const sanitizeManagerTitles = (titles) => {
    const source = Array.isArray(titles) ? titles : [];
    const allowed = new Set(DEFAULT_MANAGER_TITLES);
    const finalList = source
        .map(item => String(item || '').trim())
        .filter(item => item && allowed.has(item))
        .filter((item, idx, arr) => arr.indexOf(item) === idx);
    return finalList.length > 0 ? finalList : [...DEFAULT_MANAGER_TITLES];
};

const clampRgb = (value) => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0;
    return Math.max(0, Math.min(255, Math.round(n)));
};

const parseColorToRgb = (input) => {
    const raw = String(input || '').trim();
    const rgbMatch = raw.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (rgbMatch) {
        return {
            r: clampRgb(rgbMatch[1]),
            g: clampRgb(rgbMatch[2]),
            b: clampRgb(rgbMatch[3])
        };
    }
    const hexMatch = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
        const hex = hexMatch[1].length === 3
            ? hexMatch[1].split('').map(ch => ch + ch).join('')
            : hexMatch[1];
        return {
            r: parseInt(hex.slice(0, 2), 16),
            g: parseInt(hex.slice(2, 4), 16),
            b: parseInt(hex.slice(4, 6), 16)
        };
    }
    return null;
};

const toRgbString = (rgb) => `rgb(${clampRgb(rgb?.r)}, ${clampRgb(rgb?.g)}, ${clampRgb(rgb?.b)})`;
const normalizeColorToRgb = (color, fallback = 'rgb(59, 130, 246)') => {
    const parsed = parseColorToRgb(color);
    if (!parsed) return fallback;
    return toRgbString(parsed);
};

const rgbaFromColor = (color, alpha = 1) => {
    const parsed = parseColorToRgb(color);
    if (!parsed) return `rgba(148, 163, 184, ${alpha})`;
    return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${alpha})`;
};

const splitManagerText = (value, titles = DEFAULT_MANAGER_TITLES) => {
    const raw = String(value || '').trim();
    if (!raw) return { surname: '', title: titles[0] || DEFAULT_MANAGER_TITLES[0] };
    const validTitles = sanitizeManagerTitles(titles);
    for (const title of validTitles) {
        if (raw.endsWith(title)) {
            return { surname: raw.slice(0, -title.length), title };
        }
    }
    return { surname: raw, title: validTitles[0] || DEFAULT_MANAGER_TITLES[0] };
};

// 1:1 Live Preview Component for Admin
// 1:1 Live Preview Component for Admin
const getTagColor = (tag, availableTags = []) => {
    if (typeof tag === 'object' && tag.color) return tag.color;
    const name = String(typeof tag === 'string' ? tag : tag?.name || '').trim();

    // First try finding in availableTags if passed
    const found = Array.isArray(availableTags) ? availableTags.find(t => String(t?.name || '').trim() === name) : null;
    if (found) return found.color;

    const map = {
        '福州': 'rgb(59, 130, 246)',
        '厦门': 'rgb(239, 68, 68)',
        '莆田': 'rgb(249, 115, 22)',
        '三明': 'rgb(16, 185, 129)',
        '泉州': 'rgb(16, 185, 129)',
        '漳州': 'rgb(139, 92, 246)',
        '南平': 'rgb(6, 182, 212)',
        '龙岩': 'rgb(245, 158, 11)',
        '宁德': 'rgb(148, 163, 184)',
        '最新': 'rgb(255, 65, 108)',
        '聚焦': 'rgb(0, 122, 255)',
        '行业': 'rgb(175, 82, 222)',
        '福建': 'rgb(52, 199, 89)',
        '活动': 'rgb(255, 149, 0)',
        '动态': 'rgb(142, 142, 147)',
        '全省投放': 'rgb(249, 115, 22)',
    };
    return map[name] || 'rgb(255, 255, 255)';
};
const TickerStyle = () => (
    <style>{`
        @keyframes tickerMove {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
        }
    `}</style>
);

const AdminMarqueePreview = React.memo(({ announcements, availableTags }) => {
    const activeAnns = (announcements || []).filter(a => a.status);

    if (activeAnns.length === 0) return null;

    return (
        <div className="absolute inset-0">
            <TickerStyle />
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

export default function SuperAdmin() {
    const [superKey, setSuperKey] = useState('');
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isAuthed, setIsAuthed] = useState(false);
    const [message, setMessage] = useState('');

    // Channel & View Mode
    const [channelTab, setChannelTab] = useState('tv'); // 'tv' | 'android' | 'announcement'
    const [viewMode, setViewMode] = useState('list'); // 'list' | 'grid'

    // City Filter
    const [cityFilter, setCityFilter] = useState('ALL');
    const FUJIAN_CITIES = ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'];

    // Settings Modal State
    const [settingsStore, setSettingsStore] = useState(null);

    const [newStore, setNewStore] = useState({
        id: '',
        name: '',
        adminKey: '',
        city: '福州'
    });

    // Central Announcements
    const [announcements, setAnnouncements] = useState([]);
    const [annConfig, setAnnConfig] = useState({ rounds: 99, interval: 0, intervalUnit: 's' });
    const [editingAnnouncement, setEditingAnnouncement] = useState(null);
    const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Tag Management
    const [availableTags, setAvailableTags] = useState([
        { name: '全省投放', color: 'rgb(249, 115, 22)' },
        { name: '福州', color: 'rgb(59, 130, 246)' },
        { name: '厦门', color: 'rgb(239, 68, 68)' },
        { name: '泉州', color: 'rgb(16, 185, 129)' },
        { name: '待办', color: 'rgb(148, 163, 184)' }
    ]);
    const [isAddingTag, setIsAddingTag] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [newTagColor, setNewTagColor] = useState('rgb(59, 130, 246)');

    // Tag Manager Enhanced States
    const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
    const [tagSearchQuery, setTagSearchQuery] = useState('');
    const [editingTagIndex, setEditingTagIndex] = useState(null); // null means list view, index means editing that tag
    const tagManagerRef = useRef(null);

    // Global Config
    const [showCalculator, setShowCalculator] = useState(true);
    const [animationDuration, setAnimationDuration] = useState(5000);
    const [packageDuration, setPackageDuration] = useState(30000);
    const [managerTitleTemplates, setManagerTitleTemplates] = useState([...DEFAULT_MANAGER_TITLES]);

    // Click outside to close tag manager
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (tagManagerRef.current && !tagManagerRef.current.contains(event.target)) {
                // If clicking outside the tag manager AND not clicking the trigger 
                // (though the trigger is outside the ref usually, so we handle it within the trigger click)
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

    // Auto Refresh heartbeats every 10s
    useEffect(() => {
        let interval;
        if (isAuthed) {
            interval = setInterval(loadStores, 10000);
        }
        return () => clearInterval(interval);
    }, [isAuthed, superKey]);

    useEffect(() => {
        const storedKey = sessionStorage.getItem('superKey');
        if (storedKey) {
            setSuperKey(storedKey);
            loadAllData(storedKey);
        }
    }, []);

    const loadAllData = async (key = superKey) => {
        if (!key) return;
        setLoading(true);
        try {
            // Parallel fetch all required data
            const [storesRes, configRes, announcementRes] = await Promise.all([
                fetch(`/api/super/stores?superKey=${key}`),
                fetch(`/api/super/config?superKey=${key}`),
                fetch(`/api/super/announcements?superKey=${key}`)
            ]);

            const storesData = await storesRes.json();
            const configData = await configRes.json();
            const annData = await announcementRes.json();

            setStores(Array.isArray(storesData) ? storesData : []);
            if (configData.showCalculator !== undefined) setShowCalculator(configData.showCalculator);
            if (configData.animationDuration !== undefined) setAnimationDuration(configData.animationDuration);
            if (configData.packageDuration !== undefined) setPackageDuration(configData.packageDuration);
            setManagerTitleTemplates(sanitizeManagerTitles(configData.managerTitleTemplates));

            setAnnouncements(Array.isArray(annData.announcements) ? annData.announcements : []);
            setAnnConfig(annData.config || { rounds: 99, interval: 0, intervalUnit: 's' });
            if (Array.isArray(annData.availableTags)) setAvailableTags(annData.availableTags);
            if (Array.isArray(annData.availableTags)) {
                setAvailableTags(
                    annData.availableTags.map((tag) => ({
                        name: String(tag?.name || '').trim(),
                        color: normalizeColorToRgb(tag?.color)
                    })).filter(tag => tag.name)
                );
            }

            setIsAuthed(true);
            setHasChanges(false);
            setMessage('');
        } catch (err) {
            console.error('Initial load failed:', err);
            setMessage('数据加载失败');
        } finally {
            setLoading(false);
        }
    };

    const handleLogin = (e) => {
        e.preventDefault();
        sessionStorage.setItem('superKey', superKey);
        loadAllData();
    };

    const loadStores = () => {
        const key = superKey || sessionStorage.getItem('superKey');
        if (!key) return;
        fetch(`/api/super/stores?superKey=${key}`)
            .then(res => res.ok ? res.json() : Promise.reject())
            .then(data => {
                setStores(Array.isArray(data) ? data : []);
                setIsAuthed(true);
                setMessage('');
            })
            .catch(() => {
                setMessage('Super Key 错误或验证失败');
            });
    };

    const loadAnnouncements = (key = superKey) => {
        fetch(`/api/super/announcements?superKey=${key}`)
            .then(res => res.json())
            .then(data => {
                setAnnouncements(data.announcements || []);
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
            })
            .catch(err => console.error('Failed to load announcements:', err));
    };

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
            }
        } catch {
            alert('保存失败');
        } finally {
            setLoading(false);
        }
    };

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
        if (!window.confirm('确定要移除此公告吗？（需点击“保存发布”生效）')) return;
        setAnnouncements(announcements.filter(a => a.id !== id));
        setHasChanges(true);
    };

    const handleRefreshData = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch('/api/super/refresh-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey })
            });
            const data = await res.json();
            if (data.success) {
                setMessage('数据刷新指令已发送');
                setTimeout(() => setMessage(''), 3000);
            } else {
                setMessage('操作失败：' + data.error);
            }
        } catch {
            setMessage('网络错误');
        } finally {
            setLoading(false);
        }
    };

    const handleRefreshAllPages = async () => {
        if (loading) return;
        if (!window.confirm('确定要刷新所有在线设备的页面吗？')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/super/refresh-all-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`页面刷新指令已下发，在线设备: ${data.count}台`);
                setTimeout(() => setMessage(''), 4000);
            } else {
                setMessage('操作失败：' + data.error);
            }
        } catch {
            setMessage('网络错误');
        } finally {
            setLoading(false);
        }
    };

    const [showManualInput, setShowManualInput] = useState(false);
    const handleManualSubmit = async () => {
        const period = document.getElementById('m_period').value;
        const date = document.getElementById('m_date').value;
        const reds = document.getElementById('m_reds').value.trim().split(' ');
        const blues = document.getElementById('m_blues').value.trim().split(' ');
        const pool = document.getElementById('m_pool').value;

        if (!period || !date || reds.length !== 5 || blues.length !== 2) {
            alert('请填写完整数据：红球5个，蓝球2个');
            return;
        }

        try {
            const res = await fetch('/api/super/manual-draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    superKey,
                    drawData: { period, date, reds, blues, pool }
                })
            });
            const data = await res.json();
            if (data.success) {
                alert('开奖结果已更新！');
                setShowManualInput(false);
            } else {
                alert('更新失败: ' + data.error);
            }
        } catch {
            alert('网络错误');
        }
    };

    const handleCreate = (e) => {
        e.preventDefault();

        // Auto-generate adminKey for Android channel if left empty
        let payloadKey = newStore.adminKey;
        if (channelTab === 'android' && !payloadKey) {
            payloadKey = 'android_' + Math.random().toString(36).substr(2, 6);
        }

        const payloadData = {
            ...newStore,
            adminKey: payloadKey,
            channel: channelTab
        };

        fetch('/api/super/create-store', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ superKey, storeData: payloadData })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setMessage(`子站点 ${data.store.id} 创建成功！`);
                    setNewStore({ id: '', name: '', adminKey: '', city: '福州' });
                    loadStores();
                } else {
                    setMessage('创建失败: ' + data.error);
                }
            });
    };

    const toggleManagerTitleTemplate = (title) => {
        setManagerTitleTemplates(prev => {
            const exists = prev.includes(title);
            if (exists) return prev.filter(item => item !== title);
            return [...prev, title];
        });
    };

    const handleCronUpdate = () => {
        if (!managerTitleTemplates.length) {
            setMessage('请至少保留一个联系人称呼模板');
            return;
        }
        setLoading(true);
        fetch('/api/super/update-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ superKey, showCalculator, animationDuration, packageDuration, managerTitleTemplates })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    setMessage('全局配置已保存');
                    setTimeout(() => setMessage(''), 3000);
                } else {
                    setMessage('保存失败: ' + data.error);
                }
            })
            .finally(() => setLoading(false));
    };

    const handleDelete = async (storeId) => {
        if (!window.confirm(`警告：确定要永久删除分站 "${storeId}" 吗？\n删除后所有数据将无法恢复！`)) return;

        try {
            const res = await fetch('/api/super/delete-store', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, storeId })
            });
            const data = await res.json();
            if (data.success) {
                setMessage(`分站 ${storeId} 已删除`);
                loadStores();
            } else {
                setMessage('删除失败: ' + (data.error || '未知错误'));
            }
        } catch {
            setMessage('网络错误，删除失败');
        }
    };

    // Remote Control & Android Edit Modal
    const [androidEditingStore, setAndroidEditingStore] = useState(null);
    const [androidSurname, setAndroidSurname] = useState('');
    const [androidTitle, setAndroidTitle] = useState(DEFAULT_MANAGER_TITLES[0]);
    const [androidPhone, setAndroidPhone] = useState('');
    const [androidFormError, setAndroidFormError] = useState('');

    const handleRemoteCommand = async (storeId, path) => {
        try {
            const res = await fetch(`/api/super/store/${storeId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, command: { action: 'navigate', path } })
            });
            const data = await res.json();
            if (data.success) {
                alert('指令已发送！机台将在10秒内返回主页。');
            } else {
                alert('发送失败: ' + data.error);
            }
        } catch {
            alert('网络错误，指令发送失败');
        }
    };

    // Quick Save for Android Basic Info
    const handleAndroidInfoSave = async (e) => {
        e.preventDefault();
        const cleanSurname = String(androidSurname || '').trim();
        const validTitles = sanitizeManagerTitles(managerTitleTemplates);
        const finalTitle = validTitles.includes(androidTitle) ? androidTitle : validTitles[0];
        const finalManager = cleanSurname ? `${cleanSurname}${finalTitle}` : '';
        const finalPhone = String(androidPhone || '').replace(/\D/g, '').slice(0, 11);

        if (cleanSurname && !SURNAME_PATTERN.test(cleanSurname)) {
            setAndroidFormError('联系人格式需为X店长/X先生/X女士（X为1-2位中文姓氏）');
            return;
        }
        if (finalPhone && !PHONE_PATTERN.test(finalPhone)) {
            setAndroidFormError('联系电话只能输入11位数字');
            return;
        }
        setAndroidFormError('');

        try {
            const payload = {
                id: androidEditingStore.id,
                superKey,
                config: {
                    name: androidEditingStore.name,
                    contact: finalPhone,
                    phone: finalPhone,
                    address: androidEditingStore.address,
                    manager: finalManager
                }
            };
            const res = await fetch('/api/store/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setAndroidEditingStore(null);
                loadStores();
            } else {
                alert('保存失败: ' + data.error);
            }
        } catch {
            alert('网络错误，保存失败');
        }
    };

    if (!isAuthed) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
                    <div className="flex flex-col items-center mb-6">
                        <div className="bg-blue-600 p-4 rounded-full text-white mb-4">
                            <Key size={32} />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-800">主站管理总台</h1>
                        <p className="text-gray-400 text-sm">请输入系统超级密钥以继续</p>
                    </div>
                    <form onSubmit={handleLogin} className="space-y-4">
                        <input
                            type="password"
                            value={superKey}
                            onChange={(e) => setSuperKey(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            placeholder="超级管理密钥 SuperKey"
                        />
                        <button className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all">
                            验证身份
                        </button>
                    </form>
                    {message && <p className="mt-4 text-center text-red-500 text-sm">{message}</p>}
                </div>
            </div>
        );
    }

    const filteredStores = (Array.isArray(stores) ? stores : []).filter(s => {
        if (s.id === 'default') return false;
        if ((s.channel || 'tv') !== channelTab) return false;
        if (cityFilter !== 'ALL' && s.city !== cityFilter) return false;
        return true;
    });

    return (
        <div className="min-h-screen bg-gray-50 p-6 md:p-10">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
                        <Store className="text-blue-600" />
                        子站点集群管理
                    </h1>
                    <div className="flex items-center">
                        <button
                            onClick={() => { setIsAuthed(false); setSuperKey(''); }}
                            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
                        >
                            退出管理
                        </button>
                        <button
                            onClick={handleRefreshData}
                            disabled={loading}
                            className="ml-4 flex items-center gap-1 text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors text-sm font-bold active:scale-95"
                        >
                            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                            强制刷新数据
                        </button>
                        <button
                            onClick={handleRefreshAllPages}
                            disabled={loading}
                            className="ml-2 flex items-center gap-1 text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors text-sm font-bold active:scale-95"
                        >
                            <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                            刷新所有页面
                        </button>
                        <button
                            onClick={() => setShowManualInput(true)}
                            className="ml-2 flex items-center gap-1 text-purple-600 bg-purple-50 px-3 py-1.5 rounded-lg hover:bg-purple-100 transition-colors text-sm font-bold active:scale-95"
                        >
                            <span className="text-xs">✏️</span> 手动录入
                        </button>
                    </div>
                </div>

                {/* Channel Tabs */}
                <div className="flex items-center gap-3 mb-4 border-b border-gray-100 pb-5 overflow-x-auto">
                    <button onClick={() => setChannelTab('tv')} className={`shrink-0 px-6 py-3 font-bold rounded-xl transition-all shadow-sm ${channelTab === 'tv' ? 'bg-blue-600 text-white shadow-blue-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent'}`}>
                        <div className="flex items-center gap-2"><Tv size={20} /> 📺 电视/PC渠道</div>
                    </button>
                    <button onClick={() => setChannelTab('android')} className={`shrink-0 px-6 py-3 font-bold rounded-xl transition-all shadow-sm ${channelTab === 'android' ? 'bg-indigo-600 text-white shadow-indigo-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent'}`}>
                        <div className="flex items-center gap-2"><Smartphone size={20} /> 📱 安卓大屏渠道</div>
                    </button>
                    <button onClick={() => setChannelTab('announcement')} className={`shrink-0 px-6 py-3 font-bold rounded-xl transition-all shadow-sm ${channelTab === 'announcement' ? 'bg-red-600 text-white shadow-red-200' : 'bg-gray-50 text-gray-500 hover:bg-gray-100 border border-transparent'}`}>
                        <div className="flex items-center gap-2"><List size={20} /> 📢 中心公告管理</div>
                    </button>
                </div>

                {/* City Filter Bar (Only for TV/Android) */}
                {(channelTab === 'tv' || channelTab === 'android') && (
                    <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-2 no-scrollbar">
                        <button
                            onClick={() => setCityFilter('ALL')}
                            className={`px-4 py-2 rounded-full text-xs font-black transition-all ${cityFilter === 'ALL' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                        >
                            全部地市
                        </button>
                        {FUJIAN_CITIES.map(city => (
                            <button
                                key={city}
                                onClick={() => setCityFilter(city)}
                                className={`px-4 py-2 rounded-full text-xs font-black transition-all whitespace-nowrap ${cityFilter === city ? 'bg-blue-500 text-white' : 'bg-white text-gray-500 border border-gray-100 hover:border-blue-200'}`}
                            >
                                {city}
                            </button>
                        ))}
                    </div>
                )}

                {/* Main Content Area */}
                {channelTab === 'announcement' ? (
                    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
                        {/* 1. Global Parameters & Preview */}
                        <div className="flex flex-col gap-6">
                            <div className="w-full bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                                <h3 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                                    <Activity size={20} className="text-blue-500" />
                                    实时预览 (1:1 终端还原)
                                </h3>

                                {/* 1:1 Preview Container - Full Width */}
                                <div className="relative w-full aspect-[16/2.2] bg-gray-900 rounded-2xl overflow-hidden border-4 border-gray-800 shadow-inner">
                                    <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]" />
                                    <AdminMarqueePreview announcements={announcements} availableTags={availableTags} />
                                </div>

                                <div className="mt-8">
                                    <p className="text-xs text-gray-400 font-bold italic">
                                        * 公告系统已切换为极简悬浮模式，移除了复杂的轮播调度逻辑。
                                    </p>
                                </div>
                            </div>

                            <div className="w-full bg-indigo-900 rounded-3xl shadow-xl p-8 text-white relative overflow-hidden border border-indigo-800">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl opacity-50" />
                                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                                    <div className="flex-1">
                                        <h3 className="text-xl font-black mb-2 opacity-90">控制面板</h3>
                                        <p className="text-white/60 text-xs leading-relaxed max-w-lg">
                                            您可以一次性编辑多条公告或调整全局比例，调整完后请点击下方保存同步按钮。
                                        </p>
                                    </div>
                                    <div className="flex gap-4 w-full md:w-auto">
                                        <button
                                            onClick={() => {
                                                setEditingAnnouncement({ content: '', scope: 'ALL', tags: [], status: true });
                                                setIsAnnouncementModalOpen(true);
                                            }}
                                            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-white text-indigo-900 font-black rounded-2xl hover:bg-gray-100 transition-all active:scale-[0.98] shadow-lg shadow-indigo-950/20"
                                        >
                                            <Plus size={20} /> 添加公告条目
                                        </button>
                                        <button
                                            onClick={handleBatchSave}
                                            disabled={!hasChanges}
                                            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-8 py-4 font-black rounded-2xl transition-all shadow-xl shadow-red-950/20 ${hasChanges ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' : 'bg-white/10 text-white/30 cursor-not-allowed'}`}
                                        >
                                            <Save size={20} /> 保存发布并同步
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Announcement List Table */}
                        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-xl font-black text-gray-800">公告内容编排</h3>
                                {hasChanges && <span className="text-[10px] font-black text-red-500 bg-red-50 px-3 py-1 rounded-full animate-bounce">有未保存的草稿变更</span>}
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="border-b border-gray-50">
                                            <th className="pb-4 font-black text-xs text-gray-400 uppercase tracking-widest">投放范围</th>
                                            <th className="pb-4 font-black text-xs text-gray-400 uppercase tracking-widest">属性标签</th>
                                            <th className="pb-4 font-black text-xs text-gray-400 uppercase tracking-widest">公告文本内容</th>
                                            <th className="pb-4 font-black text-xs text-gray-400 uppercase tracking-widest">状态</th>
                                            <th className="pb-4 font-black text-xs text-gray-400 uppercase tracking-widest text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {Array.isArray(announcements) && announcements.map((ann, idx) => (
                                            <tr key={ann.id || idx} className="hover:bg-gray-50/50 transition-colors group">
                                                <td className="py-4">
                                                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${ann.scope === 'ALL' ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {ann.scope === 'ALL' ? '全省投放' : `${ann.scope}市`}
                                                    </span>
                                                </td>
                                                <td className="py-4">
                                                    <div className="flex flex-wrap gap-1">
                                                        {(ann.tags || []).map(tagName => {
                                                            const tag = availableTags.find(t => t.name === tagName);
                                                            const color = tag ? tag.color : 'rgb(148, 163, 184)';
                                                            return (
                                                                <div
                                                                    key={tagName}
                                                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black transition-all"
                                                                    style={{ backgroundColor: rgbaFromColor(color, 0.12), color: color }}
                                                                >
                                                                    <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                                                                    {tagName}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                <td className="py-4 pr-10">
                                                    <div className="text-sm font-bold text-gray-700 line-clamp-1">{ann.content}</div>
                                                </td>
                                                <td className="py-4">
                                                    <div className={`flex items-center gap-1.5 text-[10px] font-black ${ann.status ? 'text-emerald-500' : 'text-gray-300'}`}>
                                                        <div className={`w-1.5 h-1.5 rounded-full ${ann.status ? 'bg-emerald-500 animate-pulse' : 'bg-gray-300'}`} />
                                                        {ann.status ? '活跃' : '隐藏'}
                                                    </div>
                                                </td>
                                                <td className="py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button
                                                            onClick={() => { setEditingAnnouncement(ann); setIsAnnouncementModalOpen(true); }}
                                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                        >
                                                            <Settings size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleAnnouncementDelete(ann.id)}
                                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {announcements.length === 0 && (
                                            <tr>
                                                <td colSpan="4" className="py-20 text-center text-gray-300 font-bold uppercase tracking-widest text-sm italic">暂无公告内容</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                        {/* Sidebar */}
                        <div className="lg:col-span-1 space-y-6">
                            {/* Create Form */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h2 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-gray-50 pb-3">
                                    <Plus size={20} className={channelTab === 'android' ? 'text-indigo-500' : 'text-blue-500'} />
                                    开通新门店 ({channelTab === 'tv' ? '电视版' : '安卓版'})
                                </h2>
                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">门店唯一 ID</label>
                                        <input
                                            type="text" required
                                            value={newStore.id}
                                            onChange={(e) => setNewStore({ ...newStore, id: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                            placeholder="如: shop-01"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">门店名称</label>
                                        <input
                                            type="text" required
                                            value={newStore.name}
                                            onChange={(e) => setNewStore({ ...newStore, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            placeholder="如: 王府井智慧点"
                                        />
                                    </div>
                                    {channelTab === 'tv' && (
                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">店长初始密钥</label>
                                            <input
                                                type="text" required
                                                value={newStore.adminKey}
                                                onChange={(e) => setNewStore({ ...newStore, adminKey: e.target.value })}
                                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                                placeholder="分配密码"
                                            />
                                        </div>
                                    )}
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-1 ml-1">所属地市</label>
                                        <select
                                            value={newStore.city}
                                            onChange={(e) => setNewStore({ ...newStore, city: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                        >
                                            {FUJIAN_CITIES.map(c => <option key={c} value={c}>{c}市</option>)}
                                        </select>
                                    </div>
                                    <button className={`w-full py-3.5 mt-4 text-white font-black rounded-xl shadow-lg transition-all ${channelTab === 'android' ? 'bg-indigo-600' : 'bg-blue-600'}`}>
                                        分配新{channelTab === 'tv' ? '电视' : '安卓'}门店
                                    </button>
                                </form>
                            </div>

                            {/* Global Config */}
                            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                                    <Settings size={20} className="text-purple-500" />
                                    全局配置
                                </h2>
                                <div className="space-y-6">
                                    <div className="pb-4 border-b border-gray-100">
                                        <label className="flex items-center justify-between cursor-pointer group">
                                            <span className="text-sm font-bold text-gray-700 group-hover:text-purple-600 transition-colors">显示计算器按钮</span>
                                            <div className="relative">
                                                <input type="checkbox" className="sr-only peer" checked={showCalculator} onChange={e => setShowCalculator(e.target.checked)} />
                                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                                            </div>
                                        </label>
                                    </div>
                                    <div className="pb-4 border-b border-gray-100">
                                        <div className="text-sm font-bold text-gray-700 mb-3">联系人称呼模板（总后台分配）</div>
                                        <div className="flex flex-wrap gap-2">
                                            {DEFAULT_MANAGER_TITLES.map(title => {
                                                const active = managerTitleTemplates.includes(title);
                                                return (
                                                    <button
                                                        key={title}
                                                        type="button"
                                                        onClick={() => toggleManagerTitleTemplate(title)}
                                                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${active ? 'bg-purple-50 text-purple-700 border-purple-300' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}
                                                    >
                                                        {active ? '已启用' : '未启用'} · {title}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                        <p className="text-[11px] text-gray-400 mt-2">门店联系人仅允许“姓氏 + 启用模板”格式。</p>
                                    </div>
                                    <button onClick={handleCronUpdate} className="w-full py-2 bg-purple-600 text-white rounded-lg font-bold text-sm">保存全局设置</button>
                                </div>
                            </div>
                        </div>

                        {/* Main Grid Area */}
                        <div className="lg:col-span-3 space-y-6">
                            {/* Main Station Card */}
                            {stores.find(s => s.id === 'default') && (
                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-1 shadow-lg text-white">
                                    <div className="bg-white/10 backdrop-blur-sm p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        <div>
                                            <h2 className="text-xl font-bold flex items-center gap-2"><Store className="text-white" /> 平台主站</h2>
                                            <p className="text-blue-100 text-sm">此处的游戏配置将被所有无独立后台的“安卓渠道”继承。</p>
                                        </div>
                                        <button onClick={() => setSettingsStore(stores.find(s => s.id === 'default'))} className="bg-white text-blue-600 px-5 py-2.5 rounded-xl font-bold font-black">统筹控制台</button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
                                    <h2 className="text-lg font-bold text-gray-500">{channelTab === 'tv' ? '📺 电视' : '📱 安卓'}分站列表 ({filteredStores.length})</h2>
                                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
                                        <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-lg ${viewMode === 'list' ? 'bg-gray-100 text-gray-800' : 'text-gray-400'}`}><List size={18} /></button>
                                        <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-lg ${viewMode === 'grid' ? 'bg-gray-100 text-gray-800' : 'text-gray-400'}`}><LayoutGrid size={18} /></button>
                                    </div>
                                </div>

                                {filteredStores.length === 0 ? (
                                    <div className="bg-white p-12 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                                        <Store size={48} className="mb-4 opacity-50" />
                                        <p className="font-bold">暂无营业门店</p>
                                    </div>
                                ) : (
                                    <div className={`${viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5' : 'space-y-4'}`}>
                                        {filteredStores.map(store => (
                                            <div key={store.id} className={`bg-white rounded-2xl shadow-sm border ${store.status === 'closed' ? 'bg-red-50/30' : 'border-gray-100'} p-5 flex flex-col justify-between gap-4`}>
                                                <div className="flex justify-between items-start">
                                                    <div className="flex gap-1.5">
                                                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-mono rounded">{store.id}</span>
                                                        <span className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-bold rounded">{store.city}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${store.isOnline ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>{store.isOnline ? '在线' : '离线'}</span>
                                                    </div>
                                                </div>
                                                <h3 className="font-black text-gray-800 text-lg truncate">{store.name}</h3>
                                                <div className="flex items-center justify-between border-t border-gray-50 pt-4 mt-2">
                                                    <div className="text-[10px] font-bold text-gray-400">{store.isOnline ? store.currentPage : '等待连接...'}</div>
                                                    <div className="flex items-center gap-1">
                                                        <a href={`#/s/${store.id}`} target="_blank" className="p-2 text-gray-400 hover:text-blue-500"><LinkIcon size={18} /></a>
                                                        <button onClick={() => handleRemoteCommand(store.id, '/')} className="p-2 text-gray-400 hover:text-indigo-500"><Home size={18} /></button>
                                                        {channelTab === 'tv' ? (
                                                            <button onClick={() => setSettingsStore(store)} className="p-2 text-gray-400 hover:text-green-500"><Settings size={18} /></button>
                                                        ) : (
                                                            <button
                                                                onClick={() => {
                                                                    const titles = sanitizeManagerTitles(managerTitleTemplates);
                                                                    const parts = splitManagerText(store.manager, titles);
                                                                    setAndroidSurname(String(parts.surname || '').replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 2));
                                                                    setAndroidTitle(titles.includes(parts.title) ? parts.title : titles[0]);
                                                                    setAndroidPhone(String(store.contact || store.phone || '').replace(/\D/g, '').slice(0, 11));
                                                                    setAndroidFormError('');
                                                                    setAndroidEditingStore(store);
                                                                }}
                                                                className="p-2 text-gray-400 hover:text-green-500"
                                                            >
                                                                <Settings size={18} />
                                                            </button>
                                                        )}
                                                        <button onClick={() => handleDelete(store.id)} className="p-2 text-gray-400 hover:text-red-500"><Trash2 size={18} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            {settingsStore && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-[96vw] max-w-[1600px] h-[92vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95">
                        <StoreConfig storeId={settingsStore.id} initialKey={settingsStore.adminKey} onClose={() => setSettingsStore(null)} superKey={superKey} />
                    </div>
                </div>
            )}

            {androidEditingStore && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                        <h3 className="font-bold text-xl mb-6">{'\u95e8\u5e97\u57fa\u7840\u4fe1\u606f\u8bbe\u7f6e'}</h3>
                        <form onSubmit={handleAndroidInfoSave} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">{'\u95e8\u5e97\u540d\u79f0'}</label>
                                <input
                                    value={androidEditingStore.name || ''}
                                    onChange={e => setAndroidEditingStore({ ...androidEditingStore, name: e.target.value })}
                                    className="w-full p-3 border rounded-xl"
                                    placeholder={'\u8bf7\u8f93\u5165\u95e8\u5e97\u540d\u79f0'}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-2">{'\u95e8\u5e97\u5730\u5740'}</label>
                                <input
                                    value={androidEditingStore.address || ''}
                                    onChange={e => setAndroidEditingStore({ ...androidEditingStore, address: e.target.value })}
                                    className="w-full p-3 border rounded-xl"
                                    placeholder={'\u8bf7\u8f93\u5165\u95e8\u5e97\u5730\u5740'}
                                />
                            </div>
                            <div className="flex gap-4">
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-gray-500 mb-2">{'\u8d1f\u8d23\u4eba'}</label>
                                    <div className="grid grid-cols-[110px_1fr] gap-2">
                                        <input
                                            value={androidSurname}
                                            onChange={e => setAndroidSurname(e.target.value || '')}
                                            onBlur={e => setAndroidSurname(String(e.target.value || '').trim())}
                                            className="w-full p-3 border rounded-xl"
                                            placeholder={'\u59d3\u6c0f'}
                                            maxLength={8}
                                        />
                                        <select
                                            value={androidTitle}
                                            onChange={e => setAndroidTitle(e.target.value)}
                                            className="w-full p-3 border rounded-xl bg-white"
                                        >
                                            {sanitizeManagerTitles(managerTitleTemplates).map(title => (
                                                <option key={title} value={title}>{title}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <p className="text-[11px] text-gray-400 mt-1">预览：{androidSurname ? `${androidSurname}${androidTitle}` : '--'}</p>
                                </div>
                                <div className="w-full">
                                    <label className="block text-xs font-bold text-gray-500 mb-2">{'\u8054\u7cfb\u7535\u8bdd'}</label>
                                    <input
                                        value={androidPhone}
                                        onChange={e => setAndroidPhone(String(e.target.value || '').replace(/\D/g, '').slice(0, 11))}
                                        className="w-full p-3 border rounded-xl"
                                        placeholder={'\u8bf7\u8f93\u5165\u8054\u7cfb\u7535\u8bdd'}
                                        maxLength={11}
                                        inputMode="numeric"
                                    />
                                </div>
                            </div>
                            {androidFormError && <div className="text-xs text-red-500 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{androidFormError}</div>}
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setAndroidEditingStore(null)} className="flex-1 py-3 bg-gray-100 rounded-xl">{'\u53d6\u6d88'}</button>
                                <button type="submit" className="flex-1 py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg">{'\u4fdd\u5b58'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAnnouncementModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
                    <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl p-6 animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-xl">发布中心公告</h3>
                            <button onClick={() => setIsAnnouncementModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X /></button>
                        </div>
                        <form onSubmit={handleAnnouncementSave} className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-wider">公告文本内容</label>
                                <textarea
                                    value={editingAnnouncement.content}
                                    onChange={e => setEditingAnnouncement({ ...editingAnnouncement, content: e.target.value })}
                                    className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                    rows="3"
                                    placeholder="请输入公告条目主要文本内容..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-wider">投放范围 (Scope)</label>
                                    <select
                                        value={editingAnnouncement.scope}
                                        onChange={e => setEditingAnnouncement({ ...editingAnnouncement, scope: e.target.value })}
                                        className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer"
                                    >
                                        <option value="ALL">全省投放</option>
                                        {FUJIAN_CITIES.map(c => <option key={c} value={c}>{c}市</option>)}
                                    </select>
                                </div>
                                <div className="space-y-0">
                                    <label className="text-[10px] font-black text-gray-400 mb-2 block uppercase tracking-wider">属性标签 (Tags)</label>
                                    <div className="relative">
                                        <div
                                            className="flex flex-wrap items-center gap-1.5 p-3 bg-gray-50 border-none rounded-xl text-sm font-bold focus-within:ring-2 focus-within:ring-blue-500 transition-all cursor-pointer min-h-[44px]"
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
                                                            <div key={tagName} className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-black shadow-sm" style={{ backgroundColor: rgbaFromColor(color, 0.12), color: color }}>
                                                                <div className="w-1 h-1 rounded-full" style={{ backgroundColor: color }} />
                                                                {tagName}
                                                            </div>
                                                        );
                                                    })
                                                ) : (
                                                    <span className="text-gray-300 font-bold px-1">请选择标签...</span>
                                                )}
                                            </div>
                                            <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${isTagManagerOpen ? 'rotate-180' : ''}`} />
                                        </div>

                                        {isTagManagerOpen && (
                                            <div
                                                ref={tagManagerRef}
                                                className="absolute top-full left-0 right-0 mt-1 z-[160] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl animate-in fade-in slide-in-from-top-1 duration-200"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                {editingTagIndex === null ? (
                                                    <div className="flex flex-col max-h-96">
                                                        <div className="p-2 border-b border-gray-50 bg-gray-50/30">
                                                            <div className="relative group">
                                                                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                                    <Search size={14} />
                                                                </div>
                                                                <input
                                                                    autoFocus
                                                                    type="text"
                                                                    placeholder="搜索或输入新名称..."
                                                                    value={tagSearchQuery}
                                                                    onChange={e => setTagSearchQuery(e.target.value)}
                                                                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex-1 overflow-y-auto px-1 py-1 custom-scrollbar">
                                                            {availableTags
                                                                .filter(t => t.name.toLowerCase().includes(tagSearchQuery.toLowerCase()))
                                                                .map((tag, idx) => (
                                                                    <div
                                                                        key={tag.name}
                                                                        className={`group flex items-center justify-between p-2 rounded-lg transition-all cursor-pointer ${editingAnnouncement.tags?.includes(tag.name) ? 'bg-blue-500 text-white shadow-md shadow-blue-100' : 'hover:bg-gray-100'}`}
                                                                        onClick={() => {
                                                                            setEditingAnnouncement({ ...editingAnnouncement, tags: [tag.name] });
                                                                            setIsTagManagerOpen(false);
                                                                        }}
                                                                    >
                                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${editingAnnouncement.tags?.includes(tag.name) ? 'ring-2 ring-white/50' : ''}`} style={{ backgroundColor: tag.color }} />
                                                                            <span className="text-xs font-bold truncate">{tag.name}</span>
                                                                        </div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={(e) => {
                                                                                e.stopPropagation();
                                                                                setEditingTagIndex(availableTags.indexOf(tag));
                                                                                setNewTagName(tag.name);
                                                                                setNewTagColor(normalizeColorToRgb(tag.color));
                                                                            }}
                                                                            className={`p-1.5 rounded-md transition-all ${editingAnnouncement.tags?.includes(tag.name) ? 'hover:bg-white/20 text-white' : 'hover:bg-white text-gray-300 hover:text-blue-500'}`}
                                                                        >
                                                                            <Settings size={14} />
                                                                        </button>
                                                                    </div>
                                                                ))}

                                                            {tagSearchQuery && !availableTags.some(t => t.name === tagSearchQuery) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); setEditingTagIndex(-1); setNewTagName(tagSearchQuery); setNewTagColor('rgb(59, 130, 246)'); }}
                                                                    className="w-full flex items-center gap-2 p-3 text-blue-500 hover:bg-blue-50 rounded-lg transition-all text-xs font-black mt-1 border border-dashed border-blue-100"
                                                                >
                                                                    <Plus size={16} />
                                                                    <span>创建标签 "{tagSearchQuery}"</span>
                                                                </button>
                                                            )}
                                                        </div>

                                                        <button
                                                            type="button"
                                                            onClick={(e) => { e.stopPropagation(); setEditingTagIndex(-1); setNewTagName(''); setNewTagColor('rgb(59, 130, 246)'); }}
                                                            className="flex items-center gap-2 p-3 text-gray-400 hover:text-blue-600 hover:bg-gray-50 border-t border-gray-50 transition-all text-xs font-bold"
                                                        >
                                                            <Plus size={16} />
                                                            <span>自定义新维度</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col animate-in slide-in-from-right-2">
                                                        <div className="flex items-center gap-2 p-3 border-b border-gray-50 bg-gray-50/50">
                                                            <button type="button" onClick={() => setEditingTagIndex(null)} className="p-1 hover:bg-white rounded-md transition-all text-gray-400 hover:text-gray-800"><ArrowLeft size={16} /></button>
                                                            <span className="text-xs font-black text-gray-700">{editingTagIndex === -1 ? '新增维度' : '详情校准'}</span>
                                                        </div>

                                                        <div className="p-4 space-y-4">
                                                            <div className="space-y-1.5">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">名称</label>
                                                                <input
                                                                    autoFocus
                                                                    value={newTagName}
                                                                    onChange={e => setNewTagName(e.target.value)}
                                                                    className="w-full p-2.5 bg-gray-50 border border-gray-100 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                                                                    placeholder="名称..."
                                                                />
                                                            </div>
                                                            <div className="space-y-2">
                                                                <label className="text-[10px] font-black text-gray-400 uppercase ml-1">RGB 动态配色</label>
                                                                <PremiumColorPicker 
                                                                    color={newTagColor || 'rgb(59, 130, 246)'}
                                                                    onChange={(val) => setNewTagColor(val)}
                                                                />
                                                            </div>
                                                        </div>


                                                        <div className="p-3 border-t border-gray-50 flex gap-2 bg-gray-50/30">
                                                            {editingTagIndex !== -1 && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => {
                                                                        if (window.confirm('确认移除该属性吗？')) {
                                                                            setAvailableTags(availableTags.filter((_, i) => i !== editingTagIndex));
                                                                            setHasChanges(true);
                                                                            setEditingTagIndex(null);
                                                                        }
                                                                    }}
                                                                    className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-all flex items-center justify-center"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    if (!newTagName) return;
                                                                    const normalizedColor = normalizeColorToRgb(newTagColor);
                                                                    if (editingTagIndex === -1) {
                                                                        setAvailableTags([...availableTags, { name: newTagName, color: normalizedColor }]);
                                                                    } else {
                                                                        const next = [...availableTags];
                                                                        next[editingTagIndex] = { name: newTagName, color: normalizedColor };
                                                                        setAvailableTags(next);
                                                                    }
                                                                    setHasChanges(true);
                                                                    setEditingTagIndex(null);
                                                                }}
                                                                className="flex-1 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 active:scale-95 transition-all text-sm"
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

                            <label className="flex items-center gap-3 p-4 bg-emerald-50/50 rounded-2xl cursor-pointer group transition-all hover:bg-emerald-50 border border-emerald-100/50">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 rounded-md border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                    checked={editingAnnouncement.status}
                                    onChange={e => setEditingAnnouncement({ ...editingAnnouncement, status: e.target.checked })}
                                />
                                <div className="flex flex-col">
                                    <span className="text-sm font-black text-emerald-800">立即生效并同步</span>
                                    <span className="text-[10px] text-emerald-600 font-bold opacity-60">勾选以后预览区及终端将立即看到该公告</span>
                                </div>
                            </label>

                            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2 uppercase tracking-tighter text-sm">
                                <Activity size={20} />
                                确定并加入公告编排列表
                            </button>
                        </form>
                    </div>
                </div>
            )}



            {
                showManualInput && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in">
                        <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-lg space-y-4">
                            <h3 className="text-xl font-bold text-gray-800">手动录入开奖结果</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-400">期号 (如 26010)</label>
                                    <input className="w-full p-2 border rounded-lg" placeholder="26010" id="m_period" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-400">日期 (如 01月26日 周一)</label>
                                    <input className="w-full p-2 border rounded-lg" placeholder="01月26日 周一" id="m_date" />
                                </div>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400">红球 (空格分隔 5个)</label>
                                <input className="w-full p-2 border rounded-lg text-red-500 font-bold" placeholder="05 12 18 20 25" id="m_reds" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400">蓝球 (空格分隔 2个)</label>
                                <input className="w-full p-2 border rounded-lg text-blue-500 font-bold" placeholder="03 11" id="m_blues" />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-400">奖池金额</label>
                                <input className="w-full p-2 border rounded-lg" placeholder="888,888,888" id="m_pool" />
                            </div>
                            <div className="flex gap-2 justify-end pt-4">
                                <button onClick={() => setShowManualInput(false)} className="px-4 py-2 text-gray-500">取消</button>
                                <button onClick={handleManualSubmit} className="px-4 py-2 bg-purple-600 text-white rounded-lg">确认发布</button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
