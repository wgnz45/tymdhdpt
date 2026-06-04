import React, { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Zap, Trophy, ChevronRight, Volume2, Flame, ArrowRight, MapPin, Phone, Star, TrendingUp, Moon, Sparkles, Gamepad2, Store, HeartHandshake, Globe, Radio, Play, X, Lock, Ticket, Camera, QrCode } from 'lucide-react';
import { useHeartbeat } from '../components/StoreClientLayout';
import PhotoStickerCamera from '../components/PhotoStickerCamera';
import { useStoreData } from '../hooks/useStoreData';
import { usePerformanceMode } from '../hooks/usePerformanceMode';
import { shouldUpdateState, isAndroidDevice } from '../utils/performanceConfig';
import TcwLogo from '../assets/体彩logo.png';
import CustomerServiceQR from '../assets/门店客服.png';
import DltLogo from '../assets/logo_dlt.png';
import Home from './Home';
import ScratchCard from './ScratchCard';

import StoreConfig from '../admin/StoreConfig';
import WinnerConfig from '../admin/WinnerConfig';

/* =========================================
   MOCK DATA
   ========================================= */
const MOCK_STORE = {
    name: '大榕树文创园店',
    manager: '王店长',
    address: '福建省福州市鼓楼区东街口88号',
    phone: '13888888888',
    hours: '08:30 - 22:00',
    notice: '本店今日大乐透活动进行中，欢迎理性参与。',
    qrUrl: '',
};

const MOCK_CAROUSEL = [
    { id: 1, url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=900&q=80', title: '大乐透玩法更新', sub: '本周奖池稳定增长', badge: '进行中', c1: '#FF416C', c2: '#FF9500' },
    { id: 2, url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=900&q=80', title: '体彩顶呱刮体验', sub: '互动体验区已开放', badge: '新上线', c1: '#11998e', c2: '#38ef7d' },
];

const MOCK_WINNERS = [
    { id: 1, text: '恭喜本店购彩者中出大乐透二等奖。', color: '#FF416C' },
    { id: 2, text: '本店近期中奖喜讯持续更新中。', color: '#11998e' },
    { id: 3, text: '排列玩法近期活跃，欢迎咨询。', color: '#f09819' },
    { id: 4, text: '顶呱刮互动体验区人气提升。', color: '#4776E6' },
    { id: 5, text: '理性购彩，量力而行。', color: '#AF52DE' },
];

const MOCK_INDUSTRY_NEWS = [
    { id: 1, title: '体彩中心发布最新责任彩票公告。', tag: '最新', tagColor: '#FF416C', tagBg: '#FF416C15' },
    { id: 2, title: '公益金项目持续推进，服务民生。', tag: '聚焦', tagColor: '#007AFF', tagBg: '#007AFF15' },
    { id: 3, title: '全国体彩工作会议部署年度重点任务。', tag: '行业', tagColor: '#AF52DE', tagBg: '#AF52DE15' },
];

const MOCK_LOCAL_NEWS = [
    { id: 1, title: '福建体彩线下服务能力持续提升。', tag: '福建', tagColor: '#35C759', tagBg: '#35C75915' },
    { id: 2, title: '福州门店互动活动本周持续开展。', tag: '活动', tagColor: '#FF9500', tagBg: '#FF950015' },
    { id: 3, title: '省内门店完成阶段性视觉升级。', tag: '动态', tagColor: '#8E8E93', tagBg: '#8E8E9315' },
];

const MOCK_LIVE_DRAWS = [
    { id: 1, name: '超级大乐透', time: '每周一、三、六 21:25', days: [1, 3, 6], colors: ['#FF416C', '#FF9500'], numbers: ['07', '12', '21', '25', '33'], bonusNumbers: ['04', '11'] },
    { id: 2, name: '排列3', time: '每天 21:25', days: [0, 1, 2, 3, 4, 5, 6], colors: ['#007AFF', '#34C759'], numbers: ['3', '4', '7'] },
    { id: 3, name: '排列5', time: '每天 21:25', days: [0, 1, 2, 3, 4, 5, 6], colors: ['#AF52DE', '#FF2D55'], numbers: ['3', '4', '7', '4', '9'] },
    { id: 4, name: '7星彩', time: '每周二、五、日 21:25', days: [0, 2, 5], colors: ['#FF9500', '#FFCC00'], numbers: ['2', '6', '9', '8', '3', '8'], bonusNumbers: ['14'] },
];

const MOCK_WELFARE_CULTURE = [
    { id: 1, title: '截至当日公益金筹集情况', value: '9963.57', unit: '亿元' },
    { id: 2, title: '公益行动执行情况', value: '1350', unit: '个项目' },
];

/* =========================================
   FORTUNE DATA (derived from current date)
   ========================================= */

// Global Marquee Animation
const TickerStyle = () => (
    <style>{`
        @keyframes marqueeTrainAnimation {
            0% { transform: translateX(100%); }
            100% { transform: translateX(-100%); }
        }
    `}</style>
);

// Daily fortune now purely relies on crawled data
function getDailyFortune(date) {
    return null;
}

const SmallGameButton = ({ title, gradient, gradientColors, disabled, badge, onClick, accent = '#ffffff', icon = null, iconSize = null, buttonSize = 66, isLowPerf = false }) => {
    const titleStr = String(title || '');
    const line1 = titleStr.slice(0, 2);
    const line2 = titleStr.slice(2);
    const hasSecondLine = line2.length > 0;
    const gradientStyle = !disabled && Array.isArray(gradientColors) && gradientColors.length === 2
        ? { backgroundImage: `linear-gradient(135deg, ${gradientColors[0]}, ${gradientColors[1]})` }
        : undefined;
    const btnSize = Number(buttonSize) || 66;
    const fallbackIconSize = Math.round(btnSize * 0.62);
    const iconBoxSize = icon === false ? 0 : (iconSize || fallbackIconSize);
    const labelFontSize = btnSize >= 86 ? 12 : btnSize >= 78 ? 11 : 10;
    const buttonStyle = { width: btnSize, height: btnSize, ...(gradientStyle || {}) };

    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={`relative overflow-hidden rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95
                ${disabled ? 'bg-slate-100 text-slate-400 cursor-not-allowed ring-1 ring-slate-200' : `bg-gradient-to-br ${gradient} text-white ${isLowPerf ? 'shadow-md' : 'shadow-[0_10px_20px_rgba(0,0,0,0.14)] hover:shadow-[0_14px_24px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 transition-all duration-300'} ring-1 ring-white/40`}
            `}
            style={buttonStyle}
        >
            {!disabled && !isLowPerf && (
                <>
                    <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full bg-white/25 blur-xl" />
                    <div className="absolute -bottom-5 -left-5 w-14 h-14 rounded-full bg-white/10 blur-lg" />
                </>
            )}
            <div className="relative z-10 flex items-center justify-center" style={{ width: iconBoxSize, height: iconBoxSize }}>
                {icon === false ? null : (icon ? (
                    <div className="w-full h-full flex items-center justify-center">{icon}</div>
                ) : (
                    <svg className="w-full h-full" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="12" cy="12" r="10" stroke={disabled ? '#cbd5e1' : 'rgba(255,255,255,0.85)'} strokeWidth="2" fill="none" />
                        <circle cx="12" cy="12" r="7" stroke={disabled ? '#e2e8f0' : 'rgba(255,255,255,0.55)'} strokeWidth="1.5" fill="none" />
                        <circle cx="12" cy="12" r="3.8" fill={disabled ? '#cbd5e1' : accent} opacity="0.9" />
                        <circle cx="17" cy="7" r="1.6" fill={disabled ? '#cbd5e1' : 'rgba(255,255,255,0.85)'} />
                    </svg>
                ))}
            </div>
            <span className="relative z-10 font-black leading-tight text-center" style={{ fontSize: labelFontSize }}>
                <span className="block">{line1}</span>
                {hasSecondLine && <span className="block">{line2}</span>}
            </span>
            {badge && (
                <span className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-black ${disabled ? 'text-slate-400' : 'text-white/90'}`}>
                    {badge}
                </span>
            )}
        </button>
    );
};

/* =========================================
   SHARED MINI COMPONENTS
   ========================================= */
const Ball = ({ number, color, size = 36 }) => (
    <div style={{
        width: size, height: size, borderRadius: '50%',
        background: `radial-gradient(circle at 38% 30%, #fff 0%, ${color} 38%, ${color}bb 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontWeight: 900, color: 'white', fontSize: size * 0.36,
        boxShadow: `0 4px 14px ${color}55, 0 1px 0 rgba(255,255,255,0.6) inset`,
        textShadow: '0 1px 3px rgba(0,0,0,0.25)', flexShrink: 0,
    }}>{number}</div>
);

const SpeedLines = ({ color = '#fff', opacity = 0.07 }) => (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ opacity }} viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        {[...Array(10)].map((_, i) => {
            const y = 150 + (i - 5) * 26;
            return <React.Fragment key={i}>
                <line x1="200" y1={y} x2="-30" y2={y + (i - 5) * 16} stroke={color} strokeWidth={i % 3 === 0 ? 2.5 : 1.5} />
                <line x1="200" y1={y} x2="430" y2={y + (i - 5) * 16} stroke={color} strokeWidth={i % 3 === 0 ? 2.5 : 1.5} />
            </React.Fragment>;
        })}
    </svg>
);

const WinnerEditingOverlay = ({ compact = false, className = '', isLowPerf = false }) => (
    <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center pointer-events-none ${className}`}>
        {/* iOS Liquid Glass Base */}
        <div className={`absolute inset-0 ${isLowPerf ? 'bg-white/80' : 'bg-white/10 backdrop-blur-[24px] backdrop-saturate-[180%]'} shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]`} />

        {/* Subtle Frost Border Container */}
        <div className="absolute inset-[10px] rounded-2xl border border-white/40 shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]" />

        <div className="relative z-10 flex flex-col items-center">
            {/* Pill shape container with inner lighting and glassmorphism */}
            <div className={`rounded-full border border-white/50 bg-gradient-to-b from-white/70 to-white/20 ${isLowPerf ? 'shadow-md' : 'shadow-[0_12px_40px_rgba(0,0,0,0.12),inset_0_2px_2px_rgba(255,255,255,0.9)] backdrop-blur-md'} ${compact ? 'px-6 py-2.5' : 'px-8 py-3'}`}>
                <span className={`font-black leading-none tracking-[0.16em] text-rose-400 ${compact ? 'text-[18px]' : 'text-[24px]'}`} style={{ textShadow: '0 1px 1px rgba(255,255,255,0.9)' }}>
                    更新中<span className={isLowPerf ? '' : 'animate-pulse'}>...</span>
                </span>
            </div>
        </div>
    </div>
);

// Central Admin Marquee for Broadcast Announcements
const getTagColor = (tag, availableTags = []) => {
    if (typeof tag === 'object' && tag.color) return tag.color;
    const name = String(typeof tag === 'string' ? tag : tag?.name || '').trim();

    // First try finding in availableTags if passed
    const found = (availableTags || []).find(t => String(t?.name || '').trim() === name);
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
    return map[name] || 'rgb(148, 163, 184)';
};

const colorWithAlpha = (color, alpha = 1) => {
    const c = String(color || '').trim();
    const rgbMatch = c.match(/^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
    if (rgbMatch) return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${alpha})`;
    const hexMatch = c.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
    if (hexMatch) {
        const hex = hexMatch[1].length === 3
            ? hexMatch[1].split('').map(ch => ch + ch).join('')
            : hexMatch[1];
        const r = parseInt(hex.slice(0, 2), 16);
        const g = parseInt(hex.slice(2, 4), 16);
        const b = parseInt(hex.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(148, 163, 184, ${alpha})`;
};

const CentralMarquee = React.memo(({ announcements, availableTags = [], androidPadMode = false, isLowPerf = false }) => {
    const activeAnns = (announcements || []).filter(a => a.status);
    const isAndroid = isAndroidDevice();

    if (activeAnns.length === 0) return null;

    // 安卓 WebView 的 backdrop-filter 会在元素边界外产生矩形模糊溢出（长条 bug），
    // 无法通过 clip-path / overflow:hidden 裁剪。安卓上用高透明度渐变模拟毛玻璃。
    const pillStyle = isAndroid ? {
        background: 'linear-gradient(135deg, rgba(255,255,255,0.38), rgba(255,255,255,0.15))',
        border: '1px solid rgba(255,255,255,0.4)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.12), inset 0 1px 1px rgba(255,255,255,0.4)'
    } : {
        background: 'linear-gradient(135deg, rgba(255,255,255,0.2), rgba(255,255,255,0.05))',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        boxShadow: '0 4px 15px rgba(0,0,0,0.1), inset 0 1px 1px rgba(255,255,255,0.3)'
    };

    // 安卓 WebView 不使用 backdrop-filter，避免矩形模糊溢出
    const containerBlurSafe = androidPadMode && !isAndroid;

    return (
        <div className="absolute top-0 left-0 right-0 z-[60] pointer-events-none">
            <TickerStyle />
            <div className={`mx-0 mt-4 flex items-center relative h-10 group pointer-events-none ${containerBlurSafe ? 'bg-white/40 backdrop-blur-3xl border-y border-white/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_8px_32px_rgba(0,0,0,0.15)]' : 'bg-transparent'}`}
                style={containerBlurSafe ? { WebkitBackdropFilter: 'blur(30px)' } : {}}>
                <div className="flex-1 overflow-hidden relative h-full flex items-center">
                    <div
                        key="marquee-inner"
                        className="absolute inset-y-0 left-0 flex items-center whitespace-nowrap"
                        style={{
                            animation: `marqueeTrainAnimation ${Math.max(20, activeAnns.length * 10)}s linear infinite`,
                            willChange: 'transform'
                        }}
                    >
                        <div className="flex items-center gap-20">
                            {activeAnns.map((ann, idx) => (
                                <div key={idx}
                                    className="h-9 pl-0 pr-4 rounded-full shadow-md flex items-center shrink-0 overflow-hidden"
                                    style={pillStyle}
                                >
                                    {ann.tags && ann.tags[0] && (() => {
                                        const t = ann.tags[0];
                                        const tagColor = getTagColor(t, availableTags);
                                        const tagName = typeof t === 'string' ? t : t?.name;
                                        return (
                                            <div className="flex items-center gap-2 px-4 h-full border-r border-white/20 shrink-0" style={{ backgroundColor: colorWithAlpha(tagColor, 0.38) }}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm" />
                                                <span className="text-sm font-black text-white uppercase tracking-tight leading-none" style={{ transform: androidPadMode ? 'translateY(1px)' : 'none' }}>{tagName}</span>
                                            </div>
                                        );
                                    })()}
                                    <div className="pl-3 pr-2 flex items-center h-full">
                                        <span className="text-white font-black text-base tracking-normal drop-shadow-md leading-none" style={{ transform: androidPadMode ? 'translateY(1px)' : 'none' }}>{ann.content}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

/* ── TREND COMPONENTS (Memoized) ── */
const TrendSkeleton = React.memo(() => (
    <div className="flex-1 min-h-0 flex overflow-hidden animate-pulse">
        <div className="w-[200px] border-r border-gray-100 bg-gray-50/30 flex flex-col shrink-0">
            <div className="px-3 py-2.5 border-b border-gray-100"><div className="w-16 h-3.5 bg-gray-200 rounded" /></div>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="px-3 py-2 border-b border-gray-50">
                    <div className="flex items-center gap-1">{Array.from({ length: 7 }).map((_, j) => <div key={j} className="w-6 h-6 rounded-full bg-gray-100" />)}</div>
                </div>
            ))}
        </div>
        <div className="flex-1 flex flex-col">
            <div className="h-10 bg-gray-50 border-b border-gray-100 flex items-center px-2 gap-1">
                {Array.from({ length: 20 }).map((_, j) => <div key={j} className="w-5 h-2.5 bg-gray-100 rounded" />)}
            </div>
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-8 border-b border-gray-50 flex items-center px-2 gap-0.5">
                    <div className="w-10 h-2.5 bg-gray-50 rounded mr-1" />
                    {Array.from({ length: 20 }).map((_, j) => <div key={j} className="w-4 h-4 rounded-full bg-gray-50" />)}
                </div>
            ))}
        </div>
    </div>
));

/* ── TREND CHART: 纯 Canvas 渲染，零 DOM 更新 ── */
const TrendChart = ({ history = [], androidPadMode = false }) => {
    const frontNumbers = useMemo(() => Array.from({ length: 35 }, (_, i) => i + 1), []);
    const backNumbers = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), []);
    const wrapperRef = React.useRef(null);
    const scrollRef = React.useRef(null);
    const canvasRef = React.useRef(null);
    const ROW_H = 32;
    const PERIOD_W = 56;
    const totalH = history.length * ROW_H;

    const [canvasW, setCanvasW] = React.useState(0);

    // 跟踪外层宽度（与表头对齐，不含滚动条）
    React.useEffect(() => {
        const el = wrapperRef.current;
        if (!el) return;
        setCanvasW(el.clientWidth);
        const ro = new ResizeObserver(([entry]) => setCanvasW(entry.contentRect.width));
        ro.observe(el);
        return () => ro.disconnect();
    }, []);

    // Canvas 绘制：全部内容一次性画完，滚动时零更新
    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || canvasW <= 0 || !history.length) return;

        // 大 canvas 限制 DPR 防止 OOM
        const rawDpr = window.devicePixelRatio || 1;
        const needed = canvasW * totalH * rawDpr * rawDpr;
        const dpr = needed > 40e6 ? 1 : rawDpr;

        canvas.width = canvasW * dpr;
        canvas.height = totalH * dpr;
        canvas.style.width = canvasW + 'px';
        canvas.style.height = totalH + 'px';

        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);

        const dataW = canvasW - PERIOD_W;
        const frontW = dataW * 35 / 47;
        const backW = dataW - frontW;
        const fCellW = frontW / 35;
        const bCellW = backW / 12;

        // ── 逐行绘制 ──
        for (let i = 0; i < history.length; i++) {
            const row = history[i];
            const y = i * ROW_H;
            const cy = y + ROW_H / 2;

            // 行背景
            ctx.fillStyle = i % 2 === 0 ? '#ffffff' : '#f9fafb';
            ctx.fillRect(0, y, canvasW, ROW_H);

            // 期号列背景
            ctx.fillStyle = 'rgba(249,250,251,0.5)';
            ctx.fillRect(0, y, PERIOD_W, ROW_H);

            // 期号文字
            ctx.fillStyle = '#6b7280';
            ctx.font = 'bold 11px ui-monospace,monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(String(row.issue || '').replace('期', ''), PERIOD_W / 2, cy);

            // 灰色数字（未命中）
            ctx.fillStyle = '#e5e7eb';
            ctx.font = '10px ui-monospace,monospace';
            for (let n = 1; n <= 35; n++) {
                ctx.fillText(String(n).padStart(2, '0'), PERIOD_W + (n - 0.5) * fCellW, cy);
            }
            for (let n = 1; n <= 12; n++) {
                ctx.fillText(String(n).padStart(2, '0'), PERIOD_W + frontW + (n - 0.5) * bCellW, cy);
            }

            // 命中球 — 前区
            const fHits = (row.numbers || []).map(Number);
            const bHits = (row.bonusNumbers || []).map(Number);
            ctx.font = 'bold 11px ui-monospace,monospace';
            for (const n of fHits) {
                const cx = PERIOD_W + (n - 0.5) * fCellW;
                ctx.fillStyle = '#f43f5e';
                ctx.beginPath();
                ctx.arc(cx, cy, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.fillText(String(n).padStart(2, '0'), cx, cy);
            }
            for (const n of bHits) {
                const cx = PERIOD_W + frontW + (n - 0.5) * bCellW;
                ctx.fillStyle = '#3b82f6';
                ctx.beginPath();
                ctx.arc(cx, cy, 11, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#ffffff';
                ctx.fillText(String(n).padStart(2, '0'), cx, cy);
            }
        }

        // ── 网格线 ──
        ctx.strokeStyle = '#f3f4f6';
        ctx.lineWidth = 1;
        for (let i = 0; i <= history.length; i++) {
            const ly = i * ROW_H + 0.5;
            ctx.beginPath(); ctx.moveTo(0, ly); ctx.lineTo(canvasW, ly); ctx.stroke();
        }
        // 期号列右边界
        ctx.beginPath(); ctx.moveTo(PERIOD_W + 0.5, 0); ctx.lineTo(PERIOD_W + 0.5, totalH); ctx.stroke();
        // 前后区分界
        ctx.beginPath(); ctx.moveTo(PERIOD_W + frontW + 0.5, 0); ctx.lineTo(PERIOD_W + frontW + 0.5, totalH); ctx.stroke();
    }, [canvasW, history, totalH]);

    return (
        <div className="flex-1 min-h-0 flex overflow-hidden">
            {/* ── Left: Results (固定 10 期) ── */}
            <div className="w-[158px] border-r-2 border-gray-200 bg-gray-50/50 flex flex-col shrink-0">
                <div className="px-2 py-1.5 border-b border-gray-200 bg-gray-100/60">
                    <div className="text-[12px] font-black text-gray-700">近期开奖</div>
                    <div className="text-[9px] font-bold text-gray-400 mt-0.5">共 {history.length} 期</div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    <div className="divide-y divide-gray-200/80">
                        {history.slice(0, 10).map((row, idx) => {
                            const rowFront = (row.numbers || []).map(Number);
                            const rowBack = (row.bonusNumbers || []).map(Number);
                            return (
                                <div key={row.issue || idx} className={`px-2 py-1.5 ${idx === 0 ? 'bg-rose-50' : ''}`}>
                                    <div className="text-[10px] font-black text-gray-500 tabular-nums mb-1">{String(row.issue || '').replace('期', '')}</div>
                                    <div className="flex items-center gap-[3px] mb-[3px]">
                                        {rowFront.map((n, i) => (
                                            <div key={i} className={`w-[24px] h-[24px] rounded-full flex items-center justify-center text-[11px] font-black ${idx === 0 ? 'bg-rose-500 text-white' : 'bg-rose-100 text-rose-600'}`}>
                                                {String(n).padStart(2, '0')}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-[3px]">
                                        {rowBack.map((n, i) => (
                                            <div key={i} className={`w-[24px] h-[24px] rounded-full flex items-center justify-center text-[11px] font-black ${idx === 0 ? 'bg-blue-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                                                {String(n).padStart(2, '0')}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* ── Right: Trend Grid ── */}
            <div ref={wrapperRef} className="flex-1 min-w-0 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex bg-gray-50 border-b-2 border-gray-300 shrink-0 z-20">
                    <div className="w-[56px] border-r border-gray-200 bg-gray-100/50 flex items-center justify-center shrink-0 h-[44px]">
                        <div className="text-[12px] font-black text-gray-500">期号</div>
                    </div>
                    <div className="flex-1 flex flex-col min-w-0 h-[44px]">
                        <div className="h-[22px] flex border-b border-gray-200">
                            <div className="flex items-center justify-center text-[12px] font-black text-rose-500 tracking-wider bg-rose-50 border-r border-gray-200" style={{ width: `${35/47*100}%` }}>前区 01-35</div>
                            <div className="flex-1 flex items-center justify-center text-[12px] font-black text-blue-500 tracking-wider bg-blue-50">后区 01-12</div>
                        </div>
                        <div className="h-[22px] flex overflow-hidden">
                            <div className="grid grid-cols-[repeat(35,minmax(0,1fr))] border-r border-gray-100" style={{ width: `${35/47*100}%`, flexShrink: 0 }}>
                                {frontNumbers.map(n => <div key={n} className="text-[11px] font-bold text-gray-400 flex items-center justify-center tabular-nums">{String(n).padStart(2, '0')}</div>)}
                            </div>
                            <div className="flex-1 grid grid-cols-[repeat(12,minmax(0,1fr))]">
                                {backNumbers.map(n => <div key={n} className="text-[11px] font-bold text-gray-400 flex items-center justify-center tabular-nums">{String(n).padStart(2, '0')}</div>)}
                            </div>
                        </div>
                    </div>
                </div>
                {/* Body — 纯 Canvas，滚动 = 原生，零空白 */}
                <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
                    <canvas ref={canvasRef} style={{ display: 'block' }} />
                </div>
                {/* Footer */}
                <div className="bg-gray-50 border-t border-gray-200 px-4 py-1.5 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /><span className="text-[10px] font-bold text-gray-500">前区走势</span></div>
                        <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /><span className="text-[10px] font-bold text-gray-500">后区走势</span></div>
                    </div>
                    <div className="text-[9px] font-bold text-gray-400">福建体彩中心 · 官方数据</div>
                </div>
            </div>
        </div>
    );
};
const ZoomedTrendOverlay = ({ isOpen, onClose, history, logoUrl, androidPadMode = false }) => {
    const [showChart, setShowChart] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setShowChart(false);
            document.body.style.overflow = 'hidden';
            // 先让浏览器 paint 框架（header + skeleton），下一帧再挂载 TrendChart
            const t = requestAnimationFrame(() => {
                requestAnimationFrame(() => setShowChart(true));
            });
            return () => { cancelAnimationFrame(t); document.body.style.overflow = ''; };
        } else {
            document.body.style.overflow = '';
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/40" onClick={onClose}>
            <div className="absolute inset-0 flex flex-col bg-white" onClick={e => e.stopPropagation()}>
                {/* Compact Header */}
                <div className="px-6 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Logo" className="w-8 h-8 object-contain" />
                        ) : (
                            <div className="p-1.5 rounded-lg bg-rose-500">
                                <TrendingUp className="text-white" size={18} />
                            </div>
                        )}
                        <div>
                            <h2 className="text-lg font-black text-gray-900 tracking-tight">超级大乐透走势图</h2>
                        </div>
                        <div className="ml-4 px-3 py-1 rounded-full bg-rose-50 text-rose-500 text-[12px] font-bold">
                            {history.length} 期数据
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full bg-white border border-gray-200 hover:bg-gray-100 flex items-center justify-center shadow-sm">
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>

                {/* Content — 分帧挂载，先 skeleton 后 chart */}
                <div className="flex-1 min-h-0 flex flex-col bg-white">
                    {showChart ? (
                        <TrendChart history={history} androidPadMode={androidPadMode} />
                    ) : (
                        <TrendSkeleton />
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── WELFARE SECTION (National & Fujian) ── */
const WelfareSection = ({ national = [], fujian = [] }) => {
    const renderModule = (data, mainTitle, subTitle, color, variant = 'national') => {
        if (!data || data.length === 0) return null;
        const dateItem = data.find(item => item.isDate);
        const totalItem = data.find(item => !item.isDate && item.id.includes('total'));
        const yearItem = data.find(item => !item.isDate && item.id.includes('year'));

        const moduleDecorStyle = {
            backgroundImage: `radial-gradient(circle at 86% 20%, rgba(0,122,255,0.18), rgba(0,122,255,0) 58%), url(${TcwLogo})`,
            backgroundRepeat: 'no-repeat, no-repeat',
            backgroundSize: '100% 100%, 88px auto',
            backgroundPosition: 'center, right 10px top 38px'
        };

        return (
            <div className="flex-1 min-w-0 px-3.5 py-2.5 relative">
                <div className="h-full rounded-2xl border border-gray-100 bg-gradient-to-br from-white via-white to-slate-50/60 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_4px_16px_rgba(15,23,42,0.06)] flex flex-col relative overflow-hidden">
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 opacity-[0.2]" style={moduleDecorStyle} />
                        <div className="absolute -top-8 -right-7 w-20 h-20 rounded-full blur-2xl opacity-20" style={{ background: color }} />
                        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white/95 to-white/10" />
                        <div
                            className="absolute top-2 right-2 px-2 py-[2px] rounded-full text-[10px] font-black tracking-[0.16em] border bg-white/70 backdrop-blur-[2px]"
                            style={{ color, borderColor: `${color}40` }}
                        >
                            {'公益'}
                        </div>
                    </div>

                    <div className="relative z-10 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2 h-2 rounded-full shrink-0 shadow-sm" style={{ background: color }} />
                            <span className="text-[15px] font-black text-gray-800 truncate">{mainTitle}</span>
                        </div>
                        {dateItem && (
                            <div className="shrink-0 px-2.5 py-0.5 rounded-full bg-white/80 text-[11px] font-bold text-gray-500 border border-gray-200/70 shadow-sm">
                                {'截至'} {dateItem.value}
                            </div>
                        )}
                    </div>

                    <div className="relative z-10 mt-2.5 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    <div className="relative z-10 mt-2 flex items-center gap-1.5">
                        <HeartHandshake size={12} style={{ color }} className="opacity-80" />
                        <span className="text-[11px] font-bold text-gray-400 tracking-wider">{'累计筹集公益金'}</span>
                    </div>
                    <div className="relative z-10 mt-1 flex items-end gap-1.5">
                        <span className="text-[44px] font-black tabular-nums leading-[0.95] tracking-tight" style={{ color }}>
                            {totalItem?.value || '--'}
                        </span>
                        <span className="text-[14px] font-black opacity-65 pb-1" style={{ color }}>{'亿元'}</span>
                    </div>

                    <div className="relative z-10 mt-auto rounded-xl border border-white/80 bg-white/75 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] overflow-hidden">
                        <div className="absolute -top-6 -right-6 w-16 h-16 rounded-full opacity-10" style={{ background: color }} />
                        <div className="relative z-10 text-[11px] font-bold text-gray-400">{subTitle}{'已筹集'}</div>
                        <div className="relative z-10 mt-1 flex items-end gap-1.5">
                            <span className="text-[32px] font-black tabular-nums leading-none tracking-tight" style={{ color }}>
                                {yearItem?.value || '--'}
                            </span>
                            <span className="text-[12px] font-black opacity-70 pb-0.5" style={{ color }}>{'亿元'}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="h-full rounded-[24px] overflow-hidden flex bg-white shadow-xl border border-gray-100 relative">
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                 style={{ backgroundImage: 'radial-gradient(#000 0.5px, transparent 0.5px)', backgroundSize: '12px 12px' }} />

            <div className="w-10 flex-shrink-0 flex flex-col items-center justify-center gap-3 py-4 border-r border-gray-100 bg-gray-50/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-transparent pointer-events-none" />
                <HeartHandshake size={18} className="text-rose-500" />
                <div className="flex flex-col items-center">
                    <span className="font-black text-gray-800 text-[13px] [writing-mode:vertical-lr] tracking-[0.2em] opacity-80">{'公益金数据'}</span>
                </div>
            </div>

            <div className="flex-1 flex items-center divide-x divide-gray-100 relative z-10">
                {renderModule(national, '中国体育彩票', '2026年度', '#007AFF', 'national')}
                {renderModule(fujian, '福建体育彩票', '本年度', '#FF6A00', 'fujian')}
            </div>
        </div>
    );
};

/* ── FUJIAN WELFARE MINI CARD (for androidPadMode) ── */
const FujianWelfareMini = ({ data }) => {
    if (!data || data.length === 0) return null;
    const dateItem = data.find(item => item.isDate);
    const totalItem = data.find(item => !item.isDate && item.id?.includes('total'));
    const yearItem = data.find(item => !item.isDate && item.id?.includes('year'));

    return (
        <div className="rounded-2xl bg-gradient-to-r from-orange-50 to-white shadow-md border border-orange-100 px-3 py-2 shrink-0 overflow-hidden relative">
            <div className="absolute inset-0 pointer-events-none opacity-[0.15]"
                 style={{ backgroundImage: `url(${TcwLogo})`, backgroundRepeat: 'no-repeat', backgroundSize: '70px auto', backgroundPosition: 'right 8px center' }} />
            <div className="flex items-center gap-2 relative z-10">
                <HeartHandshake size={14} className="text-orange-500 shrink-0" />
                <span className="text-[12px] font-black text-gray-800">福建体育彩票公益金</span>
                {dateItem && (
                    <span className="text-[9px] text-orange-500/70 font-bold ml-auto">
                        截至 {dateItem.value}
                    </span>
                )}
            </div>
            <div className="flex items-baseline gap-3 mt-1.5 relative z-10">
                <div className="flex items-baseline gap-1">
                    <span className="text-[11px] font-bold text-gray-500">累计筹集</span>
                    <span className="text-[26px] font-black text-orange-500 leading-none tabular-nums tracking-tight">{totalItem?.value || '--'}</span>
                    <span className="text-[11px] font-black text-orange-500/80">亿元</span>
                </div>
                <div className="w-px h-5 bg-orange-200 self-center" />
                <div className="flex items-baseline gap-1">
                    <span className="text-[11px] font-bold text-gray-500">本年度</span>
                    <span className="text-[26px] font-black text-orange-500 leading-none tabular-nums tracking-tight">{yearItem?.value || '--'}</span>
                    <span className="text-[11px] font-black text-orange-500/80">亿元</span>
                </div>
            </div>
        </div>
    );
};

const Carousel = React.memo(({ items, className = '', hideMarquee = false, availableTags = [], androidPadMode = false, isLowPerf = false, zoomedMode = false }) => {
    // Infinite carousel: track uses index 0..N-1 for real slides, N is clone of slide 0.
    // When animation lands on index N (clone), instantly jump to 0 (no transition).
    const [trackIndex, setTrackIndex] = useState(0);
    const [noTransition, setNoTransition] = useState(false);
    const { announcements = [], announcementConfig, availableTags: heartbeatTags = [] } = useHeartbeat();
    const effectiveTags = Array.isArray(heartbeatTags) && heartbeatTags.length > 0 ? heartbeatTags : availableTags;

    const len = items?.length || 0;
    // realIndex = actual slide being shown (wraps around)
    const realIndex = trackIndex % len;

    useEffect(() => {
        if (len <= 1) return;
        if (document.visibilityState === 'hidden') return; // skip when hidden
        const current = items[realIndex];
        const ms = current?.duration || 8000;
        const t = setTimeout(() => {
            setNoTransition(false);
            setTrackIndex(prev => prev + 1);
        }, ms);
        const onVis = () => { if (document.visibilityState === 'hidden') clearTimeout(t); };
        document.addEventListener('visibilitychange', onVis);
        return () => { clearTimeout(t); document.removeEventListener('visibilitychange', onVis); };
    }, [len, trackIndex]);

    // After transition to clone completes, snap back to real slide instantly
    const handleTransitionEnd = () => {
        if (trackIndex >= len) {
            setNoTransition(true);
            setTrackIndex(trackIndex % len);
        }
    };

    if (!items || len === 0) return null;
    const s = items[realIndex];

    // Build extended list: real slides + clone of first at the end
    const extendedItems = len > 1 ? [...items, items[0]] : items;

    return (
        <div className={`relative overflow-hidden rounded-2xl ${className}`} style={{ boxShadow: s ? `0 8px 32px ${s.c1 || '#000'}40` : undefined }}>
            {/* Announcement Overlay */}
            {!hideMarquee && (
                <CentralMarquee
                    announcements={announcements}
                    config={announcementConfig}
                    availableTags={effectiveTags}
                    androidPadMode={androidPadMode}
                    isLowPerf={isLowPerf}
                />
            )}

            <div
                className="flex h-full"
                style={{
                    transform: `translateX(-${trackIndex * 100}%)`,
                    transition: noTransition ? 'none' : 'transform 700ms ease-in-out',
                }}
                onTransitionEnd={handleTransitionEnd}
            >
                {extendedItems.map((slide, i) => (
                    <div key={i < len ? slide.id : '__clone__'} className="relative w-full h-full flex-shrink-0 select-none">
                        <img
                            src={slide.url}
                            alt={slide.title}
                            className={`w-full h-full pointer-events-none ${zoomedMode ? 'object-contain' : 'object-cover'}`}
                            draggable="false"
                        />
                        <div className="absolute left-5 bottom-5 z-10">
                            <div className="text-[10px] font-black px-2.5 py-1 rounded-full mb-2 inline-block"
                                style={{ background: 'rgba(255,255,255,0.25)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', letterSpacing: 2 }}>
                                {slide.badge}
                            </div>
                            <h2 className="text-white font-black leading-tight" style={{ fontSize: 'clamp(15px,2.2vw,26px)', textShadow: '0 2px 10px rgba(0,0,0,0.3)' }}>{slide.title}</h2>
                            <p className="text-white/75 font-bold mt-1" style={{ fontSize: 'clamp(10px,1vw,13px)' }}>{slide.sub}</p>
                        </div>
                    </div>
                ))}
            </div>
            {len > 1 && (
                <div className="absolute bottom-3 right-4 flex gap-1.5 z-10">
                    {items.map((_, i) => (
                        <button key={i} onClick={() => { setNoTransition(false); setTrackIndex(i); }} style={{ width: i === realIndex ? 16 : 6, height: 6, borderRadius: 3, background: i === realIndex ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s', border: 'none', padding: 0 }} />
                    ))}
                </div>
            )}
        </div>
    );
});

Carousel.displayName = 'Carousel';

/* ── MINI DRAW CAROUSEL (Rotating Lottery Results) ── */
const DrawCarousel = ({ draws, title, sourceLabel, showProvinceBadge, isLowPerf = false }) => {
    const [index, setIndex] = useState(0);
    const today = new Date().getDay();

    useEffect(() => {
        if (!draws || draws.length <= 1) return;
        const intervalMs = isLowPerf ? 7500 : 5000;
        let id = null;
        const start = () => { id = setInterval(() => { setIndex(p => (p + 1) % draws.length); }, intervalMs); };
        const stop = () => { if (id) { clearInterval(id); id = null; } };
        const onVis = () => { document.visibilityState === 'visible' ? start() : stop(); };
        start();
        document.addEventListener('visibilitychange', onVis);
        return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
    }, [draws.length, isLowPerf]);

    if (!draws || draws.length === 0) return null;

    const draw = draws[index];
    const hasNumbers = draw.numbers && draw.numbers.length > 0;
    const isFujian = draw.province === '福建';

    // High-impact colors
    const bgGradient = isFujian
        ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
        : 'linear-gradient(135deg, #FF416C 0%, #FF2D55 100%)';

    // Pattern per lottery type
    const nameKey = draw.name || '';
    const pattern =
        nameKey.includes('大乐透')
            ? 'radial-gradient(circle at 18% 22%, rgba(255,255,255,0.28) 0 14%, transparent 15%), radial-gradient(circle at 70% 78%, rgba(255,255,255,0.22) 0 18%, transparent 19%)'
            : nameKey.includes('排列3')
                ? 'repeating-linear-gradient(135deg, rgba(255,255,255,0.18) 0 6px, transparent 6px 14px)'
                : nameKey.includes('排列5')
                    ? 'repeating-linear-gradient(90deg, rgba(255,255,255,0.16) 0 4px, transparent 4px 10px)'
                    : nameKey.includes('7星彩')
                        ? 'radial-gradient(circle at 80% 20%, rgba(255,255,255,0.25) 0 16%, transparent 17%), radial-gradient(circle at 20% 70%, rgba(255,255,255,0.18) 0 12%, transparent 13%)'
                        : 'repeating-linear-gradient(45deg, rgba(255,255,255,0.16) 0 8px, transparent 8px 16px)';

    const numColor = isFujian ? '#11998e' : '#FF416C';
    const bonusBg = '#FFD700';

    // Special handling for DLT 5+2 or similar rules
    const isDLT = draw.name?.includes('大乐透');

    const isToday = draw.days && draw.days.includes(today);

    const hasPool = draw.pool && draw.pool !== '--' && draw.pool !== '0' && draw.pool !== '0.00';
    const bonusNumbers = draw.bonusNumbers || [];
    const showBonus = bonusNumbers.length > 0;

    return (
        <div className={`rounded-2xl overflow-hidden flex flex-col h-full border border-gray-100 ${isLowPerf ? 'shadow-md' : 'shadow-[0_8px_24px_rgba(0,0,0,0.12)]'}`}>
            <div className="flex flex-col items-start gap-0.5 px-3 py-2 flex-shrink-0 border-b border-gray-50 bg-gray-50/30 text-left">
                <div className="flex items-center gap-1.5">
                    <Radio size={13} className={`text-[#FF2D55] ${isLowPerf ? '' : 'animate-pulse'}`} />
                    <span className="font-black text-gray-800 text-[13px] tracking-tight">{title}</span>
                </div>
                <div className="text-[10px] font-bold text-gray-400 opacity-70 uppercase">{sourceLabel}</div>
            </div>
            <div className="p-2 bg-gray-50/5 flex-1 flex flex-col">
                <div key={draw.id} className="rounded-xl p-2 relative overflow-hidden text-center flex-1 flex flex-col justify-center"
                    style={{ background: bgGradient, boxShadow: 'inset 0 0 24px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.1)' }}>

                    <div className="absolute inset-0" style={{ backgroundImage: pattern, mixBlendMode: 'screen', opacity: 0.8 }} />
                    {!isLowPerf && <SpeedLines opacity={0.12} />}

                    <div className="relative z-10 space-y-1.5">
                        {/* 名称 + 期号 */}
                        <div className="flex items-center justify-center gap-2">
                            <div className="flex items-baseline gap-2 min-w-0">
                                <span className="font-black text-[14px] text-white tracking-widest truncate max-w-[140px]" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>{draw.name}</span>
                                <span className="text-[11px] font-black text-white/70 tracking-tighter uppercase whitespace-nowrap">{formatIssue(draw.issue)}</span>
                            </div>
                            {isToday && (
                                <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white border border-white/40 whitespace-nowrap">
                                    <span className={`w-1 h-1 rounded-full bg-white ${isLowPerf ? '' : 'animate-ping'}`} />
                                    今日开奖
                                </span>
                            )}
                        </div>

                        {/* 号码一行 */}
                        <div className="flex items-center justify-center gap-2 min-h-[24px]">
                            {hasNumbers ? (
                                <div className="flex items-center gap-1.5 flex-nowrap justify-center">
                                    {draw.numbers.map((n, i) => {
                                        const ballBg = isDLT ? '#FF416C' : 'white';
                                        const ballText = isDLT ? 'white' : numColor;
                                        return (
                                            <div key={i} className="relative group flex-shrink-0">
                                                {!isLowPerf && <div className={`absolute inset-0 blur-md rounded-full transition-opacity opacity-25 ${isDLT ? 'bg-rose-400' : 'bg-white'}`} />}
                                                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black relative z-10"
                                                    style={{
                                                        background: ballBg,
                                                        color: ballText,
                                                        boxShadow: isLowPerf ? 'none' : '0 2px 6px rgba(0,0,0,0.2), inset 0 -1.5px 0 rgba(0,0,0,0.1)',
                                                        animation: isLowPerf ? 'none' : `popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${i * 0.05}s both`
                                                    }}>{n}</div>
                                            </div>
                                        );
                                    })}
                                    {showBonus && (
                                        <span className="mx-1 text-white/90 font-black text-[12px]">+</span>
                                    )}
                                    {showBonus && bonusNumbers.map((n, i) => (
                                        <div key={`b${i}`} className="relative group flex-shrink-0">
                                            {!isLowPerf && <div className={`absolute inset-0 opacity-30 blur-md rounded-full ${isDLT ? 'bg-blue-400' : 'bg-yellow-300'}`} />}
                                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black relative z-10"
                                                style={{
                                                    background: isDLT ? '#1E90FF' : bonusBg,
                                                    color: isDLT ? 'white' : '#856404',
                                                    boxShadow: isLowPerf ? 'none' : '0 2px 6px rgba(0,0,0,0.2), inset 0 -1.5px 0 rgba(0,0,0,0.1)',
                                                    animation: isLowPerf ? 'none' : `popIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${(draw.numbers.length + i) * 0.05}s both`
                                                }}>{n}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-white/70 text-[11px] font-bold italic tracking-wider whitespace-nowrap">{draw.time}</div>
                            )}
                        </div>

                        {/* 濂栨睜涓€琛?*/}
                        <div className="flex items-center justify-center border-t border-white/10 pt-1 min-h-[20px] whitespace-nowrap">
                            {hasPool ? (
                                <div className="text-white font-black text-[12px] tabular-nums flex items-baseline gap-1">
                                    <span className="text-[11px] text-white/80">奖池</span>
                                    <span className="text-white/80">楼</span>
                                    <span>{draw.pool}</span>
                                    <span className="text-white/80">元</span>
                                </div>
                            ) : (
                                <span className="text-[11px] text-white/85">{draw.time}</span>
                            )}
                        </div>
                    </div>
                </div>
                {draws.length > 1 && (
                    <div className="flex justify-center gap-1 mt-1">
                        {draws.map((_, i) => (
                            <div key={i} className={`h-1 rounded-full transition-all duration-300 ${i === index ? 'w-4 bg-gray-500' : 'w-1 bg-gray-200'}`} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const getDrawTheme = (name = '') => {
    const presets = [
        {
            match: (n) => n.includes('大乐透'),
            accent: '#FF3B30',
            accentSoft: 'rgba(255,59,48,0.12)',
            bg: 'linear-gradient(135deg, rgba(255,59,48,0.08), rgba(30,144,255,0.08))',
            pattern: 'radial-gradient(circle at 20% 30%, rgba(255,59,48,0.18) 0 20%, transparent 21%), radial-gradient(circle at 80% 70%, rgba(30,144,255,0.18) 0 20%, transparent 21%)',
            tag: '头奖',
            ballType: 'solid',
            bonus: '#1E90FF'
        },
        {
            match: (n) => n.includes('排列3'),
            accent: '#2563EB',
            accentSoft: 'rgba(37,99,235,0.12)',
            bg: 'linear-gradient(135deg, rgba(37,99,235,0.08), rgba(96,165,250,0.08))',
            pattern: 'repeating-linear-gradient(135deg, rgba(37,99,235,0.15) 0 6px, transparent 6px 14px)',
            tag: '日开',
            ballType: 'outline'
        },
        {
            match: (n) => n.includes('排列5'),
            accent: '#FF6A00',
            accentSoft: 'rgba(255,106,0,0.12)',
            bg: 'linear-gradient(135deg, rgba(255,106,0,0.08), rgba(255,200,80,0.08))',
            pattern: 'repeating-linear-gradient(90deg, rgba(255,106,0,0.12) 0 4px, transparent 4px 12px)',
            tag: '高频',
            ballType: 'outline'
        },
        {
            match: (n) => n.includes('7星彩'),
            accent: '#7C3AED',
            accentSoft: 'rgba(124,58,237,0.12)',
            bg: 'linear-gradient(135deg, rgba(124,58,237,0.10), rgba(59,130,246,0.08))',
            pattern: 'radial-gradient(circle at 25% 20%, rgba(124,58,237,0.2) 0 18%, transparent 19%), radial-gradient(circle at 75% 80%, rgba(59,130,246,0.18) 0 16%, transparent 17%)',
            tag: '星彩',
            ballType: 'solid'
        },
        {
            match: (n) => n.includes('36选7'),
            accent: '#22C55E',
            accentSoft: 'rgba(34,197,94,0.12)',
            bg: 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.08))',
            pattern: 'repeating-linear-gradient(45deg, rgba(34,197,94,0.14) 0 8px, transparent 8px 16px)',
            tag: '地方',
            ballType: 'outline',
            bonus: '#FACC15'
        },
        {
            match: (n) => n.includes('31选7'),
            accent: '#14B8A6',
            accentSoft: 'rgba(20,184,166,0.12)',
            bg: 'linear-gradient(135deg, rgba(20,184,166,0.08), rgba(56,189,248,0.08))',
            pattern: 'radial-gradient(circle at 20% 75%, rgba(20,184,166,0.2) 0 16%, transparent 17%)',
            tag: '热门',
            ballType: 'outline',
            bonus: '#FACC15'
        },
        {
            match: (n) => n.includes('22选5'),
            accent: '#F59E0B',
            accentSoft: 'rgba(245,158,11,0.12)',
            bg: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.08))',
            pattern: 'repeating-linear-gradient(135deg, rgba(245,158,11,0.14) 0 6px, transparent 6px 14px)',
            tag: '快开',
            ballType: 'outline'
        }
    ];

    const found = presets.find(p => p.match(name));
    return found || {
        accent: '#64748B',
        accentSoft: 'rgba(100,116,139,0.12)',
        bg: 'linear-gradient(135deg, rgba(148,163,184,0.08), rgba(203,213,225,0.08))',
        pattern: 'repeating-linear-gradient(45deg, rgba(148,163,184,0.12) 0 8px, transparent 8px 16px)',
        tag: '开奖',
        ballType: 'outline',
        bonus: '#FACC15'
    };
};

const getBallScheme = (name = '') => {
    if (name.includes('大乐透')) {
        return { main: '#E53935', bonus: '#66BB6A' };
    }
    if (name.includes('7星彩')) {
        return { main: '#D81B60', bonus: '#66BB6A' };
    }
    if (name.includes('排列3') || name.includes('排列5')) {
        return { main: '#7C3AED', bonus: '#7C3AED' };
    }
    if (name.includes('36选7')) {
        return { main: '#F59E0B', bonus: '#66BB6A' };
    }
    if (name.includes('22选5')) {
        return { main: '#F59E0B', bonus: '#F59E0B' };
    }
    if (name.includes('31选7')) {
        return { main: '#EF4444', bonus: '#2563EB' };
    }
    return { main: '#64748B', bonus: '#94A3B8' };
};

const normalizeIssue = (issue) => String(issue || '').replace(/\D/g, '');
const formatIssue = (issue) => {
    if (!issue) return '--';
    const s = String(issue).replace(/^第/, '').replace(/期$/, '');
    return `第${s}期`;
};
const formatHistoryDate = (dateStr) => {
    if (!dateStr) return '';
    const raw = String(dateStr).trim();
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${m}-${d}`;
    }
    const match = raw.match(/(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (match) {
        const m = String(match[2]).padStart(2, '0');
        const d = String(match[3]).padStart(2, '0');
        return `${m}-${d}`;
    }
    return raw.slice(0, 10);
};

const DEFAULT_DLT_LOGO_URL = 'https://fjsenresource.fjsen.com/jyresource/templateRes/202403/27/61829/61829/20210322-tc-lt_logo.png';
const getDltLogoUrl = (library) => {
    if (!Array.isArray(library)) return DEFAULT_DLT_LOGO_URL;
    const match = library.find((item) => {
        const name = String(item?.name || '');
        return item?.id === 'layout_logo_dlt'
            || name.includes('大乐透')
            || name.includes('超级大乐透')
            || name.includes('体彩大乐透');
    });
    return match?.url || DEFAULT_DLT_LOGO_URL;
};

const logoColorCache = new Map();
const colorToRgba = (color, alpha) => {
    if (!color) return `rgba(100,116,139,${alpha})`;
    const c = String(color).trim();
    if (c.startsWith('rgba(')) return c.replace(/rgba\(([^)]+)\)/, (_, nums) => {
        const parts = nums.split(',').map(s => s.trim());
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    });
    if (c.startsWith('rgb(')) return c.replace(/rgb\(([^)]+)\)/, (_, nums) => {
        const parts = nums.split(',').map(s => s.trim());
        return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    });
    if (c.startsWith('#')) {
        const hex = c.replace('#', '');
        const full = hex.length === 3
            ? hex.split('').map(ch => ch + ch).join('')
            : hex.padEnd(6, '0').slice(0, 6);
        const r = parseInt(full.slice(0, 2), 16);
        const g = parseInt(full.slice(2, 4), 16);
        const b = parseInt(full.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return c;
};

const getPaletteSourceUrl = (url) => {
    if (!url) return '';
    const str = String(url);
    if (/^https?:\/\//.test(str)) {
        return `/api/system/image-proxy?url=${encodeURIComponent(str)}`;
    }
    return str;
};

const extractLogoPalette = (url) => {
    const sourceUrl = getPaletteSourceUrl(url);
    if (!sourceUrl) return Promise.resolve(null);
    if (logoColorCache.has(sourceUrl)) return Promise.resolve(logoColorCache.get(sourceUrl));
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const size = 32;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, size, size);
                const data = ctx.getImageData(0, 0, size, size).data;
                let r = 0, g = 0, b = 0, count = 0;
                let best = { r: 0, g: 0, b: 0, sat: -1 };
                for (let i = 0; i < data.length; i += 4) {
                    const a = data[i + 3];
                    if (a < 20) continue;
                    const rr = data[i];
                    const gg = data[i + 1];
                    const bb = data[i + 2];
                    r += rr; g += gg; b += bb; count += 1;
                    const max = Math.max(rr, gg, bb);
                    const min = Math.min(rr, gg, bb);
                    const sat = max - min;
                    if (sat > best.sat) best = { r: rr, g: gg, b: bb, sat };
                }
                if (!count) {
                    logoColorCache.set(url, null);
                    return resolve(null);
                }
                const avg = { r: Math.round(r / count), g: Math.round(g / count), b: Math.round(b / count) };
                const primary = `rgb(${avg.r}, ${avg.g}, ${avg.b})`;
                const secondary = `rgb(${best.r}, ${best.g}, ${best.b})`;
                const palette = { primary, secondary };
                logoColorCache.set(sourceUrl, palette);
                resolve(palette);
            } catch {
                logoColorCache.set(sourceUrl, null);
                resolve(null);
            }
        };
        img.onerror = () => {
            logoColorCache.set(sourceUrl, null);
            resolve(null);
        };
        img.src = sourceUrl;
    });
};

const resolveDrawLogoUrl = (drawName, layoutLibrary, drawLogoMap, dltFallbackUrl) => {
    const name = String(drawName || '');
    if (!name) return '';
    const map = drawLogoMap && typeof drawLogoMap === 'object' && !Array.isArray(drawLogoMap) ? drawLogoMap : {};
    const direct = map[name];
    const matchedKey = direct ? name : Object.keys(map).find(key => name.includes(key));
    const rawValue = direct || (matchedKey ? map[matchedKey] : '');
    const resolveAssetUrl = (val) => {
        if (!val) return '';
        const str = String(val);
        if (/^https?:\/\//.test(str) || /^data:image\//.test(str) || str.startsWith('/')) return str;
        const asset = Array.isArray(layoutLibrary)
            ? layoutLibrary.find(item => item?.id === str || item?.name === str)
            : null;
        return asset?.url || '';
    };
    const mappedUrl = resolveAssetUrl(rawValue);
    if (mappedUrl) return mappedUrl;
    if (name.includes('大乐透')) return dltFallbackUrl || DEFAULT_DLT_LOGO_URL;
    return '';
};

const getMainBallSize = (count) => {
    if (count <= 3) return 36;
    if (count <= 5) return 34;
    if (count <= 6) return 32;
    if (count <= 7) return 28;
    if (count <= 8) return 24;
    if (count <= 9) return 22;
    return 20;
};

const DrawGridItem = React.memo(({ draw, history = [], historyCount = 6, historyHoldMs = 3000, scrollResetKey = 0, historyTick = 0, historyMoveMs = 500, dltLogoUrl = '', drawLogoMap = {}, layoutLibrary = [], drawLogoOpacity = 0.12, androidPadMode = false, isLowPerf = false, onTrendZoom }) => {
    if (!draw) return null;
    const isDLT = draw.name?.includes('大乐透');
    const isQXC = draw.name?.includes('7星彩');
    let displayNumbers = draw.numbers || [];
    let displayBonus = draw.bonusNumbers || [];
    if (isDLT && displayBonus.length === 0 && displayNumbers.length > 5) {
        displayBonus = displayNumbers.slice(5);
        displayNumbers = displayNumbers.slice(0, 5);
    }
    if (isQXC && displayBonus.length === 0 && displayNumbers.length > 6) {
        displayBonus = displayNumbers.slice(6);
        displayNumbers = displayNumbers.slice(0, 6);
    }
    const hasNumbers = displayNumbers.length > 0;
    const showBonus = displayBonus.length > 0;
    const hasPool = draw.pool !== undefined && draw.pool !== null && draw.pool !== '--' && draw.pool !== '';
    const theme = getDrawTheme(draw.name);
    const ballScheme = getBallScheme(draw.name || '');

    const getMiniBallSize = (count) => {
        if (count <= 5) return 20;
        if (count <= 7) return 18;
        if (count <= 8) return 16;
        return 14;
    };

    const renderBall = (n, key, isBonus = false, size = 28) => {
        const color = isBonus ? ballScheme.bonus : ballScheme.main;
        const bg = color;
        const text = '#fff';
        const border = 'transparent';
        const fontSize = Math.max(9, Math.min(16, size * 0.45));

        return (
            <span
                key={key}
                className="rounded-full font-black flex items-center justify-center shrink min-w-0"
                style={{
                    width: size,
                    maxWidth: size,
                    aspectRatio: '1 / 1',
                    fontSize: `${fontSize}px`,
                    lineHeight: 1,
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    background: bg,
                    color: text,
                    border: `1px solid ${border}`,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.18)',
                    transition: 'all 0.3s ease'
                }}
            >
                <span style={{ display: 'block', transform: androidPadMode ? 'translateY(0.5px)' : 'none' }}>{n}</span>
            </span>
        );
    };

    const renderMiniBall = (n, key, isBonus = false, size = 12) => {
        const color = isBonus ? ballScheme.bonus : ballScheme.main;
        const fontSize = Math.max(7, Math.min(10, size * 0.7));
        return (
            <span
                key={key}
                className="rounded-full font-black flex items-center justify-center shrink min-w-0"
                style={{
                    width: size,
                    maxWidth: size,
                    aspectRatio: '1 / 1',
                    fontSize: `${fontSize}px`,
                    lineHeight: 1,
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    background: color,
                    color: '#fff',
                    border: '1px solid transparent',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)'
                }}
            >
                <span style={{ display: 'block', transform: androidPadMode ? 'translateY(0.5px)' : 'none' }}>{n}</span>
            </span>
        );
    };

    // 往期专用球：与最新开奖球样式完全一致
    const renderHistoryBall = (n, key, isBonus = false) => {
        const size = mainBallSize;
        const color = isBonus ? ballScheme.bonus : ballScheme.main;
        const fontSize = Math.max(9, Math.min(16, size * 0.45));
        return (
            <span
                key={key}
                className="rounded-full font-black flex items-center justify-center shrink min-w-0"
                style={{
                    width: size,
                    maxWidth: size,
                    aspectRatio: '1 / 1',
                    fontSize: `${fontSize}px`,
                    lineHeight: 1,
                    textAlign: 'center',
                    fontVariantNumeric: 'tabular-nums',
                    background: color,
                    color: '#fff',
                    border: '1px solid transparent',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.18)',
                    transition: 'all 0.3s ease'
                }}
            >
                <span style={{ display: 'block', transform: androidPadMode ? 'translateY(0.5px)' : 'none' }}>{n}</span>
            </span>
        );
    };

    const latestIssueKey = normalizeIssue(draw.issue);
    const cleanedHistory = Array.isArray(history)
        ? history.filter(item => normalizeIssue(item.issue) && normalizeIssue(item.issue) !== latestIssueKey)
        : [];
    const latestHistoryMatch = Array.isArray(history)
        ? history.find(item => normalizeIssue(item.issue) === latestIssueKey)
        : null;
    const rawLatestDate = draw.drawDate || draw.date || draw.openTime || draw.drawTime || latestHistoryMatch?.date || '';
    const latestDateText = formatHistoryDate(rawLatestDate);
    const historyLimit = Math.max(1, Math.min(30, Number(historyCount) || 6));
    const historyItems = cleanedHistory.length > 0 ? cleanedHistory.slice(0, historyLimit) : [];
    const moveMs = historyMoveMs;

    // 父组件统一 tick 驱动索引，所有卡片绝对同步
    const currentHistIdx = historyItems.length > 0 ? (historyTick % historyItems.length) : 0;
    const currentHistItem = historyItems[currentHistIdx];

    // 两层动画：当前向上滑出 + 下一项从下方滑入
    // 注入呼吸动画 keyframes（强制更新）
    useEffect(() => {
        let s = document.getElementById('cjdl-kf');
        if (s) { s.remove(); }
        s = document.createElement('style');
        s.id = 'cjdl-kf';
        s.textContent = '@keyframes poolBreathe{0%,100%{transform:scale(1);color:#78350f;text-shadow:0 1px 0 rgba(251,191,36,.2)}50%{transform:scale(1.06);color:#a16207;text-shadow:0 0 6px rgba(253,224,71,.6),0 0 14px rgba(251,191,36,.35),0 0 28px rgba(245,158,11,.15),0 1px 2px rgba(253,224,71,.4)}}@keyframes histSlideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes borderFlow{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}';
        document.head.appendChild(s);
    }, []);

    const prevItemRef = useRef(null);
    const outgoingRef = useRef(null);
    const incomingRef = useRef(null);
    const animRef = useRef(null);

    useLayoutEffect(() => {
        const prevItem = prevItemRef.current;
        prevItemRef.current = currentHistItem;

        // 首次渲染或只有一条时不需要动画
        if (!prevItem || prevItem === currentHistItem || !outgoingRef.current || !incomingRef.current) return;

        // 取消上一轮动画
        if (animRef.current) {
            animRef.current.forEach(a => a.cancel());
            animRef.current = null;
        }

        // 设置起始位置
        outgoingRef.current.style.transform = 'translateY(0)';
        incomingRef.current.style.transform = 'translateY(100%)';
        outgoingRef.current.offsetHeight; // 强制 reflow

        // 当前项向上滑出，新项从下方滑入
        const outAnim = outgoingRef.current.animate(
            [{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }],
            { duration: moveMs, easing: 'ease-in-out', fill: 'forwards' }
        );
        const inAnim = incomingRef.current.animate(
            [{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }],
            { duration: moveMs, easing: 'ease-in-out', fill: 'forwards' }
        );
        animRef.current = [outAnim, inAnim];
    }, [historyTick, currentHistItem, moveMs]);

    const logoUrl = resolveDrawLogoUrl(draw.name, layoutLibrary, drawLogoMap, dltLogoUrl);
    const showDrawLogo = Boolean(logoUrl);
    const [logoPalette, setLogoPalette] = useState(null);

    useEffect(() => {
        let active = true;
        if (!showDrawLogo) {
            setLogoPalette(null);
            return () => { active = false; };
        }
        extractLogoPalette(logoUrl).then((palette) => {
            if (active) setLogoPalette(palette);
        });
        return () => { active = false; };
    }, [logoUrl, showDrawLogo]);

    const bgPrimary = logoPalette?.primary || theme.accent;
    const bgSecondary = logoPalette?.secondary || theme.bonus || theme.accent;
    const baseOpacity = typeof drawLogoOpacity === 'number' ? drawLogoOpacity : 0.18;
    const patternPrimaryOpacity = Math.min(0.85, baseOpacity + 0.35);
    const patternSecondaryOpacity = Math.min(0.8, baseOpacity + 0.3);
    const bgGradient = `linear-gradient(135deg, ${colorToRgba(bgPrimary, baseOpacity)}, ${colorToRgba(bgSecondary, baseOpacity)})`;
    const bgPattern = `radial-gradient(circle at 20% 30%, ${colorToRgba(bgPrimary, patternPrimaryOpacity)} 0 20%, transparent 21%), radial-gradient(circle at 80% 70%, ${colorToRgba(bgSecondary, patternSecondaryOpacity)} 0 20%, transparent 21%)`;
    const watermarkOpacity = Math.min(0.6, Math.max(0.08, baseOpacity * 0.6));
    const mainBallCount = displayNumbers.length + displayBonus.length;
    const mainBallSize = getMainBallSize(mainBallCount);
    const mainBallGap = mainBallCount >= 8 ? (androidPadMode ? 1 : 2) : (androidPadMode ? 2 : 4);
    const mainPlusFont = androidPadMode ? 12 : 14;
    const mainPlusMargin = mainBallCount >= 8 ? (androidPadMode ? 1 : 2) : (androidPadMode ? 2 : 4);

    // 往期：期号行固定高度
    const historyPeriodHeight = 14;
    const historyBallGap = mainBallCount >= 8 ? 1 : 2;
    const clickCountRef = useRef(0);
    const clickTimerRef = useRef(null);

    return (
        <div
            className="relative rounded-xl overflow-hidden h-full"
            style={{ padding: 2 }}
        >
            {isLowPerf ? (
                <div className="absolute inset-0 rounded-xl" style={{ border: `2px solid ${theme.accent}55` }} />
            ) : (
                <div
                    className="absolute"
                    style={{
                        inset: '-50%',
                        background: `conic-gradient(from 0deg, transparent 0%, transparent 18%, ${theme.accent}88 22%, ${theme.accent} 25%, ${theme.accent}88 28%, transparent 32%, transparent 68%, ${theme.accent}88 72%, ${theme.accent} 75%, ${theme.accent}88 78%, transparent 82%, transparent 100%)`,
                        animation: 'borderFlow 4s linear infinite',
                        opacity: 0.8,
                    }}
                />
            )}
            <div
                className={`relative z-10 rounded-[10px] shadow-sm px-2 py-1 flex flex-col overflow-hidden h-full ${isDLT ? 'cursor-zoom-in' : ''}`}
                style={Object.assign(
                    { background: androidPadMode ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.88)' },
                    androidPadMode ? { boxShadow: 'inset 0 0 0 1px rgba(120,180,220,0.35)' } : { border: '1px solid rgba(229,231,235,0.6)' }
                )}
                onClick={(e) => {
                if (!isDLT) return;
                
                if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
                clickCountRef.current += 1;

                if (clickCountRef.current === 2) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    onTrendZoom?.(rect);
                    clickCountRef.current = 0;
                } else {
                    clickTimerRef.current = setTimeout(() => {
                        clickCountRef.current = 0;
                    }, 400);
                }
            }}
        >
            <div className="absolute inset-0" style={{ background: bgGradient, opacity: 0.9 }} />
            <div className="absolute inset-0" style={{ backgroundImage: bgPattern, opacity: 0.25 }} />
            {showDrawLogo && (
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        backgroundImage: `url(${logoUrl})`,
                        backgroundRepeat: 'no-repeat',
                        backgroundPosition: 'right 12px top 10px',
                        backgroundSize: '120px 120px',
                        opacity: watermarkOpacity
                    }}
                />
            )}
            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                        {showDrawLogo ? (
                            <img src={logoUrl} alt={draw.name || '开奖图标'} className="w-6 h-6 object-contain shrink-0" />
                        ) : (
                            <span className="w-2.5 h-2.5 rounded-full" style={{ background: theme.accent }} />
                        )}
                        <span className="text-[14px] font-black text-gray-900 truncate">{draw.name}</span>
                    </div>
                    <div className={`flex ${androidPadMode ? 'flex-col items-end' : 'items-center gap-1.5'} text-right leading-tight whitespace-nowrap shrink-0`}>
                        <span className="text-[12px] font-black text-gray-600">{formatIssue(draw.issue)}</span>
                        {latestDateText ? (
                            <span className="text-[10px] font-bold text-gray-500">{latestDateText}</span>
                        ) : null}
                    </div>
                </div>
                <div className="flex items-center justify-center w-full px-1 overflow-hidden" style={{ columnGap: mainBallGap, height: 36 }}>
                    {hasNumbers ? (
                        <>
                            {displayNumbers.map((n, i) => renderBall(n, i, false, mainBallSize))}
                            {showBonus && (
                                <span
                                    className="font-black text-gray-500 flex-shrink-0"
                                    style={{ fontSize: mainPlusFont, margin: `0 ${mainPlusMargin}px` }}
                                >
                                    +
                                </span>
                            )}
                            {showBonus && displayBonus.map((n, i) => renderBall(n, `b-${i}`, true, mainBallSize))}
                        </>
                    ) : (
                        <span className="text-[11px] font-bold text-gray-600 whitespace-nowrap">--</span>
                    )}
                </div>
                <div className="text-[11px] font-black text-center whitespace-nowrap" style={{
                    height: 16,
                    lineHeight: '16px',
                    color: hasPool ? '#78350f' : '#111827',
                    animation: (hasPool && !isLowPerf) ? 'poolBreathe 3s ease-in-out infinite' : 'none'
                }}>
                    {hasPool ? `奖池 ${draw.pool}元` : ''}
                </div>
                <div className="mt-0.5 pt-0.5 border-t border-white/70 flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="relative overflow-hidden w-full flex-1 min-h-0">
                        {historyItems.length > 0 && currentHistItem ? (
                            <>
                                {/* 上层：旧内容向上滑出 */}
                                <div ref={outgoingRef} className="absolute inset-0 flex flex-col items-center justify-center px-1">
                                    {(() => {
                                        const item = prevItemRef.current || currentHistItem;
                                        return item ? (<>
                                            <div className="flex items-center justify-center gap-2 whitespace-nowrap w-full shrink-0" style={{ height: historyPeriodHeight, lineHeight: `${historyPeriodHeight}px` }}>
                                                <span className="text-[10px] font-bold text-gray-700">{formatIssue(item.issue)}</span>
                                                <span className="text-[9px] font-bold text-gray-400">{formatHistoryDate(item.date)}</span>
                                            </div>
                                            <div className="flex items-center justify-center overflow-hidden w-full shrink-0" style={{ columnGap: historyBallGap }}>
                                                {(item.numbers || []).map((n, i) => renderHistoryBall(n, `o-${i}`, false))}
                                                {item.bonusNumbers && item.bonusNumbers.length > 0 && (
                                                    <>
                                                        <span className="font-black text-gray-400 shrink-0" style={{ fontSize: 8, margin: '0 1px' }}>+</span>
                                                        {item.bonusNumbers.map((n, i) => renderHistoryBall(n, `ob-${i}`, true))}
                                                    </>
                                                )}
                                            </div>
                                        </>) : null;
                                    })()}
                                </div>
                                {/* 下层：新内容从下方滑入 */}
                                <div ref={incomingRef} className="absolute inset-0 flex flex-col items-center justify-center px-1">
                                    <div className="flex items-center justify-center gap-2 whitespace-nowrap w-full shrink-0" style={{ height: historyPeriodHeight, lineHeight: `${historyPeriodHeight}px` }}>
                                        <span className="text-[10px] font-bold text-gray-700">{formatIssue(currentHistItem.issue)}</span>
                                        <span className="text-[9px] font-bold text-gray-400">{formatHistoryDate(currentHistItem.date)}</span>
                                    </div>
                                    <div className="flex items-center justify-center overflow-hidden w-full shrink-0" style={{ columnGap: historyBallGap }}>
                                        {(currentHistItem.numbers || []).map((n, i) => renderHistoryBall(n, `h-${i}`, false))}
                                        {currentHistItem.bonusNumbers && currentHistItem.bonusNumbers.length > 0 && (
                                            <>
                                                <span className="font-black text-gray-400 shrink-0" style={{ fontSize: 8, margin: '0 1px' }}>+</span>
                                                {currentHistItem.bonusNumbers.map((n, i) => renderHistoryBall(n, `hb-${i}`, true))}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-[10px] text-gray-400 font-bold">暂无往期数据</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
        </div>
    );
});
DrawGridItem.displayName = 'DrawGridItem';

const DrawGrid = React.memo(({ draws, title, historyData, historyCount, historyHoldMs, showHeader = true, scrollResetKey = 0, dltLogoUrl = '', drawLogoMap = {}, layoutLibrary = [], drawLogoOpacity = 0.12, androidPadMode = false, isLowPerf = false, onTrendZoom }) => {
    // 统一轮播 tick：hooks 必须在条件返回之前
    const [historyTick, setHistoryTick] = useState(0);
    const holdMs = Math.max(1000, Number(historyHoldMs) || 3000);
    const effectiveHoldMs = isLowPerf ? Math.round(holdMs * 1.5) : holdMs;
    const moveMs = 500;
    useEffect(() => {
        const step = effectiveHoldMs + moveMs;
        let id = null;
        const start = () => { id = setInterval(() => { setHistoryTick(t => t + 1); }, step); };
        const stop = () => { if (id) { clearInterval(id); id = null; } };
        const onVis = () => { document.visibilityState === 'visible' ? start() : stop(); };
        start();
        document.addEventListener('visibilitychange', onVis);
        return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
    }, [effectiveHoldMs]);

    if (!draws || draws.length === 0) return null;

    const historyMap = {};
    if (historyData && Array.isArray(historyData.games)) {
        historyData.games.forEach(game => {
            if (game?.key) historyMap[game.key] = game.history || [];
            if (game?.name) historyMap[game.name] = game.history || [];
        });
    }
    const drawOrderRules = [
        { key: '超级大乐透', match: (n) => n.includes('大乐透') },
        { key: '7星彩', match: (n) => n.includes('7星彩') },
        { key: '排列3', match: (n) => n.includes('排列3') },
        { key: '排列5', match: (n) => n.includes('排列5') },
        { key: '36选7', match: (n) => n.includes('36选7') },
        { key: '22选5', match: (n) => n.includes('22选5') },
        { key: '31选7', match: (n) => n.includes('31选7') && !n.includes('附加') },
        { key: '31选7附加', match: (n) => n.includes('31选7附加') || (n.includes('31选7') && n.includes('附加')) }
    ];
    const getDrawOrderIndex = (name) => {
        const safeName = String(name || '');
        const idx = drawOrderRules.findIndex(rule => rule.match(safeName));
        return idx === -1 ? 999 : idx;
    };
    const list = draws
        .slice(0, 8)
        .map((item, idx) => ({ item, idx }))
        .sort((a, b) => {
            const ai = getDrawOrderIndex(a.item?.name);
            const bi = getDrawOrderIndex(b.item?.name);
            if (ai !== bi) return ai - bi;
            return a.idx - b.idx;
        })
        .map(({ item }) => item);
    const fillerCount = Math.max(0, 8 - list.length);

    return (
        <div
            className="h-full min-h-0 rounded-[24px] overflow-hidden flex flex-col bg-white/70 border border-gray-100/80 shadow-md"
            style={androidPadMode ? {
                border: '1px solid transparent',
                boxShadow: 'inset 0 0 0 1px rgba(120,180,220,0.45)',
                background: 'rgba(255,255,255,0.82)'
            } : undefined}
        >
            {showHeader && (
                <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-100/70 bg-white/70">
                    <Radio size={13} className="text-[#FF2D55]" />
                    <span className="font-black text-gray-800 text-[13px] tracking-tight">{title}</span>
                </div>
            )}
            <div className="flex-1 min-h-0 p-2 grid grid-cols-2 grid-rows-4 gap-2">
                {list.map(draw => (
                    <DrawGridItem
                        key={draw.id || draw.name}
                        draw={draw}
                        history={historyMap[draw.id] || historyMap[draw.name] || []}
                        historyCount={historyCount}
                        historyHoldMs={historyHoldMs}
                        scrollResetKey={scrollResetKey}
                        historyTick={historyTick}
                        historyMoveMs={moveMs}
                        dltLogoUrl={dltLogoUrl}
                        drawLogoMap={drawLogoMap}
                        layoutLibrary={layoutLibrary}
                        drawLogoOpacity={drawLogoOpacity}
                        androidPadMode={androidPadMode}
                        isLowPerf={isLowPerf}
                        onTrendZoom={onTrendZoom}
                    />
                ))}
                {Array.from({ length: fillerCount }).map((_, i) => (
                    <div key={`empty-${i}`} className="rounded-xl border border-dashed border-gray-200 bg-white/50" />
                ))}
            </div>
        </div>
    );
});
DrawGrid.displayName = 'DrawGrid';

const formatClockTime = (now, showSeconds = true) => {
    const pad2 = (v) => String(v).padStart(2, '0');
    return showSeconds
        ? `${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`
        : `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
};

const getDateLunarPayload = (now) => {
    const dateStr = (() => {
        const ymd = new Intl.DateTimeFormat('zh-CN', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }).format(now);
        const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'long' }).format(now);
        return weekday ? `${ymd} ${weekday}` : ymd;
    })();
    const lunarStr = (() => {
        try {
            const parts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }).formatToParts(now);
            const yearName = parts.find(p => p.type === 'yearName')?.value || '';
            const monthRaw = parts.find(p => p.type === 'month')?.value || '';
            const dayRaw = parts.find(p => p.type === 'day')?.value || '';

            const branchToZodiac = (sexagenaryYear) => {
                const branch = String(sexagenaryYear || '').slice(-1);
                const map = {
                    子: '鼠', 丑: '牛', 寅: '虎', 卯: '兔',
                    辰: '龙', 巳: '蛇', 午: '马', 未: '羊',
                    申: '猴', 酉: '鸡', 戌: '狗', 亥: '猪'
                };
                return map[branch] || '';
            };

            const normalizeMonth = (raw) => {
                if (!raw) return '';
                if (raw === '十一月') return '冬月';
                if (raw === '十二月') return '腊月';
                return raw;
            };

            const toCnNum = (n) => {
                const map = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
                return map[n] || '';
            };

            const toLunarDay = (n) => {
                if (!n || n < 1 || n > 30) return '';
                if (n === 10) return '初十';
                if (n < 10) return `初${toCnNum(n)}`;
                if (n < 20) return `十${toCnNum(n - 10)}`;
                if (n === 20) return '二十';
                if (n < 30) return `廿${toCnNum(n - 20)}`;
                return '三十';
            };

            const monthText = normalizeMonth(monthRaw);
            const dayNum = Number.parseInt(dayRaw, 10);
            const dayText = Number.isNaN(dayNum) ? dayRaw : toLunarDay(dayNum);
            const zodiac = branchToZodiac(yearName);
            const yearText = yearName ? `${yearName}${zodiac}年` : '';
            return [yearText, monthText, dayText].filter(Boolean).join('');
        } catch {
            return '';
        }
    })();

    return { dateStr, lunarStr };
};

const HeaderClock = React.memo(({ variant = 'landscape', showSeconds = true, isLowPerf = false }) => {
    // React state only for date (changes once per day) — no per-second re-renders
    const [dayDate, setDayDate] = useState(() => new Date());
    const timeRef = useRef(null); // DOM ref for time text — updated directly
    const lastDayRef = useRef(dayDate.getDate());

    useEffect(() => {
        const tickMs = isLowPerf ? 3000 : 1000;
        let tickId = null;

        const tick = () => {
            const d = new Date();
            // Update time text directly in DOM — zero React overhead
            if (timeRef.current) timeRef.current.textContent = formatClockTime(d, showSeconds);
            // Only trigger React re-render when the date (day) changes
            if (d.getDate() !== lastDayRef.current) {
                lastDayRef.current = d.getDate();
                setDayDate(d);
            }
        };

        const startTimer = () => { tick(); tickId = setInterval(tick, tickMs); };
        const stopTimer = () => { if (tickId) { clearInterval(tickId); tickId = null; } };

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                startTimer(); // sync + resume
            } else {
                stopTimer();
            }
        };

        const handleFocus = () => tick();

        startTimer();
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleFocus);

        return () => {
            stopTimer();
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('focus', handleFocus);
        };
    }, [showSeconds, isLowPerf]);

    const dayKey = `${dayDate.getFullYear()}-${dayDate.getMonth()}-${dayDate.getDate()}`;
    const { dateStr, lunarStr } = useMemo(() => getDateLunarPayload(dayDate), [dayKey]);
    const initialTime = useMemo(() => formatClockTime(dayDate, showSeconds), []);

    if (variant === 'portrait') {
        return (
            <div className="flex items-center gap-2">
                <div className="text-right leading-tight">
                    <div className="text-[10px] font-bold text-gray-500">{dateStr}</div>
                    <div className="text-[10px] font-black text-gray-600 tracking-[0.08em]">
                        {lunarStr ? `农历${lunarStr}` : ''}
                    </div>
                </div>
                <div ref={timeRef} className="text-lg font-black text-gray-800 font-mono leading-none">{initialTime}</div>
            </div>
        );
    }

    return (
        <div className="flex items-stretch gap-3">
            <div className="text-right leading-tight">
                <div className="text-[15px] font-black text-gray-700 tracking-wider font-mono">{dateStr}</div>
                <div className="text-[14px] font-black text-gray-700 font-mono tracking-[0.08em]">
                    {lunarStr ? `农历${lunarStr}` : ''}
                </div>
            </div>
            <div className="flex items-center h-full">
                <div ref={timeRef} className="text-[34px] font-black text-gray-900 font-mono italic leading-none">{initialTime}</div>
            </div>
        </div>
    );
});
HeaderClock.displayName = 'HeaderClock';

const LandscapeLayout = React.memo(({ storeId, navigate, sources, gameLogos = {}, scrollResetKey = 0, dltLogoUrl = '', androidPadMode = false, topRowHeight = null, isLowPerf = false, onLogoClick, onNameClick, onCarouselClick, onTrendZoom, onOpenGameHub, qrLabel = '福建体彩服务号', qrEnabled = true }) => {
    const carouselRef = useRef(null);
    const winnerItems = sources?.winners || MOCK_WINNERS;
    const showWinnerMask = sources?.winnerEditing === true;
    const winnerHoldMs = Math.max(1000, Number(sources?.scrollHoldMs) || 3000);
    const effectiveWinnerHoldMs = isLowPerf ? Math.round(winnerHoldMs * 1.5) : winnerHoldMs;
    const winnerMoveMs = 500;
    const winnerRowHeight = 48;
    const winnerLoop = winnerItems.length > 1
        ? [...winnerItems, ...winnerItems, ...winnerItems]
        : winnerItems;
    const [winnerIdx, setWinnerIdx] = useState(0);
    const [winnerTransition, setWinnerTransition] = useState(true);

    useEffect(() => {
        const startIndex = winnerItems.length > 1 ? winnerItems.length : 0;
        setWinnerTransition(false);
        setWinnerIdx(startIndex);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setWinnerTransition(true));
        });
    }, [winnerItems.length]);

    useEffect(() => {
        const startIndex = winnerItems.length > 1 ? winnerItems.length : 0;
        setWinnerTransition(false);
        setWinnerIdx(startIndex);
        requestAnimationFrame(() => {
            requestAnimationFrame(() => setWinnerTransition(true));
        });
    }, [scrollResetKey]);

    useEffect(() => {
        if (winnerItems.length <= 1) return;
        const step = effectiveWinnerHoldMs + winnerMoveMs;
        const seed = (storeId || 'default').split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
        const initialDelay = seed % step;
        let intervalId = null;
        let timeoutId = null;

        const start = () => {
            timeoutId = setTimeout(() => {
                setWinnerIdx(prev => prev + 1);
                intervalId = setInterval(() => { setWinnerIdx(prev => prev + 1); }, step);
            }, initialDelay);
        };
        const stop = () => {
            if (timeoutId) { clearTimeout(timeoutId); timeoutId = null; }
            if (intervalId) { clearInterval(intervalId); intervalId = null; }
        };
        const onVis = () => { document.visibilityState === 'visible' ? start() : stop(); };
        start();
        document.addEventListener('visibilitychange', onVis);
        return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
    }, [winnerItems.length, effectiveWinnerHoldMs, storeId]);

    const handleWinnerTransitionEnd = (e) => {
        if (e.target !== e.currentTarget) return;
        if (e.propertyName !== 'transform') return;
        if (winnerItems.length > 1 && winnerIdx >= winnerItems.length * 2) {
            setWinnerTransition(false);
            setWinnerIdx(winnerIdx - winnerItems.length);
            requestAnimationFrame(() => {
                requestAnimationFrame(() => setWinnerTransition(true));
            });
        }
    };

    const welfareData = sources?.welfare || { national: [], fujian: [] };
    const nationalList = Array.isArray(welfareData.national) ? welfareData.national : [];
    const fujianList = Array.isArray(welfareData.fujian) ? welfareData.fujian : [];

    const storeInfoRaw = { ...MOCK_STORE, ...(sources?.store || {}) };
    const storeInfo = { ...storeInfoRaw, phone: storeInfoRaw.phone || storeInfoRaw.contact || '' };
    const qrUrl = storeInfo.qrUrl;
    const nowForSeed = new Date();
    const daySeed = nowForSeed.getDate() + nowForSeed.getMonth() * 31;

    const buildNums = (seed, idx) => {
        const a = ((seed + idx * 7) % 35) + 1;
        const b = ((seed * 3 + idx * 5) % 35) + 1;
        return [a, b].map(n => String(n).padStart(2, '0'));
    };

    const drawGridPlacementClass = androidPadMode ? 'col-span-4 row-start-1 row-span-2' : 'col-span-4 row-start-1';
    const drawGridPlacementStyle = (!androidPadMode && topRowHeight) ? { height: topRowHeight } : undefined;
    const gameButtonSize = androidPadMode ? 120 : 170;
    const gameIconSize = androidPadMode ? 82 : 112;
    const winnersCard = (
        <div className="h-full min-h-0 rounded-[24px] overflow-hidden flex bg-white shadow-md border border-gray-100">
            <div className="w-10 flex-shrink-0 flex flex-col items-center justify-center gap-3 py-4 border-r border-gray-100 bg-gray-50/50 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-400/10 to-transparent pointer-events-none" />
                <i className="fa-solid fa-trophy text-[14px] text-amber-500" />
                <div className="flex flex-col items-center">
                    <span className="font-black text-gray-800 text-[13px] [writing-mode:vertical-lr] tracking-[0.2em]">{androidPadMode ? '中奖喜报' : '本店喜报'}</span>
                </div>
            </div>
            <div className="relative flex-1 min-h-0 overflow-hidden px-3 py-3 bg-[#f8f6ff]/10">
                <div
                    className="flex flex-col gap-2"
                    style={{
                        transform: `translateY(-${winnerIdx * winnerRowHeight}px)`,
                        transition: winnerTransition ? `transform ${winnerMoveMs}ms ease-in-out` : 'none'
                    }}
                    onTransitionEnd={handleWinnerTransitionEnd}
                >
                    {winnerLoop.map((w, idx) => (
                        <div key={`${w.id}-${idx}`} className="h-[40px] px-2.5 rounded-xl border border-gray-100 bg-gray-50/40 flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0 shadow-sm" style={{ background: w.color }} />
                            <span className="text-[11px] font-bold text-gray-700 leading-snug line-clamp-2">{w.text}</span>
                        </div>
                    ))}
                </div>
                {showWinnerMask && <WinnerEditingOverlay isLowPerf={isLowPerf} />}
            </div>
        </div>
    );

    return (
        <div className="relative w-full h-full overflow-hidden" style={{ background: 'linear-gradient(140deg, #fff7ef 0%, #f1fffb 45%, #eff4ff 100%)' }}>
            {/* Background Decorations */}
            <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg, rgba(255,106,0,0.03) 0, rgba(255,106,0,0.03) 12px, transparent 12px, transparent 24px)' }} />
            {!isLowPerf && <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full blur-3xl opacity-60" style={{ background: '#FFE29A' }} />}
            {!isLowPerf && <div className="absolute -bottom-24 right-10 w-64 h-64 rounded-full blur-3xl opacity-50" style={{ background: '#7AF0FF' }} />}

            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                            onClick={onLogoClick}
                            style={{ boxShadow: '0 10px 20px rgba(255,106,0,0.2)' }}>
                            <img src={TcwLogo} alt="中国体育彩票" className="w-10 h-10 object-contain pointer-events-none" />
                        </div>
                        <div>
                            <div className="text-base font-black text-gray-800">体彩门店互动平台</div>
                            <div className="text-[10px] font-semibold text-[#FF6A00] tracking-[0.35em] uppercase">SPORTS LOTTERY</div>
                        </div>
                    </div>
                    <div className="flex-1 mx-6 min-w-0 flex items-center gap-4">
                        {!androidPadMode && (
                            <div className="flex items-center gap-2 shrink-0">
                                <div className="text-[11px] font-black text-gray-700 leading-[1.1] text-center">
                                    <div>门店</div>
                                    <div>客服</div>
                                </div>
                                <div className="-my-1 w-12 h-12 rounded-lg border border-gray-200 bg-white/75 overflow-hidden relative flex items-center justify-center shadow-sm ring-1 ring-white/70">
                                    <img src={CustomerServiceQR} alt="门店客服" className="w-full h-full object-contain" />
                                </div>
                            </div>
                        )}
                        <div className="flex-1 min-w-0 text-[14px] font-black text-gray-700 leading-tight overflow-hidden">
                            {androidPadMode ? (
                                <div className="grid grid-cols-[auto_1fr] grid-rows-2 gap-x-3 gap-y-0.5 min-w-0">
                                    <div className="row-start-1 row-span-2 col-start-1 whitespace-nowrap overflow-hidden text-ellipsis flex items-center justify-center text-center cursor-pointer active:opacity-60 transition-opacity"
                                        onClick={onNameClick}>
                                        <span className="text-[17px] font-black text-gray-900 select-none">{storeInfo.name}</span>
                                    </div>
                                    <div className="row-start-1 col-start-2 whitespace-nowrap overflow-hidden text-ellipsis">
                                        <span>门店地址：{storeInfo.address}</span>
                                    </div>
                                    <div className="row-start-2 col-start-2 whitespace-nowrap overflow-hidden text-ellipsis">
                                        <span>负责人：{storeInfo.manager}</span>
                                        <span className="mx-2 text-gray-300">|</span>
                                        <span>电话：{storeInfo.phone}</span>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center whitespace-nowrap overflow-hidden text-ellipsis cursor-pointer active:opacity-60 transition-opacity"
                                    onClick={onNameClick}>
                                    <span className="text-[15px] font-black text-gray-900 select-none">{storeInfo.name}</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span>门店地址：{storeInfo.address}</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span>负责人：{storeInfo.manager}</span>
                                    <span className="mx-2 text-gray-300">|</span>
                                    <span>电话：{storeInfo.phone}</span>
                                </div>
                            )}
                        </div>
                    </div>
                    <HeaderClock variant="landscape" showSeconds={!androidPadMode} isLowPerf={isLowPerf} />
                </div>

                {/* Main Layout */}
                <div className="flex-1 min-h-0 px-5 pb-3 grid grid-cols-12 grid-rows-[auto_minmax(0,1fr)] gap-4">
                    {/* Top Row: Carousel + Draws */}
                    <div className="col-span-8 row-start-1 min-h-0" style={topRowHeight ? { height: topRowHeight } : undefined}>
                        <div className={`w-full relative group cursor-pointer ${topRowHeight ? 'h-full' : 'aspect-video'}`}
                            ref={carouselRef}
                            onClick={(e) => onCarouselClick(e, carouselRef)}
                        >
                            <div className={`h-full w-full rounded-[28px] overflow-hidden ring-1 ring-white/50 ${isLowPerf ? 'shadow-md bg-white/80' : 'shadow-[0_20px_50px_rgba(0,0,0,0.12)] bg-white/40 transition-all group-hover:shadow-[0_25px_60px_rgba(0,0,0,0.18)]'}`}>
                                <Carousel
                                    items={sources.carousel || MOCK_CAROUSEL}
                                    className="h-full w-full"
                                    availableTags={sources.availableTags}
                                    androidPadMode={androidPadMode}
                                    isLowPerf={isLowPerf}
                                />
                            </div>
                        </div>
                    </div>
                    <div className={`${drawGridPlacementClass} h-full min-h-0 self-stretch`} style={drawGridPlacementStyle}>
                        <DrawGrid
                            draws={sources.fujianDraws || []}
                            title="开奖信息"
                            historyData={sources.drawHistory}
                            historyCount={sources.drawHistorySize}
                            historyHoldMs={sources.scrollHoldMs}
                            showHeader={false}
                            scrollResetKey={scrollResetKey}
                            dltLogoUrl={dltLogoUrl}
                            drawLogoMap={sources.drawLogoMap}
                            layoutLibrary={sources.layoutLibrary}
                            drawLogoOpacity={sources.drawLogoOpacity}
                            androidPadMode={androidPadMode}
                            isLowPerf={isLowPerf}
                            onTrendZoom={onTrendZoom}
                        />
                    </div>

                    {/* Bottom Row: Games + Welfare */}
                    <div className={`col-span-8 row-start-2 grid gap-4 min-h-0 h-full grid-cols-[auto_1fr]`}>
                        {/* 左列：androidPadMode 时上方显示福建公益金，下方显示体彩互动+服务号 */}
                        <div className={`flex ${androidPadMode ? 'flex-col gap-2' : ''} h-full w-fit`}>
                            {/* androidPadMode: 福建公益金迷你卡 */}
                            {androidPadMode && fujianList.length > 0 && (
                                <FujianWelfareMini data={fujianList} />
                            )}

                            <div className={`flex ${androidPadMode ? 'flex-1 min-h-0 gap-2' : 'gap-3 h-full'}`}>
                                {/* 体彩互动 - 液态玻璃卡片风格 */}
                                <div className="flex-1 flex items-center justify-center py-2 relative">
                                    {!isLowPerf && (
                                        <>
                                            <div className="absolute top-0 right-4 w-24 h-24 bg-purple-400/30 rounded-full blur-[24px] animate-pulse pointer-events-none" />
                                            <div className="absolute bottom-0 left-4 w-24 h-24 bg-blue-400/30 rounded-full blur-[24px] animate-pulse pointer-events-none" style={{ animationDelay: '1s' }} />
                                        </>
                                    )}
                                    <div 
                                        onClick={() => onOpenGameHub?.()}
                                        className="relative cursor-pointer active:scale-95 transition-all group overflow-hidden flex flex-col p-3 pb-2.5 bg-white/20 backdrop-blur-2xl border border-white/50 shadow-[0_12px_40px_rgba(0,0,0,0.12),inset_0_1px_1px_rgba(255,255,255,0.6)]"
                                        style={{ 
                                            width: gameButtonSize * 1.1, 
                                            height: 'auto',
                                            borderRadius: '24px'
                                        }}
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-white/5 to-transparent pointer-events-none" />
                                        
                                        <div className="flex items-center justify-center w-full relative z-10">
                                            <div className="grid grid-cols-3 grid-rows-2 gap-2 w-full">
                                                {['lotto', 'scratch', 'lianliankan', 'sticker', 'xiaoxiaole', 'flappy'].map(key => (
                                                    <div key={key} className="aspect-square rounded-[14px] overflow-hidden bg-white/20 border border-white/30 shadow-[0_4px_12px_rgba(0,0,0,0.1)] relative z-10">
                                                        {gameLogos[key]?.url ? (
                                                            <img src={gameLogos[key].url} className="w-full h-full object-cover" alt="" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-indigo-400/30 to-purple-500/30" />
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="mt-2 text-[14px] font-bold text-slate-700 tracking-[0.1em] text-center select-none relative z-10 drop-shadow-[0_1px_0_rgba(255,255,255,0.9)] uppercase">乐小星互动区</div>
                                    </div>
                                </div>

                                {/* 福建体彩服务号容器（独立，与体彩互动同样风格） */}
                                {qrEnabled && (
                                    <div className={`rounded-[24px] overflow-hidden flex bg-white shadow-md border border-gray-100 ${androidPadMode ? '' : 'h-full'} w-fit`}>
                                        <div className="w-9 flex-shrink-0 flex flex-col items-center justify-center gap-2 py-2 border-r border-gray-100 bg-gray-50/50 relative overflow-hidden">
                                            <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none" />
                                            <QrCode size={18} className="text-orange-500" />
                                            <div className="flex flex-col items-center">
                                                <span className="font-black text-gray-800 text-[12px] [writing-mode:vertical-lr] tracking-[0.15em]">{qrLabel}</span>
                                            </div>
                                        </div>
                                        <div className={`flex items-center justify-center ${androidPadMode ? 'px-2 py-0.5' : 'px-3 py-1.5'}`}>
                                            <img
                                                src="/api/fujian-lottery-qr"
                                                alt={qrLabel}
                                                className="object-contain rounded-lg"
                                                style={{ width: gameButtonSize, height: gameButtonSize }}
                                                draggable={false}
                                                onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {androidPadMode ? (
                            <div className="h-full min-h-0">
                                {winnersCard}
                            </div>
                        ) : (
                            <div className="flex-1 h-full min-h-0">
                                <WelfareSection national={nationalList} fujian={fujianList} />
                            </div>
                        )}
                    </div>

                    {!androidPadMode && (
                        <div className="col-span-4 row-start-2 h-full">
                            {winnersCard}
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="pb-3 text-center text-[9px] text-gray-400 font-bold tracking-[0.45em] opacity-60 uppercase flex-shrink-0">
                    理性购彩路 适度娱乐路 未成年人禁止购彩
                </div>
            </div>
        </div >
    );
});

/* =========================================
   PORTRAIT LAYOUT  (9:16)
   ┌────────────────────────┐
   │ HEADER                 │
   ├────────────────────────┤
   │ TICKER                 │
   ├────────────────────────┤
   │ CAROUSEL (big)         │
   ├────────────────────────┤
   │ 今日吉彩/幸运星座      │
   ├────────────────────────┤
   │ 靓号   │ 星座小号      │
   ├────────────────────────┤
   │ 主打推荐(full row)     │
   ├────────────────────────┤
   │ 喜报   │ 资讯          │
   ├────────────────────────┤
   │ 门店信息 mini          │
   ├────────────────────────┤
   │ 游戏 (compact)         │
   └────────────────────────┘
   ========================================= */
const PortraitLayout = React.memo(({ storeId, navigate, sources, androidPadMode = false, isLowPerf = false, onLogoClick, onNameClick, onCarouselClick }) => {
    const carouselRef = useRef(null);
    const storeInfo = sources.store || MOCK_STORE;
    const todayDraws = sources.draws || [];
    const welfareList = Array.isArray(sources.welfare) ? sources.welfare : [];
    const welfarePrimary = welfareList[0] || { value: '--', unit: '' };
    const showWinnerMask = sources?.winnerEditing === true;

    return (
        <div className="flex flex-col h-full overflow-hidden" style={{ background: 'linear-gradient(160deg, #fffcf9 0%, #f0fffb 50%, #f6f0ff 100%)' }}>
            {/* Header */}
            <div className={`flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-100 ${isLowPerf ? 'bg-white' : 'bg-white/80 backdrop-blur-xl'}`}>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 flex items-center justify-center cursor-pointer active:scale-95 transition-transform"
                        onClick={onLogoClick}
                        style={{ boxShadow: '0 4px 10px rgba(255,106,0,0.15)' }}>
                        <img src={TcwLogo} alt="体彩" className="w-8 h-8 object-contain pointer-events-none" />
                    </div>
                    <div className="font-black text-gray-800 text-sm whitespace-nowrap overflow-hidden text-ellipsis max-w-[140px] cursor-pointer active:opacity-60 transition-opacity"
                        onClick={onNameClick}>
                        <span className="select-none">{storeInfo.name}</span>
                    </div>
                </div>
                <HeaderClock variant="portrait" showSeconds={!androidPadMode} isLowPerf={isLowPerf} />
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto !scrollbar-hide p-3 space-y-3">

                {/* Hero Carousel */}
                <div className="relative h-48 rounded-3xl overflow-hidden shadow-xl border border-white/50 cursor-pointer"
                    ref={carouselRef}
                    onClick={(e) => onCarouselClick(e, carouselRef)}
                >
                    <Carousel 
                        items={sources.carousel || MOCK_CAROUSEL} 
                        className="h-full w-full" 
                        availableTags={sources.availableTags}
                        androidPadMode={androidPadMode}
                        isLowPerf={isLowPerf}
                    />
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-1 rounded-[24px] bg-white p-3 shadow-md border border-gray-100 flex flex-col justify-center">
                        <div className="text-[9px] font-black text-rose-500 mb-1 flex items-center gap-1">
                            <HeartHandshake size={10} /> 公益筹集
                        </div>
                        <div className="text-lg font-black text-gray-800 leading-none">
                            {welfarePrimary.value}
                            <span className="text-[10px] ml-0.5 text-gray-400 font-bold">{welfarePrimary.unit}</span>
                        </div>
                    </div>
                    <div className="col-span-1 rounded-[24px] bg-white p-3 shadow-md border border-gray-100 flex flex-col justify-center">
                        <div className="text-[9px] font-black text-blue-500 mb-1 flex items-center gap-1">
                            <Trophy size={10} /> 今日开奖
                        </div>
                        <div className="text-xs font-bold text-gray-700 truncate">{sources.draws[0]?.name || '加载中...'}</div>
                        <div className="text-[8px] text-gray-400 mt-1 font-bold">{sources.draws[0]?.time?.split(' ')[1] || ''}</div>
                    </div>
                </div>

                {/* Draws List */}
                <div className="space-y-3">
                    <DrawCarousel draws={sources.fujianDraws} title="开奖信息" sourceLabel="" isLowPerf={isLowPerf} />
                </div>

                {/* Winners */}
                <div className="rounded-[28px] overflow-hidden bg-white shadow-xl border border-gray-100">
                    <div className="px-4 py-3 pb-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Radio size={14} className="text-emerald-500" />
                            <span className="font-black text-gray-800 text-sm">{androidPadMode ? '中奖喜报' : '本店喜报'}</span>
                        </div>
                    </div>
                    <div className="px-3 pb-3 space-y-2 relative">
                        <div className="bg-gray-50/50 rounded-2xl p-2.5">
                            {(sources.winners || MOCK_WINNERS).slice(0, 3).map(w => (
                                <div key={w.id} className="flex items-center gap-2 py-1.5 border-b border-gray-200/50 last:border-0">
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: w.color }} />
                                    <span className="text-[10px] font-bold text-gray-600 line-clamp-1">{w.text}</span>
                                </div>
                            ))}
                        </div>
                        {showWinnerMask && <WinnerEditingOverlay compact className="rounded-b-[28px] overflow-hidden" isLowPerf={isLowPerf} />}
                    </div>
                </div>

                {/* Quick Entrance Grid */}
                <div className="grid grid-cols-3 gap-2 pb-4">
                    <button onClick={() => navigate(`/s/${storeId}/lotto`)}
                        className="rounded-2xl p-4 bg-gradient-to-br from-[#FF416C] to-[#FF9500] text-white flex flex-col items-center gap-2 shadow-[0_8px_16px_rgba(255,65,108,0.3)] active:scale-95 transition-transform overflow-hidden relative">
                        <Ball number="大" color="rgba(255,255,255,0.2)" size={32} />
                        <span className="font-black text-xs">大乐透</span>
                    </button>
                    <button onClick={() => navigate(`/s/${storeId}/scratch`)}
                        className="rounded-2xl p-4 bg-gradient-to-br from-[#11998e] to-[#38ef7d] text-white flex flex-col items-center gap-2 shadow-[0_8px_16px_rgba(17,153,142,0.3)] active:scale-95 transition-transform overflow-hidden relative">
                        <Ball number="刮" color="rgba(255,255,255,0.2)" size={32} />
                        <span className="font-black text-xs">顶呱刮</span>
                    </button>
                    <div className="rounded-2xl p-4 bg-gray-100 text-gray-400 flex flex-col items-center gap-2 shadow-inner overflow-hidden relative cursor-not-allowed">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <Zap size={16} />
                        </div>
                        <span className="font-black text-xs">竞猜</span>
                        <div className="absolute top-0 right-0 bg-gray-400 text-white text-[7px] px-3 py-1 rotate-45 translate-x-3 translate-y-0.5 font-black whitespace-nowrap">未开放</div>
                    </div>
                </div>
            </div>

            {/* Bottom Safe Guard */}
            <div className="flex-shrink-0 flex items-center justify-center gap-3 py-3 bg-white/90 border-t border-gray-100 text-[9px] font-bold text-gray-400">
                <span className="flex items-center gap-1"><Zap size={10} className="fill-orange-400 text-orange-400" /> 理性购彩</span>
                <span className="flex items-center gap-1"><Store size={10} className="fill-blue-400 text-blue-400" /> 未成年人禁入</span>
            </div>
        </div>
    );
});

/* =========================================
   ZOOMED CAROUSEL OVERLAY
   ========================================= */

const ZoomedCarouselOverlay = ({ isOpen, items, onClose }) => {
    const clickCountRef = useRef(0);
    const clickTimerRef = useRef(null);

    useEffect(() => {
        if (isOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    // 重置计数器
    useEffect(() => {
        if (!isOpen) { clickCountRef.current = 0; }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleClick = () => {
        if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
        clickCountRef.current += 1;
        if (clickCountRef.current === 2) {
            onClose();
            clickCountRef.current = 0;
        } else {
            clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 400);
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-black" onClick={handleClick}>
            <Carousel items={items} className="h-full w-full !rounded-none" hideMarquee={true} zoomedMode={true} />
        </div>
    );
};

/* =========================================
   GAME PAGE WRAPPER — 游戏覆盖层
   ========================================= */

class GameErrorBoundary extends React.Component {
    state = { error: null };
    static getDerivedStateFromError(error) { return { error }; }
    componentDidCatch() {
        // Notify onReady so loading overlay doesn't get stuck
        this.props.onReady?.();
    }
    render() {
        if (this.state.error) {
            return (
                <div style={{ padding: 40, color: '#ef4444', fontFamily: 'monospace', whiteSpace: 'pre-wrap', fontSize: 14, background: '#fff', minHeight: '100vh' }}>
                    <h2>Game Load Error</h2>
                    <p>{this.state.error?.message || String(this.state.error)}</p>
                    <button onClick={() => this.setState({ error: null })} style={{ marginTop: 16, padding: '8px 16px', borderRadius: 8, border: '1px solid #ccc' }}>重试</button>
                </div>
            );
        }
        return this.props.children;
    }
}

/* =========================================
   ROOT COMPONENT
   ========================================= */
export default function PortalStyleSports() {
    const { storeId } = useParams();
    const originalNavigate = useNavigate();
    const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
    const lottoOverlayRef = useRef(null);
    const scratchOverlayRef = useRef(null);
    const loadingOverlayRef = useRef(null);
    const loadingHideRafRef = useRef(0);
    const loadingTextRef = useRef(null);
    const [gamesMounted, setGamesMounted] = useState(false);
    const [showGameHub, setShowGameHub] = useState(false);
    const [showStickerCamera, setShowStickerCamera] = useState(false);
    const [gameLogos, setGameLogos] = useState({});
    const homeReadyRef = useRef(false);
    const scratchReadyRef = useRef(false);
    const pendingGameRef = useRef(null);

    // 拉取互动中心Logo
    const fetchGameLogos = () => {
        fetch('/api/game-logos', { cache: 'no-store' })
            .then(r => r.json())
            .then(d => { if (d.logos) setGameLogos(d.logos); })
            .catch(() => {});
    };
    useEffect(() => { fetchGameLogos(); }, []);

    const setOverlayVisible = (el, visible) => {
        if (!el) return;
        el.style.opacity = visible ? '1' : '0';
        el.style.pointerEvents = visible ? 'auto' : 'none';
    };

    const showGameOverlay = useCallback((game) => {
        const loadingEl = loadingOverlayRef.current;
        const lottoEl = lottoOverlayRef.current;
        const scratchEl = scratchOverlayRef.current;

        if (loadingHideRafRef.current) {
            clearTimeout(loadingHideRafRef.current);
            cancelAnimationFrame(loadingHideRafRef.current);
            loadingHideRafRef.current = 0;
        }

        const isReady = game === 'lotto' ? homeReadyRef.current : scratchReadyRef.current;

        // 更新加载過场文字
        if (loadingTextRef.current) {
            loadingTextRef.current.textContent = game === 'lotto'
                ? '正在为您准备超级大乐透界面...'
                : '正在为您准备体彩顶呱刮界面...';
        }

        if (isReady) {
            // 已预渲染 — 先显示加载過场，下一帧显示游戏，再下一帧隐藏加载
            setOverlayVisible(loadingEl, true);
            loadingHideRafRef.current = requestAnimationFrame(() => {
                setOverlayVisible(lottoEl, game === 'lotto');
                setOverlayVisible(scratchEl, game === 'scratch');
                loadingHideRafRef.current = requestAnimationFrame(() => {
                    setOverlayVisible(loadingEl, false);
                    loadingHideRafRef.current = 0;
                });
            });
        } else {
            // 未就绪 — 加载過场立即显示（半透明，门户可见）
            // 游戏覆盖层保持隐藏，等 onReady 再显示
            pendingGameRef.current = game;
            setOverlayVisible(loadingEl, true);

            // 双 rAF：保证加载過场绘制到屏幕后再触发 Home 渲染
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setGamesMounted(true);
                    // 不显示游戏覆盖层！handleHomeReady 会做交叉淡入
                });
            });
        }
    }, []);

    // 拦截游戏路由：点击只改 DOM，可见性切换不走 React 热路径
    const navigate = useCallback((path) => {
        if (typeof path === 'string') {
            if (path.endsWith('/lotto')) {
                showGameOverlay('lotto');
                return;
            }
            if (path.endsWith('/scratch')) {
                showGameOverlay('scratch');
                return;
            }
        }
        originalNavigate(path);
    }, [originalNavigate, showGameOverlay]);

    // 返回：直接操作 DOM，零延迟
    const handleGameBack = useCallback(() => {
        pendingGameRef.current = null;
        if (loadingHideRafRef.current) {
            clearTimeout(loadingHideRafRef.current);
            cancelAnimationFrame(loadingHideRafRef.current);
            loadingHideRafRef.current = 0;
        }
        setOverlayVisible(lottoOverlayRef.current, false);
        setOverlayVisible(scratchOverlayRef.current, false);
        setOverlayVisible(loadingOverlayRef.current, false);
    }, []);

    const handleHomeReady = useCallback(() => {
        homeReadyRef.current = true;
        if (pendingGameRef.current === 'lotto') {
            // 用户点击触发的渲染完成 — 交叉淡入：游戏层淡入 + 加载层淡出
            setOverlayVisible(lottoOverlayRef.current, true);
            requestAnimationFrame(() => {
                setOverlayVisible(loadingOverlayRef.current, false);
            });
            pendingGameRef.current = null;
        }
        // 后台预渲染完成时不做任何显示操作
    }, []);

    const handleScratchReady = useCallback(() => {
        scratchReadyRef.current = true;
        if (pendingGameRef.current === 'scratch') {
            setOverlayVisible(scratchOverlayRef.current, true);
            requestAnimationFrame(() => {
                setOverlayVisible(loadingOverlayRef.current, false);
            });
            pendingGameRef.current = null;
        }
    }, []);

    useEffect(() => {
        return () => {
            if (loadingHideRafRef.current) {
                cancelAnimationFrame(loadingHideRafRef.current);
            }
        };
    }, []);

    // 5秒后后台预渲染游戏（用户还没点击时就开始准备）
    useEffect(() => {
        const tid = setTimeout(() => setGamesMounted(true), 5000);
        return () => clearTimeout(tid);
    }, []);


    const [scrollResetKey, setScrollResetKey] = useState(0);

    // 从统一数据层获取数据
    const {
        storeData,
        sourcesData,
        announcements,
        annConfig,
        drawHistory: centralDrawHistory,
        notFound,
    } = useStoreData();
    const isLowPerf = usePerformanceMode();
    const isAndroidUA = /Android/i.test(navigator.userAgent || '');
    const isTabletSize = Math.min(dims.w, dims.h) >= 600;
    const androidPadMode = isAndroidUA && isTabletSize;

    const handleResize = useCallback(() => setDims({ w: window.innerWidth, h: window.innerHeight }), []);

    // --- QR Config ---
    const [qrLabel, setQrLabel] = useState('福建体彩服务号');
    const [qrEnabled, setQrEnabled] = useState(true);
    useEffect(() => {
        fetch('/api/fujian-lottery-qr/config').then(r => r.json()).then(d => {
            if (d.label) setQrLabel(d.label);
            if (d.enabled !== undefined) setQrEnabled(d.enabled);
        }).catch(() => {});
    }, []);

    // --- Hidden Admin State ---
    const [logoCount, setLogoCount] = useState(0);
    const [nameCount, setNameCount] = useState(0);
    const [isAdminAuthOpen, setIsAdminAuthOpen] = useState(false); // 密码校验框
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false); // 管理面板
    const [adminPassword, setAdminPassword] = useState('');
    const [activeSection, setActiveSection] = useState('basic'); // store-side panel keeps only basic contact info
    const resetTimerRef = useRef(null);

    // --- Carousel Zoom State ---
    const [isZoomed, setIsZoomed] = useState(false);
    const [zoomCount, setZoomCount] = useState(0);
    const zoomResetTimerRef = useRef(null);
    const [isTrendZoomed, setIsTrendZoomed] = useState(false);
    const onTrendZoom = useCallback(() => {
        setIsTrendZoomed(true);
    }, []);

    const handleCarouselClick = useCallback((e, ref) => {
        if (zoomResetTimerRef.current) clearTimeout(zoomResetTimerRef.current);
        const nextCount = zoomCount + 1;
        setZoomCount(nextCount);

        if (nextCount === 2) {
            setIsZoomed(prev => !prev);
            setZoomCount(0);
        } else {
            zoomResetTimerRef.current = setTimeout(() => setZoomCount(0), 400);
        }
    }, [zoomCount]);

    const startResetTimer = () => {
        if (resetTimerRef.current) clearTimeout(resetTimerRef.current);
        resetTimerRef.current = setTimeout(() => {
            setLogoCount(0);
            setNameCount(0);
        }, 5000);
    };

    const onLogoClick = useCallback(() => {
        if (androidPadMode) return; // 安卓平板严禁后台
        setLogoCount(prev => {
            const next = prev + 1;
            if (next === 5) console.log('Secret Step 1: Logo 5 Hits');
            return next;
        });
        startResetTimer();
    }, [androidPadMode]);

    const onNameClick = useCallback(() => {
        if (androidPadMode) return; // 安卓平板严禁后台
        if (logoCount < 5) return;
        setNameCount(prev => {
            const next = prev + 1;
            if (next === 5) {
                setIsAdminAuthOpen(true);
                setLogoCount(0);
                setNameCount(0);
            }
            return next;
        });
        startResetTimer();
    }, [androidPadMode, logoCount]);

    useEffect(() => {
        const onResize = () => { handleResize(); setIsZoomed(false); };
        window.addEventListener('resize', onResize);
        window.addEventListener('orientationchange', onResize);

        const handleVisibility = () => {
            if (document.visibilityState === 'visible') {
                setScrollResetKey(prev => prev + 1);
            }
        };
        document.addEventListener('visibilitychange', handleVisibility);
        window.addEventListener('focus', handleVisibility);

        return () => {
            window.removeEventListener('resize', onResize);
            window.removeEventListener('orientationchange', onResize);
            document.removeEventListener('visibilitychange', handleVisibility);
            window.removeEventListener('focus', handleVisibility);
        };
    }, [handleResize]);

    if (notFound) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fa-solid fa-store-slash text-4xl text-gray-400"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">站点不存在</h2>
                    <p className="text-gray-500 mb-6">该门店可能已被管理员删除或暂停运营。</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                    >
                        返回主站
                    </button>
                </div>
            </div>
        );
    }

    const isLandscape = dims.w >= dims.h;
    const screenRatio = dims.w / dims.h;
    const isPad16x10Landscape = isLandscape && Math.abs(screenRatio - 1.6) < 0.03;
    const isPad16x10Portrait = !isLandscape && Math.abs(screenRatio - 0.625) < 0.03;
    const useFullScreenRatio = isPad16x10Landscape || isPad16x10Portrait || androidPadMode;
    const ratio = useFullScreenRatio ? screenRatio : (isLandscape ? (16 / 9) : (9 / 16));
    let boxW = dims.w, boxH = dims.h;
    if (useFullScreenRatio) {
        boxW = dims.w;
        boxH = dims.h;
    } else if (isLandscape) {
        boxH = dims.h; boxW = boxH * ratio;
        if (boxW > dims.w) { boxW = dims.w; boxH = boxW / ratio; }
    } else {
        boxW = Math.min(dims.w, dims.h * ratio);
        boxH = boxW / ratio;
        if (boxH > dims.h) { boxH = dims.h; boxW = boxH * ratio; }
    }

    // Live / Fallback Sources
    const winnerPalette = ['#FF416C', '#11998e', '#f09819', '#4776E6', '#AF52DE', '#FF6A00'];
    const templatedWinners = Array.isArray(storeData?.winnerReports)
        ? storeData.winnerReports
            .filter(item => item && item.enabled !== false && item.text)
            .map((item, idx) => ({
                id: item.id || `winner-${idx + 1}`,
                text: String(item.text),
                color: winnerPalette[idx % winnerPalette.length]
            }))
        : [];
    const winnerEditing = Array.isArray(storeData?.winnerReports) && templatedWinners.length === 0;

    const activeSources = useMemo(() => ({
        store: { ...MOCK_STORE, ...(sourcesData?.store || {}), ...(storeData || {}) },
        industry: sourcesData?.industry || MOCK_INDUSTRY_NEWS,
        local: sourcesData?.local || MOCK_LOCAL_NEWS,
        culture: sourcesData?.culture || MOCK_INDUSTRY_NEWS,
        welfare: sourcesData?.welfare || MOCK_WELFARE_CULTURE,
        carousel: sourcesData?.carousel || MOCK_CAROUSEL,
        winners: winnerEditing ? [] : (templatedWinners.length > 0 ? templatedWinners : (sourcesData?.winners || MOCK_WINNERS)),
        winnerEditing,
        draws: sourcesData?.draws || MOCK_LIVE_DRAWS,
        fujianDraws: (() => {
            const fj = sourcesData?.fujianDraws || [];
            const dh = centralDrawHistory || sourcesData?.drawHistory;
            if (!dh || !Array.isArray(dh.games)) return fj;
            const dhMap = {};
            dh.games.forEach(g => { if (g.history?.[0]) { dhMap[g.key] = g.history[0]; dhMap[g.name] = g.history[0]; } });
            return fj.map(d => {
                const h = dhMap[d.id] || dhMap[d.name];
                if (!h) return d;
                const hNum = Number(normalizeIssue(h.issue));
                const dNum = Number(normalizeIssue(d.issue));
                if (hNum > dNum) {
                    return { ...d, issue: h.issue, numbers: h.numbers || d.numbers, bonusNumbers: h.bonusNumbers || d.bonusNumbers, pool: h.pool || d.pool, drawDate: h.date || d.drawDate };
                }
                if (!d.pool && h.pool) return { ...d, pool: h.pool };
                return d;
            });
        })(),
        fortuneData: sourcesData?.fortuneData || { zodiacs: [], constellations: [] },
        announcements: announcements,
        announcementConfig: annConfig,
        availableTags: sourcesData?.availableTags || [],
        drawHistory: centralDrawHistory || sourcesData?.drawHistory || null,
        drawHistorySize: sourcesData?.drawHistorySize || 6,
        scrollHoldMs: sourcesData?.scrollHoldMs || 3000,
        layoutLibrary: sourcesData?.layoutLibrary || [],
        drawLogoMap: sourcesData?.drawLogoMap || {},
        drawLogoOpacity: typeof sourcesData?.drawLogoOpacity === 'number' ? sourcesData.drawLogoOpacity : 0.12
    }), [sourcesData, storeData, announcements, annConfig, centralDrawHistory, templatedWinners, winnerEditing]);

    const dltLogoUrl = resolveDrawLogoUrl('超级大乐透', activeSources.layoutLibrary, activeSources.drawLogoMap, getDltLogoUrl(activeSources.layoutLibrary));

    const gridPaddingX = 20;
    const gridGap = 16;
    const gridWidth = Math.max(0, boxW - gridPaddingX * 2);
    const leftWidth = Math.max(0, (gridWidth - gridGap) * (8 / 12));
    const topRowHeight = androidPadMode ? Math.max(0, (leftWidth * 9) / 16) : null;

    const props = { storeId, navigate, sources: activeSources, gameLogos, scrollResetKey, dltLogoUrl, androidPadMode, topRowHeight, isLowPerf, onLogoClick, onNameClick, onCarouselClick: handleCarouselClick, onTrendZoom, onOpenGameHub: () => setShowGameHub(true), qrLabel, qrEnabled };

    if (!sourcesData) {
        return (
            <div style={{
                position: 'fixed', inset: 0,
                background: '#e8e8e8',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                fontFamily: 'system-ui, sans-serif'
            }}>
                <div style={{
                    width: 44, height: 44, marginBottom: 20,
                    border: '3px solid rgba(0,0,0,0.08)',
                    borderTopColor: '#e53935',
                    borderRadius: '50%',
                    animation: 'portal-spin 0.8s linear infinite'
                }} />
                <div style={{ fontSize: 18, fontWeight: 700, color: '#333', letterSpacing: 1, marginBottom: 6 }}>体彩门店互动平台</div>
                <div style={{ fontSize: 13, color: '#999' }}>正在加载门店数据...</div>
                <style>{`@keyframes portal-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e8e8e8', fontFamily: "'Helvetica Neue','PingFang SC',Arial,sans-serif" }}>
            <div style={{ width: boxW, height: boxH, overflow: 'hidden', borderRadius: useFullScreenRatio ? 0 : 16, boxShadow: useFullScreenRatio ? 'none' : '0 20px 80px rgba(0,0,0,0.2)' }}>
                {isLandscape ? <LandscapeLayout {...props} /> : <PortraitLayout {...props} />}
            </div>

            {/* Admin Auth Modal (Password Prompt) */}
            {isAdminAuthOpen && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 animate-in fade-in">
                    <div className="bg-white w-80 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-black text-gray-800 flex items-center gap-2">
                                <Lock size={18} className="text-blue-500" /> 管理权鉴
                            </h3>
                            <button onClick={() => setIsAdminAuthOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                        </div>
                        <div className="space-y-4">
                            <input
                                type="password"
                                value={adminPassword}
                                onChange={(e) => setAdminPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-mono text-xl tracking-widest"
                                placeholder="输入管理密钥"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && adminPassword) {
                                        setIsAdminAuthOpen(false);
                                        setIsAdminPanelOpen(true);
                                    }
                                }}
                            />
                            <button
                                onClick={() => {
                                    if (adminPassword) {
                                        setIsAdminAuthOpen(false);
                                        setIsAdminPanelOpen(true);
                                    }
                                }}
                                className="w-full py-3 bg-blue-600 text-white rounded-2xl font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
                            >
                                确认进入
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Zoomed Carousel Overlay */}
            <ZoomedCarouselOverlay
                isOpen={isZoomed}
                items={activeSources.carousel}
                onClose={() => setIsZoomed(false)}
            />

            {/* Modular Admin Panel Modal */}
            {isAdminPanelOpen && (
                <div className="fixed inset-0 z-[1999] flex items-center justify-center p-4 bg-black/40 animate-in fade-in">
                    <div className="bg-[#f8fafc] w-full max-w-6xl h-[92vh] rounded-[40px] shadow-2xl overflow-hidden flex flex-col border border-white/50 animate-in slide-in-from-bottom-8">
                        {/* Header Tabs */}
                        <div className="flex-none bg-white p-3 px-8 border-b border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-12">
                                <div className="flex flex-col">
                                    <h2 className="text-base font-black text-gray-800 leading-tight">门店后台管理</h2>
                                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{activeSources.store.name}</span>
                                </div>
                                <div className="flex items-center bg-gray-100 p-1 rounded-2xl">
                                    {[
                                        { id: 'basic', label: '基础信息', icon: Store },
                                        { id: 'games', label: '功能开关', icon: Zap },
                                        { id: 'scratch', label: '顶呱刮配置', icon: Ticket },
                                        { id: 'winners', label: '本店喜报', icon: Trophy },
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveSection(tab.id)}
                                            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-bold text-xs transition-all ${activeSection === tab.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            <tab.icon size={14} />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setIsAdminPanelOpen(false)} className="w-10 h-10 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl hover:bg-red-100 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 overflow-y-auto !scrollbar-hide p-6">
                            {activeSection === 'winners' ? (
                                <WinnerConfig
                                    storeId={storeId}
                                    onClose={() => setIsAdminPanelOpen(false)}
                                    isModal={true}
                                    adminKey={adminPassword}
                                />
                            ) : (
                                <StoreConfig
                                    storeId={storeId}
                                    initialKey={adminPassword}
                                    onClose={() => setIsAdminPanelOpen(false)}
                                    activeSection={activeSection}
                                />
                            )}
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes spinBall { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
                @keyframes popIn { from{transform:scale(0) rotate(-30deg);opacity:0} to{transform:scale(1) rotate(0);opacity:1} }
                @keyframes float { 0% { transform: translateY(0px); } 50% { transform: translateY(-10px); } 100% { transform: translateY(0px); } }
                .fj-welfare-line {
                    position: relative;
                    text-indent: 0;
                }
                .fj-welfare-line::before {
                    content: attr(data-content);
                    position: absolute;
                    left: 0;
                    top: 0;
                    -webkit-text-stroke: 0;
                    color: #fff;
                }
                .fj-welfare-date {
                    position: relative;
                    font-size: 16px;
                    text-indent: 0;
                    color: #e60012;
                    -webkit-text-stroke: 0.5px #fff;
                }
                .fj-welfare-date::before {
                    content: attr(data-content-1);
                    position: absolute;
                    left: 0;
                    top: 0;
                    -webkit-text-stroke: 0;
                    color: #e60012;
                }
                * {
                    -webkit-user-select: none;
                    -moz-user-select: none;
                    -ms-user-select: none;
                    user-select: none;
                    -webkit-touch-callout: none;
                    -webkit-tap-highlight-color: transparent;
                }
                input, textarea, [contenteditable="true"] {
                    -webkit-user-select: text;
                    -moz-user-select: text;
                    -ms-user-select: text;
                    user-select: text;
                }
                img {
                    -webkit-user-drag: none;
                    pointer-events: none;
                }
            `}</style>

            {/* Super Lotto Trend Zoom Overlay */}
            {sourcesData?.drawHistory && (
                <ZoomedTrendOverlay
                    isOpen={isTrendZoomed}
                    history={sourcesData.drawHistory.games?.find(g => g.name.includes('大乐透'))?.history || []}
                    onClose={() => setIsTrendZoomed(false)}
                    logoUrl={dltLogoUrl}
                    androidPadMode={androidPadMode}
                />
            )}

            {/* 游戏集合界面 - iOS 26 液态玻璃风格 */}
            {showGameHub && (
                <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center p-6"
                    style={{ background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', animation: 'gameHubFadeIn 0.4s ease-out' }}
                    onClick={(e) => { if (e.target === e.currentTarget) setShowGameHub(false); }}
                >
                    <div
                        className="relative w-full max-w-2xl rounded-[48px] overflow-hidden"
                        style={{
                            background: 'rgba(255, 255, 255, 0.4)',
                            backdropFilter: 'blur(40px) saturate(180%)',
                            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                            boxShadow: '0 40px 100px rgba(0,0,0,0.2), inset 0 0 0 1px rgba(255,255,255,0.5)',
                            animation: 'gameHubSlideIn 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                    >
                        {/* Background Liquid Decorations */}
                        {!isLowPerf && (
                            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-purple-400/20 rounded-full blur-[100px] animate-pulse" />
                                <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-blue-400/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
                                <div className="absolute top-[40%] left-[30%] w-[40%] h-[40%] bg-pink-400/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
                            </div>
                        )}

                        <div className="relative px-10 pt-10 pb-6 flex items-center justify-between z-10">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-3xl bg-white/60 flex items-center justify-center shadow-[0_8px_20px_rgba(0,0,0,0.08)] border border-white/80">
                                    <Gamepad2 size={28} className="text-indigo-600" />
                                </div>
                                <div>
                                    <h2 className="font-black text-gray-900 text-2xl tracking-tight">体彩互动中心</h2>
                                    <p className="text-sm text-gray-500 font-bold opacity-70">SPORTS LOTTERY INTERACTION</p>
                                </div>
                            </div>
                            <button onClick={() => setShowGameHub(false)} className="w-12 h-12 rounded-full bg-white/40 hover:bg-white/60 flex items-center justify-center transition-all active:scale-90 border border-white/60 shadow-sm">
                                <X size={24} className="text-gray-700" />
                            </button>
                        </div>
                        
                        <div className="px-10 pb-10 grid grid-cols-3 gap-6 z-10 relative">
                            {/* 大乐透 */}
                            <button onClick={() => { setShowGameHub(false); navigate(`/s/${storeId}/lotto`); }}
                                className="group relative overflow-hidden rounded-[32px] active:scale-95 transition-all shadow-lg hover:shadow-2xl"
                                style={{ aspectRatio: '1/1' }}>
                                {gameLogos.lotto?.url ? (
                                    <img src={gameLogos.lotto.url} alt="大乐透" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-orange-400 to-rose-500 p-6 flex flex-col items-center justify-center gap-3">
                                        <img src={DltLogo} alt="大乐透" className="w-16 h-16 object-contain drop-shadow-xl group-hover:rotate-12 transition-transform" />
                                        <span className="text-white font-black text-base">超级大乐透</span>
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                            </button>

                            {/* 顶呱刮 */}
                            <button onClick={() => { setShowGameHub(false); navigate(`/s/${storeId}/scratch`); }}
                                className="group relative overflow-hidden rounded-[32px] active:scale-95 transition-all shadow-lg hover:shadow-2xl"
                                style={{ aspectRatio: '1/1' }}>
                                {gameLogos.scratch?.url ? (
                                    <img src={gameLogos.scratch.url} alt="顶呱刮" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-emerald-400 to-teal-500 p-6 flex flex-col items-center justify-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 group-hover:rotate-[-12deg] transition-transform">
                                            <svg className="w-10 h-10" viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="12" rx="3" fill="none" stroke="white" strokeWidth="2" /><path d="M7 10h10M7 14h6" stroke="white" strokeWidth="2" strokeLinecap="round" /><circle cx="17" cy="14" r="1.5" fill="white" /></svg>
                                        </div>
                                        <span className="text-white font-black text-base">体彩顶呱刮</span>
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                            </button>

                            {/* 连连看 */}
                            <button onClick={() => { setShowGameHub(false); window.location.href = `/games/lianliankan/?from=/s/${storeId}`; }}
                                className="group relative overflow-hidden rounded-[32px] active:scale-95 transition-all shadow-lg hover:shadow-2xl"
                                style={{ aspectRatio: '1/1' }}>
                                {gameLogos.lianliankan?.url ? (
                                    <img src={gameLogos.lianliankan.url} alt="连连看" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-indigo-500 p-6 flex flex-col items-center justify-center gap-3">
                                        <span className="text-5xl group-hover:scale-125 transition-transform">🎯</span>
                                        <span className="text-white font-black text-base">体彩连连看</span>
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                            </button>

                            {/* 大头贴 */}
                            <button onClick={() => { setShowGameHub(false); setShowStickerCamera(true); }}
                                className="group relative overflow-hidden rounded-[32px] active:scale-95 transition-all shadow-lg hover:shadow-2xl"
                                style={{ aspectRatio: '1/1' }}>
                                {gameLogos.sticker?.url ? (
                                    <img src={gameLogos.sticker.url} alt="大头贴" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-pink-400 to-rose-500 p-6 flex flex-col items-center justify-center gap-3">
                                        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md border border-white/30 group-hover:scale-110 transition-transform">
                                            <Camera className="w-10 h-10 text-white" strokeWidth={1.6} />
                                        </div>
                                        <span className="text-white font-black text-base">中奖大头贴</span>
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                            </button>

                            {/* 消消乐 */}
                            <button onClick={() => { setShowGameHub(false); window.location.href = `/games/xiaoxiaole/?from=/s/${storeId}`; }}
                                className="group relative overflow-hidden rounded-[32px] active:scale-95 transition-all shadow-lg hover:shadow-2xl"
                                style={{ aspectRatio: '1/1' }}>
                                {gameLogos.xiaoxiaole?.url ? (
                                    <img src={gameLogos.xiaoxiaole.url} alt="消消乐" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-cyan-400 to-teal-500 p-6 flex flex-col items-center justify-center gap-3">
                                        <span className="text-5xl group-hover:rotate-12 transition-transform">💎</span>
                                        <span className="text-white font-black text-base">体彩消消乐</span>
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                            </button>

                            {/* 快飞 */}
                            <button onClick={() => { setShowGameHub(false); window.location.href = `/games/flappy-bird/?from=/s/${storeId}`; }}
                                className="group relative overflow-hidden rounded-[32px] active:scale-95 transition-all shadow-lg hover:shadow-2xl"
                                style={{ aspectRatio: '1/1' }}>
                                {gameLogos.flappy?.url ? (
                                    <img src={gameLogos.flappy.url} alt="快飞" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 p-6 flex flex-col items-center justify-center gap-3">
                                        <span className="text-5xl group-hover:translate-y-[-10px] transition-transform">🐦</span>
                                        <span className="text-white font-black text-base">乐小星快飞</span>
                                        <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <style>{`
                @keyframes gameHubFadeIn { from { opacity: 0; backdrop-filter: blur(0px); } to { opacity: 1; backdrop-filter: blur(20px); } }
                @keyframes gameHubSlideIn { from { opacity: 0; transform: scale(0.85) translateY(40px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            `}</style>

            {/* 中奖大头贴拍照全屏组件 */}
            <PhotoStickerCamera
                open={showStickerCamera}
                onClose={() => setShowStickerCamera(false)}
            />

            {/* 游戏即时加载过场：与 Home 挂载解耦，点击同帧即可出现 */}
            <div
                ref={loadingOverlayRef}
                style={{
                    position: 'fixed', inset: 0, zIndex: 10001,
                    opacity: 0, pointerEvents: 'none',
                    transition: 'opacity 150ms ease',
                    background: 'rgba(17, 24, 39, 0.55)',
                    willChange: 'opacity'
                }}
            >
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{
                        minWidth: 260,
                        padding: '22px 28px',
                        borderRadius: 24,
                        background: 'rgba(255,255,255,0.14)',
                        border: '1px solid rgba(255,255,255,0.16)',
                        boxShadow: '0 20px 50px rgba(0,0,0,0.18)',
                        textAlign: 'center',
                        color: '#fff'
                    }}>
                        <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: 1, marginBottom: 10 }}>正在进入游戏</div>
                        <div ref={loadingTextRef} style={{ fontSize: 14, opacity: 0.9 }}>正在为您准备游戏界面...</div>
                    </div>
                </div>
            </div>

            {/* 游戏覆盖层：延迟挂载 + 懒加载 + GPU层常驻，秒切可见性 */}
            <div
                ref={lottoOverlayRef}
                style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    opacity: 0, pointerEvents: 'none',
                    background: '#1f2937',
                    willChange: 'opacity',
                    transition: 'opacity 200ms ease-out'
                }}
            >
                {gamesMounted && (
                    <GameErrorBoundary onReady={handleHomeReady}>
                        <Home storeId={storeId} onBack={handleGameBack} onReady={handleHomeReady} />
                    </GameErrorBoundary>
                )}
            </div>

            <div
                ref={scratchOverlayRef}
                style={{
                    position: 'fixed', inset: 0, zIndex: 10000,
                    opacity: 0, pointerEvents: 'none',
                    background: '#fff7ed',
                    willChange: 'opacity',
                    transition: 'opacity 200ms ease-out'
                }}
            >
                {gamesMounted && (
                    <GameErrorBoundary onReady={handleScratchReady}>
                        <ScratchCard storeId={storeId} onBack={handleGameBack} onReady={handleScratchReady} />
                    </GameErrorBoundary>
                )}
            </div>
        </div>
    );
}




