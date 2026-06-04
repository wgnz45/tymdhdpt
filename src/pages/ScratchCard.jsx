import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ChevronLeft, RotateCcw, Star, Zap, Package } from 'lucide-react';
import { usePerformanceMode } from '../hooks/usePerformanceMode';

// ─── Tier definitions (mirrors server) ───────────────────────────────────
const TIER_META = {
    10: { label: '10元', color: '#ec4899', glow: 'rgba(236,72,153,0.45)', maxCount: 60, bg: 'from-pink-500/20 to-pink-600/5' },
    20: { label: '20元', color: '#3b82f6', glow: 'rgba(59,130,246,0.45)', maxCount: 30, bg: 'from-blue-500/20 to-blue-600/5' },
    30: { label: '30元', color: '#f59e0b', glow: 'rgba(245,158,11,0.45)', maxCount: 20, bg: 'from-amber-500/20 to-amber-600/5' },
    50: { label: '50元', color: '#dc2626', glow: 'rgba(220,38,38,0.45)', maxCount: 20, bg: 'from-red-500/20 to-red-600/5' },
};

// ─── Roulette constants ──────────────────────────────────────────────────
const CARD_W = 200;
const CARD_GAP = 16;
const STEP = CARD_W + CARD_GAP; // 216
const SPIN_MIN_DISTANCE_PX = 15000; // uniform spin distance for all tiers (~70 cards)
const SPIN_DURATION_MS = 4000;
const SPIN_EASING = 'cubic-bezier(0.06, 0.6, 0.16, 1)';
const SNAP_DURATION_MS = 400;

export default function ScratchCard({ onBack, onReady }) {
    const { storeId } = useParams();
    const isLowPerf = usePerformanceMode();

    // ── State ──────────────────────────────────────────────────────────────
    const [storeConfig, setStoreConfig] = useState(null);
    const [scratchData, setScratchData] = useState(null); // { tiers: {10:{images,maxCount,label,drawCount}, ...} }
    const [selectedTier, setSelectedTier] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Roulette animation state
    const [phase, setPhase] = useState('idle'); // idle | spinning | result
    const [shuffleKey, setShuffleKey] = useState(0); // increment to trigger reshuffle
    const [winnerImg, setWinnerImg] = useState(null);
    const [luckyNumber, setLuckyNumber] = useState(null);
    const [spinTargetTx, setSpinTargetTx] = useState(0);


    // Refs
    const stripRef = useRef(null);
    const spinRafRef = useRef(null);
    const spinTimeoutRef = useRef(null);
    const pendingShuffleRef = useRef(null);
    const countdownRef = useRef(null);
    const countdownDisplayRef = useRef(null);

    useEffect(() => {
        const id = requestAnimationFrame(() => onReady?.());
        return () => cancelAnimationFrame(id);
    }, [onReady]);

    // ── Load data ─────────────────────────────────────────────────────────

    const fetchScratchData = useCallback((isInitial = false) => {
        const sid = storeId || 'default';
        const fetches = isInitial
            ? Promise.all([
                fetch(`/api/store/${sid}`).then(r => r.json()),
                fetch(`/api/store/${sid}/scratch`).then(r => r.json())
            ])
            : fetch(`/api/store/${sid}/scratch`).then(r => r.json()).then(s => [null, s]);

        fetches.then(([cfg, scratch]) => {
            if (cfg) setStoreConfig(cfg);
            // Only update if data actually changed — avoids re-shuffle during marquee
            setScratchData(prev => {
                if (!isInitial && prev) {
                    const oldKeys = [10, 20, 30, 50].map(t => (prev.tiers?.[t]?.images || []).map(i => i.url || i.frontUrl || i.imageDataUrl).join(',')).join('|');
                    const newKeys = [10, 20, 30, 50].map(t => (scratch.tiers?.[t]?.images || []).map(i => i.url || i.frontUrl || i.imageDataUrl).join(',')).join('|');
                    if (oldKeys === newKeys) return prev;
                }
                return scratch;
            });
            if (isInitial) {
                const tiers = [10, 20, 30, 50];
                const first = tiers.find(t => scratch.tiers[t]?.images?.length > 0) || 10;
                setSelectedTier(first);
                setLoading(false);
            }
        }).catch(() => {
            if (isInitial) { setError('无法加载数据，请检查网络'); setLoading(false); }
        });
    }, [storeId]);

    // Initial load
    useEffect(() => { fetchScratchData(true); }, [fetchScratchData]);

    // Periodic refresh (every 60s) — visibility-aware, stops in background
    useEffect(() => {
        let timer = null;
        const start = () => { timer = setInterval(() => { if (phase === 'idle') fetchScratchData(false); }, 60000); };
        const stop = () => { if (timer) { clearInterval(timer); timer = null; } };
        const onVis = () => { document.visibilityState === 'visible' ? start() : stop(); };
        start();
        document.addEventListener('visibilitychange', onVis);
        return () => { stop(); document.removeEventListener('visibilitychange', onVis); };
    }, [fetchScratchData, phase]);

    // Pre-decode ALL tier images on data load so tier switching is instant
    // Store refs to avoid leak: clear old Image objects before creating new ones
    const preloadImgsRef = useRef([]);
    useEffect(() => {
        if (!scratchData?.tiers) return;
        // Release previous preload images
        preloadImgsRef.current.forEach(img => { img.src = ''; });
        preloadImgsRef.current = [];
        [10, 20, 30, 50].forEach(tier => {
            const imgs = scratchData.tiers[tier]?.images || [];
            imgs.forEach(img => {
                const pre = new Image();
                pre.decoding = 'async';
                pre.src = img.imageDataUrl || img.frontUrl || img.url;
                preloadImgsRef.current.push(pre);
            });
        });
        return () => {
            preloadImgsRef.current.forEach(img => { img.src = ''; });
            preloadImgsRef.current = [];
        };
    }, [scratchData]);

    // ── Current tier images ────────────────────────────────────────────────
    const tierImages = scratchData?.tiers?.[selectedTier]?.images || [];
    const tierMeta = TIER_META[selectedTier] || TIER_META[10];

    // Build strip: shuffle once, repeat same order for enough copies to cover spin distance
    // pendingShuffleRef is set by handleSpin → React re-render uses same shuffle as DOM
    const stripCopies = tierImages.length > 0
        ? Math.max(10, Math.ceil((SPIN_MIN_DISTANCE_PX / STEP + tierImages.length * 2) / tierImages.length))
        : 10;
    const fullStrip = useMemo(() => {
        if (!tierImages.length) return [];
        let base;
        if (pendingShuffleRef.current && pendingShuffleRef.current.length === tierImages.length) {
            base = pendingShuffleRef.current;
            pendingShuffleRef.current = null;
        } else {
            base = [...tierImages];
            for (let i = base.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [base[i], base[j]] = [base[j], base[i]];
            }
        }
        const arr = [];
        for (let c = 0; c < stripCopies; c++) arr.push(...base);
        return arr;
    }, [tierImages, shuffleKey, stripCopies]);

    // ── Idle marquee: simple 1-cycle CSS animation (all copies identical → seamless) ──
    const oneCycleWidth = tierImages.length * STEP;
    const MARQUEE_ROUND_S = Math.max(12, tierImages.length * 3);
    // Negative delay to resume marquee from spin's end position
    const marqueeDelayS = oneCycleWidth > 0
        ? -((((- spinTargetTx) % oneCycleWidth) + oneCycleWidth) % oneCycleWidth) / oneCycleWidth * MARQUEE_ROUND_S
        : 0;

    // ── Spin: continue from current position ───────────────────────────────
    const handleSpin = useCallback(() => {
        if (phase === 'spinning' || tierImages.length === 0) return;

        const el = stripRef.current;
        if (!el) return;

        const length = tierImages.length;

        // ── Generate new shuffle (applied to DOM synchronously during teleport) ──
        const newBase = [...tierImages];
        for (let i = newBase.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newBase[i], newBase[j]] = [newBase[j], newBase[i]];
        }

        // Pick a random winner from new shuffle
        const winner = newBase[Math.floor(Math.random() * length)];
        const winnerUrl = winner.imageDataUrl || winner.frontUrl || winner.url;

        // Find winner position past fixed minimum spin distance
        const minIdx = Math.ceil(SPIN_MIN_DISTANCE_PX / STEP);
        let kTotal = minIdx;
        for (let i = minIdx; i < stripCopies * length; i++) {
            const img = newBase[i % length];
            if ((img.imageDataUrl || img.frontUrl || img.url) === winnerUrl) {
                kTotal = i;
                break;
            }
        }
        const finalX = -kTotal * STEP;

        const startX = -oneCycleWidth;
        const maxOff = (CARD_W / 2) - 20;
        const randomOffset = (Math.random() * 2 - 1) * maxOff;
        const finalXOffset = finalX + randomOffset;

        // Clean up any previous spin
        if (spinTimeoutRef.current?.cleanup) spinTimeoutRef.current.cleanup();
        const maxCount = TIER_META[selectedTier].maxCount;
        const lucky = Math.floor(Math.random() * maxCount) + 1;

        const showResult = () => {
            setWinnerImg(winner);
            setLuckyNumber(lucky);
            setPhase('result');
        };

        // === All DOM ops in one synchronous block (before browser paints) ===
        // 1. Teleport to start
        el.style.animation = 'none';
        el.style.transition = 'none';
        el.style.transform = `translate3d(${startX}px,0,0)`;

        // 2. Update card images directly in DOM (same JS task = before paint)
        const imgs = el.querySelectorAll('img');
        for (let i = 0; i < imgs.length; i++) {
            const src = newBase[i % length]?.imageDataUrl || newBase[i % length]?.frontUrl || newBase[i % length]?.url;
            if (src && imgs[i].src !== src) imgs[i].src = src;
        }

        // 3. Force style recalculation
        getComputedStyle(el).transform;

        // 4. Start spin transition (runs on compositor thread)
        el.style.transition = `transform ${SPIN_DURATION_MS}ms ${SPIN_EASING}`;
        el.style.transform = `translate3d(${finalXOffset}px,0,0)`;

        // 5. Defer React state sync to next frame so CSS transition starts immediately
        //    without being blocked by heavy React reconciliation on Android
        requestAnimationFrame(() => {
            pendingShuffleRef.current = newBase;
            setSpinTargetTx(finalX);
            setWinnerImg(null);
            setLuckyNumber(null);
            setPhase('spinning');
            setShuffleKey(k => k + 1); // React rebuild matches DOM → no visual change
        });

        // === Dual detection: transitionend + fallback setTimeout ===
        let spinDone = false;
        const onSpinDone = () => {
            if (spinDone) return;
            spinDone = true;
            el.removeEventListener('transitionend', onSpinTE);
            clearTimeout(spinFB);

            // Snap to exact center
            el.style.transition = `transform ${SNAP_DURATION_MS}ms cubic-bezier(0.34, 1.56, 0.64, 1)`;
            el.style.transform = `translate3d(${finalX}px,0,0)`;

            let snapDone = false;
            const onSnapDone = () => {
                if (snapDone) return;
                snapDone = true;
                el.removeEventListener('transitionend', onSnapTE);
                clearTimeout(snapFB);
                showResult();
            };
            const onSnapTE = (e) => { if (e.propertyName === 'transform') onSnapDone(); };
            el.addEventListener('transitionend', onSnapTE);
            const snapFB = setTimeout(onSnapDone, SNAP_DURATION_MS + 200);
            spinTimeoutRef.current = { cleanup: () => { clearTimeout(snapFB); el.removeEventListener('transitionend', onSnapTE); } };
        };
        const onSpinTE = (e) => { if (e.propertyName === 'transform') onSpinDone(); };
        el.addEventListener('transitionend', onSpinTE);
        const spinFB = setTimeout(onSpinDone, SPIN_DURATION_MS + 200);

        spinTimeoutRef.current = { cleanup: () => { clearTimeout(spinFB); el.removeEventListener('transitionend', onSpinTE); } };
    }, [phase, tierImages, selectedTier, oneCycleWidth]);

    // Hardware key support (spacebar / enter)
    useEffect(() => {
        const onKey = (e) => {
            if (e.code === 'Space' || e.code === 'Enter' || e.code === 'Numpad0') {
                e.preventDefault();
                handleSpin();
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [handleSpin]);

    const handleReset = useCallback(() => {
        if (countdownRef.current) { clearTimeout(countdownRef.current); countdownRef.current = null; }
        // Clear DOM-driven inline styles BEFORE React re-render so marquee resumes immediately
        if (stripRef.current) {
            stripRef.current.style.animation = '';
            stripRef.current.style.transition = '';
            stripRef.current.style.transform = '';
            stripRef.current.style.visibility = '';
        }
        setPhase('idle');
        setWinnerImg(null);
        setLuckyNumber(null);
        // Refresh data from backend (silent, non-blocking)
        fetchScratchData(false);
    }, [fetchScratchData]);

    // Countdown timer — pure DOM updates, zero React re-renders
    useEffect(() => {
        if (phase === 'result') {
            let remaining = 10;
            const el = countdownDisplayRef.current;
            if (el) el.textContent = `返回 (${remaining}s)`;
            const tick = () => {
                remaining--;
                if (el) el.textContent = `返回 (${remaining}s)`;
                if (remaining <= 0) {
                    countdownRef.current = null;
                    handleReset();
                } else {
                    countdownRef.current = setTimeout(tick, 1000);
                }
            };
            countdownRef.current = setTimeout(tick, 1000);
            return () => { if (countdownRef.current) { clearTimeout(countdownRef.current); countdownRef.current = null; } };
        }
    }, [phase, handleReset]);

    // Force-restart marquee animation when returning to idle
    useEffect(() => {
        if (phase === 'idle' && stripRef.current && oneCycleWidth > 0) {
            const el = stripRef.current;
            // Clear residual DOM-driven spin styles
            el.style.transition = '';
            el.style.transform = '';
            el.style.visibility = '';
            // Force browser to treat this as a NEW animation:
            // set 'none' → recalculate → set full animation value
            el.style.animation = 'none';
            void el.offsetWidth;
            el.style.animation = `scratchMarqueeKf ${MARQUEE_ROUND_S}s linear ${marqueeDelayS}s infinite`;
        }
    }, [phase, selectedTier, oneCycleWidth, MARQUEE_ROUND_S, marqueeDelayS]);

    // Cleanup on unmount
    useEffect(() => () => {
        if (spinTimeoutRef.current?.cleanup) spinTimeoutRef.current.cleanup();
        if (spinRafRef.current) cancelAnimationFrame(spinRafRef.current);
        if (countdownRef.current) clearTimeout(countdownRef.current);
    }, []);

    const VISIBLE = 5;
    const CARD_H = 260;

    // ★ Memoize card elements — React skips diffing ~96 children on phase transitions
    const cardElements = useMemo(() => fullStrip.map((img, i) => (
        <div
            key={i}
            data-strip-idx={i}
            className={`flex-shrink-0 ${isLowPerf ? '' : 'rounded-lg overflow-hidden'}`}
            style={{
                width: CARD_W,
                height: CARD_H,
                border: '1px solid rgba(0,0,0,0.08)',
                zIndex: 1,
            }}
        >
            <img src={img.imageDataUrl || img.frontUrl || img.url} alt={img.name}
                width={CARD_W} height={CARD_H}
                className={`w-full h-full object-contain ${isLowPerf ? '' : 'rounded-lg'}`}
                draggable={false}
                decoding="sync" loading="eager" />
        </div>
    )), [fullStrip, isLowPerf]);

    // ★ Winner highlight via DOM class toggle — avoids re-rendering 96 cards
    useEffect(() => {
        if (phase === 'result' && stripRef.current && spinTargetTx !== 0) {
            const winnerIdx = Math.round(-spinTargetTx / STEP);
            const card = stripRef.current.querySelector(`[data-strip-idx="${winnerIdx}"]`);
            if (card) {
                card.classList.add('scratchWinner');
                return () => card.classList.remove('scratchWinner');
            }
        }
    }, [phase, spinTargetTx]);

    // ── Render ──────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f0f0' }}>
                <div className="text-center space-y-4">
                    <div className="w-12 h-12 border-4 border-gray-200 border-t-red-500 rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 font-semibold">正在加载幸运票面...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: '#f0f0f0' }}>
                <div className="bg-white rounded-2xl p-8 text-center shadow-lg">
                    <p className="text-red-500 font-semibold text-lg">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col relative"
            style={{
                background: isLowPerf
                    ? '#fff8ec'
                    : `
                        radial-gradient(circle at 15% 20%, rgba(245,158,11,0.12) 0%, transparent 35%),
                        radial-gradient(circle at 85% 80%, rgba(220,38,38,0.10) 0%, transparent 40%),
                        radial-gradient(circle at 50% 50%, rgba(236,72,153,0.05) 0%, transparent 50%),
                        linear-gradient(180deg, #fff8ec 0%, #fef1e0 100%)
                    `,
                fontFamily: "'PingFang SC','Inter',system-ui,sans-serif"
            }}>

            {/* ── Background decorations — skip entirely on low-perf to reduce DOM + paint cost ── */}
            {!isLowPerf && (
                <>
                    <div className="absolute inset-0 pointer-events-none" aria-hidden="true"
                        style={{
                            backgroundImage: `repeating-linear-gradient(45deg, rgba(245,158,11,0.05) 0px, rgba(245,158,11,0.05) 2px, transparent 2px, transparent 24px)`,
                        }} />
                    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                        <Star size={40} style={{ position: 'absolute', top: '10%', left: '5%', color: '#f59e0b', opacity: 0.3, transform: 'rotate(-15deg)' }} fill="#f59e0b" />
                        <Star size={28} style={{ position: 'absolute', top: '24%', right: '6%', color: '#dc2626', opacity: 0.25, transform: 'rotate(25deg)' }} fill="#dc2626" />
                        <Star size={32} style={{ position: 'absolute', bottom: '16%', left: '3%', color: '#ec4899', opacity: 0.25, transform: 'rotate(10deg)' }} fill="#ec4899" />
                        <Star size={36} style={{ position: 'absolute', bottom: '10%', right: '4%', color: '#f59e0b', opacity: 0.3, transform: 'rotate(-25deg)' }} fill="#f59e0b" />
                        <Star size={22} style={{ position: 'absolute', top: '55%', left: '2%', color: '#dc2626', opacity: 0.22, transform: 'rotate(35deg)' }} fill="#dc2626" />
                        <Star size={24} style={{ position: 'absolute', top: '42%', right: '2%', color: '#f59e0b', opacity: 0.24, transform: 'rotate(-10deg)' }} fill="#f59e0b" />
                        <Star size={18} style={{ position: 'absolute', top: '75%', left: '12%', color: '#ec4899', opacity: 0.22, transform: 'rotate(45deg)' }} fill="#ec4899" />
                        <div style={{ position: 'absolute', top: '8%', right: '18%', width: 90, height: 90, borderRadius: '50%', border: '2px dashed rgba(245,158,11,0.28)' }} />
                        <div style={{ position: 'absolute', bottom: '18%', right: '12%', width: 70, height: 70, borderRadius: '50%', border: '2px dashed rgba(220,38,38,0.22)' }} />
                        <div style={{ position: 'absolute', top: '38%', left: '6%', width: 110, height: 110, borderRadius: '50%', border: '2px dashed rgba(236,72,153,0.2)' }} />
                        <div style={{ position: 'absolute', top: 70, left: 16, width: 40, height: 40, borderTop: '3px solid rgba(220,38,38,0.3)', borderLeft: '3px solid rgba(220,38,38,0.3)', borderTopLeftRadius: 8 }} />
                        <div style={{ position: 'absolute', top: 70, right: 16, width: 40, height: 40, borderTop: '3px solid rgba(245,158,11,0.3)', borderRight: '3px solid rgba(245,158,11,0.3)', borderTopRightRadius: 8 }} />
                        <div style={{ position: 'absolute', bottom: 16, left: 16, width: 40, height: 40, borderBottom: '3px solid rgba(236,72,153,0.3)', borderLeft: '3px solid rgba(236,72,153,0.3)', borderBottomLeftRadius: 8 }} />
                        <div style={{ position: 'absolute', bottom: 16, right: 16, width: 40, height: 40, borderBottom: '3px solid rgba(245,158,11,0.3)', borderRight: '3px solid rgba(245,158,11,0.3)', borderBottomRightRadius: 8 }} />
                    </div>
                </>
            )}

            {/* ── Header ── */}
            <div className="relative z-10" style={{ background: isLowPerf ? '#dc2626' : 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)', boxShadow: isLowPerf ? 'none' : '0 2px 16px rgba(220,38,38,0.25)' }}>
                {/* Header gold accent band */}
                <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #fbbf24, transparent)' }} />
                <div className="max-w-6xl mx-auto px-6 h-12 flex items-center justify-between">
                    {onBack ? (
                        <button onClick={onBack} className="flex items-center gap-1 text-white/70 hover:text-white transition-colors">
                            <ChevronLeft size={18} />
                            <span className="text-sm">返回</span>
                        </button>
                    ) : (
                        <a href={`/#/s/${storeId}`} className="flex items-center gap-1 text-white/70 hover:text-white transition-colors">
                            <ChevronLeft size={18} />
                            <span className="text-sm">返回</span>
                        </a>
                    )}
                    <div className="flex items-center gap-2">
                        <Star size={16} fill="#fbbf24" color="#fbbf24" />
                        <span className="font-black text-white text-base tracking-[0.2em]">体彩顶呱刮</span>
                        <Star size={16} fill="#fbbf24" color="#fbbf24" />
                    </div>
                    <span className="text-xs text-white/60 truncate max-w-[120px]">{storeConfig?.name}</span>
                </div>
            </div>

            {/* ── Content wrapper (full height, but children control width) ── */}
            <div className="relative z-10 flex-1 flex flex-col gap-4 py-4">

                {/* ── Row 1: Tier selector (top, max-width constrained) ── */}
                <div className="max-w-6xl mx-auto w-full px-6">
                    <div className={`flex items-center gap-1.5 rounded-2xl p-1.5 ${isLowPerf ? 'bg-white/85' : 'bg-white/55 backdrop-blur-xl'}`}
                        style={{
                            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 24px rgba(220,38,38,0.08), 0 0 0 1px rgba(255,255,255,0.6)',
                        }}>
                        {[10, 20, 30, 50].map(t => {
                            const meta = TIER_META[t];
                            const images = scratchData?.tiers?.[t]?.images || [];
                            const isSelected = selectedTier === t;
                            const hasImages = images.length > 0;
                            return (
                                <button
                                    key={t}
                                    onClick={() => { if (phase !== 'spinning') { setSelectedTier(t); setPhase('idle'); setWinnerImg(null); setLuckyNumber(null); setSpinTargetTx(0); } }}
                                    disabled={phase === 'spinning'}
                                    className="flex-1 py-2 rounded-xl font-bold text-xs transition-all duration-200 flex flex-col items-center gap-0.5"
                                    style={{
                                        background: isSelected ? `linear-gradient(135deg, ${meta.color}, ${meta.color}dd)` : 'transparent',
                                        color: isSelected ? '#fff' : hasImages ? '#555' : '#ccc',
                                        boxShadow: isSelected ? `0 3px 12px ${meta.glow}` : 'none',
                                    }}
                                >
                                    <span className="font-black text-sm">{t}元面值</span>
                                    <span className={`text-[10px] ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>
                                        {hasImages ? `整本${meta.maxCount}张` : '暂无票面'}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Row 2: Roulette area (flex-1, full-viewport-width roulette) ── */}
                <div className="flex-1 flex flex-col items-center justify-center gap-3">

                    {/* Decorative title banner above roulette */}
                    <div className="relative flex items-center gap-3">
                        <div style={{ width: 60, height: 1, background: `linear-gradient(to right, transparent, ${tierMeta.color})` }} />
                        <div className="flex items-center gap-2 px-5 py-1.5 rounded-full"
                            style={{
                                background: `linear-gradient(135deg, ${tierMeta.color}, ${tierMeta.color}cc)`,
                                boxShadow: `0 4px 14px ${tierMeta.glow}, inset 0 1px 0 rgba(255,255,255,0.3)`,
                            }}>
                            <Star size={13} fill="#fff" color="#fff" />
                            <span className="text-white font-black text-xs tracking-[0.25em]">幸运大转盘</span>
                            <Star size={13} fill="#fff" color="#fff" />
                        </div>
                        <div style={{ width: 60, height: 1, background: `linear-gradient(to left, transparent, ${tierMeta.color})` }} />
                    </div>

                    {/* Full-width roulette ribbon. NO mask-image (forces per-pixel alpha blending each frame).
                        Use opaque edge covers matching page background for zero-cost "fade". */}
                    <div className="relative w-full overflow-hidden"
                        style={{
                            height: `${CARD_H + 48}px`,
                            background: '#fff8ec',
                            borderTop: `2px solid ${tierMeta.color}50`,
                            borderBottom: `2px solid ${tierMeta.color}50`,
                            boxShadow: isLowPerf ? 'none' : `0 8px 28px ${tierMeta.glow.replace('0.45', '0.1')}`,
                        }}>

                        {/* Center indicator: semi-transparent pointer */}
                        <div className="absolute z-30 pointer-events-none" style={{ left: 'calc(50% - 16px)', top: -2 }}>
                            <div style={{
                                width: 0, height: 0,
                                borderLeft: '16px solid transparent',
                                borderRight: '16px solid transparent',
                                borderTop: `28px solid ${tierMeta.color}bb`,
                                filter: `drop-shadow(0 3px 6px ${tierMeta.glow})`,
                            }} />
                        </div>

                        {/* Empty state */}
                        {tierImages.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-300 flex-col gap-2">
                                <Package size={40} />
                                <p className="text-sm text-gray-400">此档位暂无可用票面</p>
                            </div>
                        )}

                        {/* ★ Unified strip. Idle: CSS keyframes animation (compositor thread, zero main-thread cost).
                            Spin/Result: inline transform + CSS transition (also compositor thread). */}
                        {tierImages.length > 0 && (
                            <div
                                ref={stripRef}
                                className="absolute top-0 left-0 h-full flex items-center"
                                style={{
                                    gap: CARD_GAP,
                                    paddingLeft: `calc(50vw - ${CARD_W / 2}px)`,
                                    paddingRight: `calc(50vw - ${CARD_W / 2}px)`,
                                    ...(phase === 'idle' && {
                                        animation: `scratchMarqueeKf ${MARQUEE_ROUND_S}s linear ${marqueeDelayS}s infinite`,
                                    }),
                                    ...(phase === 'result' && {
                                        transform: `translate3d(${spinTargetTx}px,0,0)`,
                                        transition: 'none',
                                    }),
                                    // Only promote to GPU layer while animating
                                    ...(phase !== 'result' && {
                                        willChange: 'transform',
                                        backfaceVisibility: 'hidden',
                                    }),
                                }}
                            >
                                {cardElements}
                            </div>
                        )}
                    </div>


                </div>

                {/* ── Row 3: Action button (bottom) ── */}
                <div className="flex flex-col items-center py-4">
                    <button
                        onClick={handleSpin}
                        disabled={phase === 'spinning' || tierImages.length === 0}
                        className="relative flex items-center justify-center transition-all active:scale-90 disabled:opacity-40 disabled:cursor-not-allowed"
                        style={{
                            width: 130,
                            height: 130,
                            borderRadius: '50%',
                            background: tierImages.length === 0 || phase === 'spinning'
                                ? 'linear-gradient(145deg, #ccc, #aaa)'
                                : `linear-gradient(145deg, ${tierMeta.color}, ${tierMeta.color}bb)`,
                            boxShadow: tierImages.length > 0 && phase !== 'spinning'
                                ? `0 8px 32px ${tierMeta.glow}, inset 0 2px 4px rgba(255,255,255,0.4), 0 0 0 5px rgba(255,255,255,0.35)` : 'inset 0 2px 4px rgba(255,255,255,0.2)',
                        }}
                    >
                        <div className="flex flex-col items-center">
                            <Zap size={28} className="text-white" fill="white" />
                            <span className="text-white font-black text-sm mt-1">
                                {phase === 'spinning' ? '抽选中' : '开始抽选'}
                            </span>
                        </div>
                    </button>
                </div>
            </div>

            {/* ── Full-screen result overlay ── */}
            {phase === 'result' && winnerImg && (
                <div className="fixed inset-0 z-50 flex flex-col items-center justify-center scratchFadeIn"
                    style={{ background: 'rgba(0,0,0,0.7)' }}>

                    {/* Enlarged ticket face */}
                    <div className="relative" style={{ maxWidth: '75vw', maxHeight: '55vh' }}>
                        <img
                            src={winnerImg.imageDataUrl || winnerImg.frontUrl || winnerImg.url}
                            alt={winnerImg.name}
                            decoding="async"
                            className="rounded-2xl object-contain"
                            style={{
                                maxWidth: '75vw',
                                maxHeight: '55vh',
                                border: `3px solid ${tierMeta.color}`,
                                borderRadius: 16,
                            }}
                        />
                    </div>

                    {/* Lucky number */}
                    <div className="mt-5 text-center">
                        <p className="text-white/60 text-sm font-semibold tracking-wide mb-2">本次抽取的幸运张数</p>
                        <div className="flex items-center justify-center gap-2">
                            <Star size={18} fill={tierMeta.color} color={tierMeta.color} />
                            <span className="text-5xl font-black leading-none" style={{ color: tierMeta.color, fontVariantNumeric: 'tabular-nums', textShadow: `0 0 24px ${tierMeta.glow}` }}>{luckyNumber}</span>
                            <Star size={18} fill={tierMeta.color} color={tierMeta.color} />
                        </div>
                    </div>
                    <p className="text-white/40 text-xs mt-2">{winnerImg.name} · 共 {tierMeta.maxCount} 张</p>

                    {/* 底部动作区：返回 */}
                    <div className="mt-6 flex items-center gap-3">
                        {/* Return button with countdown */}
                        <button
                            ref={countdownDisplayRef}
                            onClick={handleReset}
                            className="flex items-center gap-2 h-11 px-8 rounded-full text-white font-semibold text-sm transition-all active:scale-95"
                            style={{
                                background: `linear-gradient(135deg, ${tierMeta.color}, ${tierMeta.color}cc)`,
                                boxShadow: `0 4px 16px ${tierMeta.glow}`,
                            }}
                        >
                            返回 (10s)
                        </button>
                    </div>
                </div>
            )}


            <style>{`
        @keyframes scratchFadeInKf {
            from { opacity: 0; transform: translateY(8px); }
            to   { opacity: 1; transform: translateY(0); }
        }
        .scratchFadeIn { animation: scratchFadeInKf 0.4s ease-out forwards; }

        .scratchWinner {
            border: 3px solid ${tierMeta.color} !important;
            box-shadow: 0 0 0 2px ${tierMeta.color}, 0 8px 36px ${tierMeta.glow} !important;
            transform: scale(1.08) !important;
            transition: transform 0.5s cubic-bezier(.34,1.56,.64,1), border-color 0.3s, box-shadow 0.3s !important;
            z-index: 5 !important;
        }

        @keyframes scratchMarqueeKf {
            from { transform: translate3d(-${oneCycleWidth}px, 0, 0); }
            to   { transform: translate3d(-${2 * oneCycleWidth}px, 0, 0); }
        }
      `}</style>
        </div>
    );
}
