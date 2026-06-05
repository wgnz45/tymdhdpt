import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams } from 'react-router-dom';
import '../index.css';
import logoDlt from '../assets/logo_dlt.png';
import { ArrowLeft, Bug, X, Smartphone, RotateCcw, Maximize, Minimize } from 'lucide-react';
import { useStoreData } from '../hooks/useStoreData';
import { usePerformanceMode } from '../hooks/usePerformanceMode';
import { getHomePollingIntervalMs, getNoisePhaseIntervalMs } from '../utils/performanceConfig';

// --- Constants & Helper Functions ---
const RED_COUNT = 35;
const BLUE_COUNT = 12;

const calculatePrice = (reds, blues) => {
    const combination = (n, k) => {
        if (k < 0 || k > n) return 0;
        if (k === 0 || k === n) return 1;
        if (k > n / 2) k = n - k;
        let res = 1;
        for (let i = 1; i <= k; i++) {
            res = res * (n - i + 1) / i;
        }
        return res;
    };
    const redCombs = combination(reds.length, 5);
    const blueCombs = combination(blues.length, 2);
    return redCombs * blueCombs * 2;
};

const generateRandomNumbers = (total, count) => {
    const nums = new Set();
    while (nums.size < count) {
        nums.add(Math.floor(Math.random() * total) + 1);
    }
    return Array.from(nums).sort((a, b) => a - b);
};

// INITIAL MOCK DATA (With Real Full Precision Pool Data)
// INITIAL MOCK DATA moved to data.json


export default function Home({ onBack, onReady }) {
    const { storeId } = useParams();
    const navigate = useNavigate();
    const { storeData: centralStoreData, drawHistory: centralDrawHistory, notFound: centralNotFound } = useStoreData();
    const isLowPerf = usePerformanceMode();
    const [notFound, setNotFound] = useState(() => !!centralNotFound);
    const [isClosed, setIsClosed] = useState(() => centralStoreData?.status === 'closed');

    // ... (existing state) ...


    const [shareImage, setShareImage] = useState(null);
    const [qrCodeImage, setQrCodeImage] = useState(null);
    const isWeChat = /MicroMessenger/i.test(navigator.userAgent);

    const [tickets, setTickets] = useState([]);
    const [isRolling, setIsRolling] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [drawState, setDrawState] = useState({ activeReds: [], activeBlues: [], lockedReds: new Set(), lockedBlues: new Set() });
    const drawRef = useRef(drawState);
    const redGridRef = useRef(null);
    const blueGridRef = useRef(null);
    const activeReds = drawState.activeReds;
    const activeBlues = drawState.activeBlues;
    const lockedNumbers = { reds: drawState.lockedReds, blues: drawState.lockedBlues };
    const [scale, setScale] = useState(1);
    const [isMobile, setIsMobile] = useState(false);
    const [androidPadMode, setAndroidPadMode] = useState(false);
    const [animMode, setAnimMode] = useState('D'); // Animation scheme: D=instant
    const [padBaseHeight, setPadBaseHeight] = useState(1063);
    // Mobile Drawer State
    const [showHistory, setShowHistory] = useState(false);
    const [showFullHistory, setShowFullHistory] = useState(false);
    const [showTickets, setShowTickets] = useState(false);
    const [mobileTab, setMobileTab] = useState('regular'); // 'package' or 'regular'

    // Check if running in Native App (APK)
    // 用 window.Capacitor 全局对象代替静态 import，原生壳运行时会注入
    const isNativeApp = typeof window !== 'undefined'
        && window.Capacitor
        && window.Capacitor.isNativePlatform?.() === true;

    // Debug Config State
    const [showDebugModal, setShowDebugModal] = useState(false);

    // Persistence Setting
    const [persistDebugSettings, setPersistDebugSettings] = useState(() => {
        return localStorage.getItem('cj_debug_persist') !== 'false';
    });

    // Density Mode State (Persisted if allowed)
    const [isCompact, setIsCompact] = useState(() => {
        if (localStorage.getItem('cj_debug_persist') === 'false') return false;
        return localStorage.getItem('cj_density_compact') === 'true';
    });

    const [debugConfig, setDebugConfig] = useState(() => {
        if (localStorage.getItem('cj_debug_persist') === 'false') {
            return { scale: 1, orientation: 'default' };
        }
        try {
            const saved = localStorage.getItem('cj_debug_config');
            return saved ? JSON.parse(saved) : { scale: 1, orientation: 'default' };
        } catch (e) {
            return { scale: 1, orientation: 'default' };
        }
    });

    // Handle Persistence Side Effects
    useEffect(() => {
        localStorage.setItem('cj_debug_persist', String(persistDebugSettings));

        if (persistDebugSettings) {
            localStorage.setItem('cj_debug_config', JSON.stringify(debugConfig));
            localStorage.setItem('cj_density_compact', String(isCompact));
        } else {
            localStorage.removeItem('cj_debug_config');
            localStorage.removeItem('cj_density_compact');
        }
    }, [debugConfig, isCompact, persistDebugSettings]);

    const updateDebugConfig = (newPartial) => {
        setDebugConfig(prev => ({ ...prev, ...newPartial }));
    };

    // Complex Toggle State: 5 Reds then 5 Yellows
    const densitySequenceRef = useRef({ stage: 'idle', count: 0, lastTime: 0 });

    const handleRedClick = (e) => {
        e.stopPropagation();
        const now = Date.now();
        if (now - densitySequenceRef.current.lastTime > 2000) {
            // Reset if too slow
            densitySequenceRef.current = { stage: 'red_tapping', count: 1, lastTime: now };
            return;
        }

        if (densitySequenceRef.current.stage === 'red_tapping' || densitySequenceRef.current.stage === 'idle') {
            densitySequenceRef.current.lastTime = now;
            densitySequenceRef.current.stage = 'red_tapping';
            densitySequenceRef.current.count += 1;

            if (densitySequenceRef.current.count >= 5) {
                // Red phase complete, waiting for yellow
                densitySequenceRef.current.stage = 'waiting_for_yellow';
                densitySequenceRef.current.count = 0;
            }
        } else {
            // Wrong tap (tapping red while expecting yellow) -> Reset
            densitySequenceRef.current = { stage: 'red_tapping', count: 1, lastTime: now }; // Restart at red 1
        }
    };

    const handleYellowClick = (e) => {
        e.stopPropagation();
        const now = Date.now();
        if (now - densitySequenceRef.current.lastTime > 3000) {
            // Reset if too slow
            densitySequenceRef.current = { stage: 'idle', count: 0, lastTime: 0 };
            return;
        }

        if (densitySequenceRef.current.stage === 'waiting_for_yellow' || densitySequenceRef.current.stage === 'yellow_tapping') {
            densitySequenceRef.current.lastTime = now;
            densitySequenceRef.current.stage = 'yellow_tapping';
            densitySequenceRef.current.count += 1;

            if (densitySequenceRef.current.count >= 5) {
                // UNLOCKED!
                // Just Show Modal, DO NOT TOGGLE COMPACT MODE automatically
                setShowDebugModal(true);
                // Reset sequence
                densitySequenceRef.current = { stage: 'idle', count: 0, lastTime: 0 };
            }
        } else {
            // Tapped yellow too early or without clearing red -> Reset
            densitySequenceRef.current = { stage: 'idle', count: 0, lastTime: 0 };
        }
    };
    const [generationStatus, setGenerationStatus] = useState(''); // Text for current generation

    // Ticket Editing State
    const [editingTicketId, setEditingTicketId] = useState(null);
    const [editingBetIndex, setEditingBetIndex] = useState(null); // Index of bet being edited
    const [editState, setEditState] = useState({ reds: [], blues: [] }); // Current numbers in editor
    // Helper to compute drawData from centralDrawHistory (avoids flash of empty data)
    const computeDrawData = (cdh) => {
        if (!cdh?.games?.length) return null;
        const dltGame = cdh.games.find(g => g.key === 'dlt');
        const historyArray = dltGame ? dltGame.history : null;
        if (!historyArray || historyArray.length === 0) return null;
        const latestDraw = historyArray[0];
        const formatPool = (poolStr) => {
            if (!poolStr || poolStr === '--') return '0';
            return poolStr.toString().replace(/,/g, '');
        };
        const formatDate = (timeStr) => {
            if (!timeStr) return '';
            try {
                const d = new Date(timeStr);
                if (isNaN(d.getTime())) return timeStr;
                const month = (d.getMonth() + 1).toString().padStart(2, '0');
                const day = d.getDate().toString().padStart(2, '0');
                const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
                return `${month}月${day}日 ${days[d.getDay()]}`;
            } catch (e) { return timeStr; }
        };
        return {
            updateTime: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
            latest: {
                period: latestDraw.issue ? `第${latestDraw.issue.replace(/[^\d]/g, '')}期` : '',
                date: formatDate(latestDraw.date),
                reds: Array.isArray(latestDraw.numbers) ? latestDraw.numbers : (latestDraw.numbers || '').split(' ').filter(Boolean),
                blues: Array.isArray(latestDraw.bonusNumbers) ? latestDraw.bonusNumbers : (latestDraw.bonusNumbers || '').split(' ').filter(Boolean),
                pool: formatPool(latestDraw.pool),
                drawOrder: ''
            },
            history: historyArray.slice(1).map(g => ({
                period: g.issue ? `第${g.issue.replace(/[^\d]/g, '')}期` : '',
                date: formatDate(g.date),
                reds: Array.isArray(g.numbers) ? g.numbers : (g.numbers || '').split(' ').filter(Boolean),
                blues: Array.isArray(g.bonusNumbers) ? g.bonusNumbers : (g.bonusNumbers || '').split(' ').filter(Boolean)
            }))
        };
    };

    // Initialize drawData from context data (no flash)
    const [drawData, setDrawData] = useState(() => computeDrawData(centralDrawHistory) || {
        latest: {
            period: "加载中...",
            date: "",
            reds: [],
            blues: [],
            pool: "0",
            drawOrder: ""
        },
        history: []
    });

    const [storeConfig, setStoreConfig] = useState(() => centralStoreData || {
        name: '超级大乐透模拟',
        slogan: '快乐购彩！理性投注！',
        watermarkText: '幸运号码',
        theme: 'default',
        status: 'open'
    });


    const [showShareModal, setShowShareModal] = useState(false);
    const shareRef = useRef(null);

    // Hidden Admin Access
    const handleLogoClick = (e) => {
        if (e.detail === 3) { // Triple click
            window.location.href = `/#/s/${storeId || 'default'}/admin`;
        }
    };
    const handleBackToPortal = onBack || (() => navigate(`/s/${storeId || 'default'}`));

    // Sync data from unified store layer
    useEffect(() => {
        setNotFound(!!centralNotFound);
    }, [centralNotFound]);

    useEffect(() => {
        if (centralStoreData && centralStoreData.name) {
            setStoreConfig(centralStoreData);
            setIsClosed(centralStoreData.status === 'closed');
        }
    }, [centralStoreData]);

    useEffect(() => {
        const computed = computeDrawData(centralDrawHistory);
        if (computed) setDrawData(computed);
    }, [centralDrawHistory]);




    // --- Derived State for Next Draw (Betting Period) ---
    const nextPeriodStr = (() => {
        const currentStr = drawData.latest.period;
        const num = parseInt(currentStr.replace(/[^\d]/g, ''), 10);
        return isNaN(num) ? currentStr : `第${num + 1}期`;
    })();

    const nextDateStr = (() => {
        try {
            const dateStr = drawData.latest.date; // "01月21日 周三"
            const match = dateStr.match(/(\d+)月(\d+)日/);
            if (!match) return "";

            const month = parseInt(match[1], 10) - 1;
            const day = parseInt(match[2], 10);
            const year = new Date().getFullYear(); // Assume current year

            const date = new Date(year, month, day);
            const dayOfWeek = date.getDay(); // 0-6

            let addDays = 1;
            // Mon(1)->Wed(+2), Wed(3)->Sat(+3), Sat(6)->Mon(+2)
            if (dayOfWeek === 1) addDays = 2;
            else if (dayOfWeek === 3) addDays = 3;
            else if (dayOfWeek === 6) addDays = 2;

            date.setDate(date.getDate() + addDays);

            const m = (date.getMonth() + 1).toString().padStart(2, '0');
            const d = date.getDate().toString().padStart(2, '0');
            const w = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()];

            return `${m}月${d}日 ${w}`;
        } catch (e) {
            return "";
        }
    })();

    // Swipe Logic State
    const [touchStart, setTouchStart] = useState(null);
    const [touchEnd, setTouchEnd] = useState(null);

    const minSwipeDistance = 50;

    const onTouchStart = (e) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);

    const onSwipeCloseHistory = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;
        // Drawer is on Right. Closing means sliding to Right (Left-to-Right swipe).
        if (isRightSwipe) setShowHistory(false);
    };

    const onSwipeCloseTickets = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isRightSwipe = distance < -minSwipeDistance;
        if (isRightSwipe) setShowTickets(false);
    };

    const baseWidthDesktop = 1700;
    const baseHeightDesktop = 850;
    const baseWidthPad = 1700;
    const baseWidth = androidPadMode ? baseWidthPad : baseWidthDesktop;
    const baseHeight = androidPadMode ? padBaseHeight : baseHeightDesktop;
    const panelLeftWidth = androidPadMode ? 320 : 380;
    const panelRightWidth = androidPadMode ? 320 : 400;
    const padMarginX = androidPadMode ? 20 : 0;
    const padMarginY = androidPadMode ? 20 : 0;
    const padGreenBarStyle = androidPadMode ? { boxShadow: 'none', border: 'none', outline: 'none' } : undefined;
    const padOrangeBarStyle = androidPadMode ? { boxShadow: 'none', border: 'none', outline: 'none' } : undefined;

    const rollIntervalRef = useRef(null);
    const countdownIntervalRef = useRef(null);

    useEffect(() => {
        // 1. Resize Handler
        const handleResize = () => {
            const vh = window.innerHeight;
            const vw = window.innerWidth;
            const isAndroidUA = /Android/i.test(navigator.userAgent || '');
            const isTabletSize = Math.min(vw, vh) >= 600;
            const isAndroidPad = isAndroidUA && isTabletSize;
            setAndroidPadMode(isAndroidPad);
            const margin = 40;
            const baseW = isAndroidPad ? baseWidthPad : baseWidthDesktop;
            const screenRatio = vw / vh;
            const availableW = Math.max(0, vw - margin);
            const availableH = Math.max(0, vh - margin);
            const ratioForPad = availableW > 0 && availableH > 0 ? availableW / availableH : screenRatio;
            const computedPadBaseHeight = Math.max(850, Math.round(baseWidthPad / ratioForPad));
            if (isAndroidPad) {
                setPadBaseHeight(computedPadBaseHeight);
            }
            const baseH = isAndroidPad ? computedPadBaseHeight : baseHeightDesktop;
            const scaleH = availableH / baseH;
            const scaleW = availableW / baseW;
            const newScale = isAndroidPad
                ? Math.min(scaleW, 1.25)
                : Math.min(scaleH, scaleW, 1.25);

            const mobile = vw < 1024; // Mobile threshold
            setIsMobile(mobile);

            if (!mobile) {
                setScale(Math.max(newScale, 0.6));
            } else {
                setScale(1); // No scaling on mobile
            }
        };
        window.addEventListener('resize', handleResize);
        handleResize();

        // 2. Data Fetching (only used as fallback when centralDrawHistory is unavailable)
        const fetchData = async () => {
            // Skip data.json if centralDrawHistory already provides fresh data
            if (centralDrawHistory?.games?.length) return;
            try {
                const res = await fetch('/data.json');
                if (res.ok) {
                    const data = await res.json();
                    if (data?.latest?.period && !data.latest.period.startsWith('第')) {
                        data.latest.period = `第${data.latest.period.replace(/[^\d]/g, '')}期`;
                    }
                    if (data?.history) {
                        data.history = data.history.map(h => ({
                            ...h,
                            period: (h.period && !h.period.startsWith('第')) ? `第${h.period.replace(/[^\d]/g, '')}期` : h.period
                        }));
                    }
                    setDrawData(data);
                }
            } catch (error) {
                console.error("Failed to fetch lottery data:", error);
            }
        };

        // Context 已提供首屏开奖数据，这里只保留后续轮询，避免首次打开重复请求和二次渲染
        if (!centralDrawHistory?.games?.length) {
            fetchData();
        }

        // Polling every 3 minutes (box mode) — visibility-aware
        const pollMs = getHomePollingIntervalMs({ isBoxMode: true });
        let pollInterval = setInterval(fetchData, pollMs);
        const onVis = () => {
            if (document.visibilityState === 'visible') {
                fetchData();
                pollInterval = setInterval(fetchData, pollMs);
            } else {
                clearInterval(pollInterval);
            }
        };
        document.addEventListener('visibilitychange', onVis);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearInterval(pollInterval);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, []);

    // Lock Scroll when Mobile Drawer is Open




    // --- Animation & Logic Control ---

    // Direct DOM ball updater — bypasses React entirely (zero re-renders)
    const applyBallsDom = (lockedR, lockedB, noiseR, noiseB) => {
        const rGrid = redGridRef.current;
        const bGrid = blueGridRef.current;
        if (!rGrid || !bGrid) return;
        const sizeR = isMobile ? (isCompact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm') : (androidPadMode ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base');
        const sizeB = sizeR;
        const baseR = `ball-red shadow-sm flex items-center justify-center font-bold transition-none ${sizeR}`;
        const baseB = `ball-blue shadow-sm flex items-center justify-center font-bold transition-none ${sizeB}`;
        const lockedRSet = new Set(lockedR);
        const lockedBSet = new Set(lockedB);
        const noiseRSet = new Set(noiseR);
        const noiseBSet = new Set(noiseB);
        for (let i = 0; i < rGrid.children.length; i++) {
            const n = i + 1;
            if (lockedRSet.has(n)) rGrid.children[i].className = baseR + ' ball-red-active';
            else if (noiseRSet.has(n)) rGrid.children[i].className = baseR + ' ball-red-flash';
            else rGrid.children[i].className = baseR + ' opacity-40 scale-90 grayscale-[0.3]';
        }
        for (let i = 0; i < bGrid.children.length; i++) {
            const n = i + 1;
            if (lockedBSet.has(n)) bGrid.children[i].className = baseB + ' ball-blue-active';
            else if (noiseBSet.has(n)) bGrid.children[i].className = baseB + ' ball-blue-flash';
            else bGrid.children[i].className = baseB + ' opacity-40 scale-90 grayscale-[0.3]';
        }
    };

    // Android fast path: hide grids → swap classes while invisible → fade in
    const showBallsInstant = async (targetReds, targetBlues, { holdMs = 300, syncState = true } = {}) => {
        const rGrid = redGridRef.current;
        const bGrid = blueGridRef.current;
        if (!rGrid || !bGrid) return;
        const sizeClass = isMobile ? (isCompact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm') : 'w-8 h-8 text-sm';
        const baseR = `ball-red shadow-sm flex items-center justify-center font-bold transition-none ${sizeClass}`;
        const baseB = `ball-blue shadow-sm flex items-center justify-center font-bold transition-none ${sizeClass}`;
        const dimR = baseR + ' opacity-40 scale-90 grayscale-[0.3]';
        const dimB = baseB + ' opacity-40 scale-90 grayscale-[0.3]';

        // Step 1: Hide grids instantly
        rGrid.style.opacity = '0';
        bGrid.style.opacity = '0';

        // Step 2: Swap all ball classes while invisible (no visual jank)
        for (let i = 0; i < rGrid.children.length; i++) {
            rGrid.children[i].className = targetReds.includes(i + 1) ? baseR + ' ball-red-active' : dimR;
        }
        for (let i = 0; i < bGrid.children.length; i++) {
            bGrid.children[i].className = targetBlues.includes(i + 1) ? baseB + ' ball-blue-active' : dimB;
        }

        // Step 3: Let class changes settle before transition
        await new Promise(r => setTimeout(r, 20));

        // Step 4: Fade grids back in (GPU-composited opacity)
        rGrid.style.transition = 'opacity 0.15s ease-out';
        bGrid.style.transition = 'opacity 0.15s ease-out';
        rGrid.style.opacity = '1';
        bGrid.style.opacity = '1';

        // Step 5: Hold for display time
        await new Promise(r => setTimeout(r, holdMs));

        // Step 6: Clean up inline styles
        rGrid.style.transition = '';
        bGrid.style.transition = '';

        // Sync React state (skip during batch loops to avoid queued re-renders)
        if (syncState) {
            const final = { activeReds: targetReds, activeBlues: targetBlues, lockedReds: new Set(targetReds), lockedBlues: new Set(targetBlues) };
            drawRef.current = final;
            setDrawState(final);
        }
    };

    const runDrawSequence = async (targetReds, targetBlues, totalDuration = 2000, withCountdown = false) => {
        return new Promise(async (resolve) => {
            const safeDuration = (Number.isFinite(totalDuration) && totalDuration >= 0) ? totalDuration : 2000;

            // Reset ALL draw state (clear previous round completely)
            const resetState = { activeReds: [], activeBlues: [], lockedReds: new Set(), lockedBlues: new Set() };
            drawRef.current = resetState;
            setDrawState(resetState);

            const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
            const revealReds = shuffle(targetReds);
            const revealBlues = shuffle(targetBlues);

            const totalSteps = targetReds.length + targetBlues.length;
            const stepDuration = safeDuration / (totalSteps || 1);

            const useDomDirect = androidPadMode && redGridRef.current && blueGridRef.current;

            if (useDomDirect) {
                // ===== ANDROID: 4 selectable animation schemes =====
                const rGrid = redGridRef.current;
                const bGrid = blueGridRef.current;
                const sizeClass = isMobile ? (isCompact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm') : 'w-8 h-8 text-sm';
                const baseR = `ball-red shadow-sm flex items-center justify-center font-bold transition-none ${sizeClass}`;
                const baseB = `ball-blue shadow-sm flex items-center justify-center font-bold transition-none ${sizeClass}`;
                const dimR = baseR + ' opacity-40 scale-90 grayscale-[0.3]';
                const dimB = baseB + ' opacity-40 scale-90 grayscale-[0.3]';

                // Helper: dim all balls
                const dimAll = () => {
                    for (let i = 0; i < rGrid.children.length; i++) rGrid.children[i].className = dimR;
                    for (let i = 0; i < bGrid.children.length; i++) bGrid.children[i].className = dimB;
                };

                if (withCountdown) setCountdown(Math.ceil(totalDuration / 1000));

                if (animMode === 'A') {
                    // --- Scheme A: Scan light + Pop ---
                    dimAll();
                    rGrid.classList.add('ball-grid-scanning');
                    bGrid.classList.add('ball-grid-scanning');
                    for (const num of revealReds) {
                        await new Promise(r => setTimeout(r, stepDuration));
                        rGrid.children[num - 1].className = baseR + ' ball-red-active ball-pop-in';
                    }
                    for (const num of revealBlues) {
                        await new Promise(r => setTimeout(r, stepDuration));
                        bGrid.children[num - 1].className = baseB + ' ball-blue-active ball-pop-in';
                    }
                    rGrid.classList.remove('ball-grid-scanning');
                    bGrid.classList.remove('ball-grid-scanning');

                } else if (animMode === 'B') {
                    // --- Scheme B: Breathe + Fade-pop ---
                    dimAll();
                    rGrid.classList.add('ball-grid-breathe');
                    bGrid.classList.add('ball-grid-breathe');
                    for (const num of revealReds) {
                        await new Promise(r => setTimeout(r, stepDuration));
                        rGrid.children[num - 1].className = baseR + ' ball-red-active ball-fade-in';
                    }
                    for (const num of revealBlues) {
                        await new Promise(r => setTimeout(r, stepDuration));
                        bGrid.children[num - 1].className = baseB + ' ball-blue-active ball-fade-in';
                    }
                    rGrid.classList.remove('ball-grid-breathe');
                    bGrid.classList.remove('ball-grid-breathe');

                } else if (animMode === 'C') {
                    // --- Scheme C: Roulette spotlight ---
                    dimAll();
                    const allBalls = [...revealReds.map(n => ({ n, color: 'r' })), ...revealBlues.map(n => ({ n, color: 'b' }))];
                    for (const target of allBalls) {
                        const grid = target.color === 'r' ? rGrid : bGrid;
                        const base = target.color === 'r' ? baseR : baseB;
                        const activeClass = target.color === 'r' ? 'ball-red-active' : 'ball-blue-active';
                        const count = target.color === 'r' ? RED_COUNT : BLUE_COUNT;
                        // Spin through ~8 random balls then land on target
                        const spinCount = 8;
                        const spinDelay = Math.max(20, (stepDuration - 80) / spinCount);
                        let prevIdx = -1;
                        for (let s = 0; s < spinCount; s++) {
                            const rndIdx = Math.floor(Math.random() * count);
                            if (prevIdx >= 0) grid.children[prevIdx].className = target.color === 'r' ? dimR : dimB;
                            grid.children[rndIdx].className = base + ' ball-spotlight';
                            prevIdx = rndIdx;
                            await new Promise(r => setTimeout(r, spinDelay));
                        }
                        if (prevIdx >= 0) grid.children[prevIdx].className = target.color === 'r' ? dimR : dimB;
                        // Lock target
                        grid.children[target.n - 1].className = base + ' ' + activeClass + ' ball-pop-in';
                    }

                } else if (animMode === 'D') {
                    // --- Scheme D: Instant + container fade ---
                    // Set all target balls active immediately
                    for (let i = 0; i < rGrid.children.length; i++) {
                        const n = i + 1;
                        rGrid.children[i].className = targetReds.includes(n) ? baseR + ' ball-red-active' : dimR;
                    }
                    for (let i = 0; i < bGrid.children.length; i++) {
                        const n = i + 1;
                        bGrid.children[i].className = targetBlues.includes(n) ? baseB + ' ball-blue-active' : dimB;
                    }
                    // Fade in entire grids
                    rGrid.style.opacity = '0';
                    bGrid.style.opacity = '0';
                    rGrid.classList.add('ball-grid-fade-in');
                    bGrid.classList.add('ball-grid-fade-in');
                    await new Promise(r => setTimeout(r, 500));
                    rGrid.classList.remove('ball-grid-fade-in');
                    bGrid.classList.remove('ball-grid-fade-in');
                    rGrid.style.opacity = '';
                    bGrid.style.opacity = '';
                }

                if (withCountdown) setCountdown(0);

                // Sync React state once at the end
                const final = { activeReds: targetReds, activeBlues: targetBlues, lockedReds: new Set(targetReds), lockedBlues: new Set(targetBlues) };
                drawRef.current = final;
                setDrawState(final);
                await new Promise(r => setTimeout(r, 150));
                resolve();

            } else {
                // ===== DESKTOP: React state-based noise + reveal =====
                const currentLockedReds = [];
                const currentLockedBlues = [];

                const noisePhase = (duration) => new Promise(r => {
                    if (duration < 20) return r();
                    let raf = null;
                    let last = 0;
                    const frameMs = getNoisePhaseIntervalMs({ isBoxMode: true });
                    const tick = (ts) => {
                        if (ts - last >= frameMs) {
                            last = ts;
                            const noiseR = generateRandomNumbers(RED_COUNT, 15);
                            const noiseB = generateRandomNumbers(BLUE_COUNT, 6);
                            const merged = {
                                ...drawRef.current,
                                activeReds: [...new Set([...currentLockedReds, ...noiseR])],
                                activeBlues: [...new Set([...currentLockedBlues, ...noiseB])],
                            };
                            drawRef.current = merged;
                            setDrawState(merged);
                        }
                        raf = requestAnimationFrame(tick);
                    };
                    raf = requestAnimationFrame(tick);
                    setTimeout(() => { cancelAnimationFrame(raf); r(); }, duration);
                });

                if (withCountdown) setCountdown(Math.ceil(totalDuration / 1000));

                for (const num of revealReds) {
                    await noisePhase(stepDuration);
                    currentLockedReds.push(num);
                    const sR = { ...drawRef.current, lockedReds: new Set([...drawRef.current.lockedReds, num]) };
                    drawRef.current = sR;
                    setDrawState(sR);
                }

                for (const num of revealBlues) {
                    await noisePhase(stepDuration);
                    currentLockedBlues.push(num);
                    const sB = { ...drawRef.current, lockedBlues: new Set([...drawRef.current.lockedBlues, num]) };
                    drawRef.current = sB;
                    setDrawState(sB);
                }

                if (withCountdown) setCountdown(0);

                const final = { activeReds: targetReds, activeBlues: targetBlues, lockedReds: new Set(targetReds), lockedBlues: new Set(targetBlues) };
                drawRef.current = final;
                setDrawState(final);
                await new Promise(r => setTimeout(r, 200));
                resolve();
            }
        });
    };

    const SelectionOverlay = () => androidPadMode ? (
        <div className="absolute inset-0 z-50 flex items-center justify-center rounded-xl bg-white/80">
            <span className="text-red-500 font-bold text-sm">选号中...</span>
        </div>
    ) : (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center rounded-xl overflow-hidden">
            <div className={`absolute inset-0 bg-white/40 transition-all duration-300 ${isLowPerf ? '' : 'backdrop-blur-sm'}`}></div>
            <div className="relative z-10 flex flex-col items-center">
                <div className="relative mb-3">
                    <div className="absolute inset-0 bg-red-500 rounded-full blur-lg opacity-40 animate-ping"></div>
                    <div className="relative w-14 h-14 bg-gradient-to-tr from-red-500 to-yellow-500 rounded-full flex items-center justify-center shadow-xl ring-4 ring-white animate-spin-slow">
                        <i className="fa-solid fa-star text-2xl text-white"></i>
                    </div>
                </div>
                <div className="text-red-600 font-black text-lg tracking-widest drop-shadow-sm">
                    选号中...
                </div>
                <div className="text-orange-600 text-[10px] font-bold mt-1 bg-yellow-100/90 px-3 py-1 rounded-full shadow-sm flex items-center gap-1 animate-pulse">
                    <i className="fa-solid fa-bolt text-yellow-500"></i>
                    <span>好运正在加载</span>
                </div>
            </div>
        </div>
    );

    const executeBetSequence = async (sequenceFn) => {
        if (isRolling) return;
        setIsRolling(true);

        try {
            // Execute the passed sequence logic
            await sequenceFn();
        } catch (e) {
            console.error("Bet Sequence Error:", e);
        } finally {
            setIsRolling(false);
        }
    };

    const handleRegularBet = (name, redCount, blueCount) => {
        executeBetSequence(async () => {
            // [TRACKING] Click Track (Regular)
            const rCombs = calculatePrice(Array(redCount), Array(blueCount)) / 2;
            fetch('/api/track/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: storeId || 'default', type: 'regular', count: rCombs })
            }).catch(e => console.error(e));

            const reds = generateRandomNumbers(RED_COUNT, redCount);
            const blues = generateRandomNumbers(BLUE_COUNT, blueCount);
            const price = calculatePrice(reds, blues);

            if (androidPadMode && redGridRef.current && blueGridRef.current) {
                // Android fast path: instant display (~300ms)
                await showBallsInstant(reds, blues);
            } else {
                const animTime = parseInt(storeConfig.animationDuration) || 5000;
                await runDrawSequence(reds, blues, animTime);
            }

            setTickets(prev => [{ id: Date.now(), type: name, bets: [{ reds, blues }], price, tag: '常规', locked: false }, ...prev]);
        });
    };

    const handleBatchBet = (count) => {
        executeBetSequence(async () => {
            // [TRACKING] Click Track (Batch)
            fetch('/api/track/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: storeId || 'default', type: 'regular', count: count })
            }).catch(e => console.error(e));

            const batchId = Date.now();

            if (androidPadMode && redGridRef.current && blueGridRef.current) {
                // Android fast path: generate all upfront, display each sequentially
                const allBets = [];
                for (let i = 0; i < count; i++) {
                    allBets.push({ reds: generateRandomNumbers(RED_COUNT, 5), blues: generateRandomNumbers(BLUE_COUNT, 2) });
                }
                // Show each bet's balls one by one (no React state sync during loop)
                for (let i = 0; i < allBets.length; i++) {
                    const isLast = i === allBets.length - 1;
                    await showBallsInstant(allBets[i].reds, allBets[i].blues, { holdMs: 300, syncState: false });
                }
                // Sync React state + add all tickets in one batch
                const last = allBets[allBets.length - 1];
                const final = { activeReds: last.reds, activeBlues: last.blues, lockedReds: new Set(last.reds), lockedBlues: new Set(last.blues) };
                drawRef.current = final;
                setDrawState(final);
                setTickets(prev => [{ id: batchId, type: `单式${count}注`, bets: allBets, price: count * 2, tag: '常规', locked: false }, ...prev]);
            } else {
                // Desktop: original per-bet animation
                for (let i = 0; i < count; i++) {
                    const reds = generateRandomNumbers(RED_COUNT, 5);
                    const blues = generateRandomNumbers(BLUE_COUNT, 2);
                    const animTime = parseInt(storeConfig.animationDuration) || 5000;
                    await runDrawSequence(reds, blues, animTime);

                    setTickets(prev => {
                        const existingIndex = prev.findIndex(t => t.id === batchId);
                        if (existingIndex >= 0) {
                            const newTickets = [...prev];
                            const existing = newTickets[existingIndex];
                            newTickets[existingIndex] = { ...existing, bets: [...existing.bets, { reds, blues }], price: existing.price + 2 };
                            return newTickets;
                        } else {
                            return [{ id: batchId, type: `单式${count}注`, bets: [{ reds, blues }], price: 2, tag: '常规', locked: false }, ...prev];
                        }
                    });
                    if (i < count - 1) await new Promise(r => setTimeout(r, 100));
                }
            }
        });
    };

    const handlePackageBet = (pkgName, items) => {
        executeBetSequence(async () => {
            const packageId = Date.now();

            // [TRACKING] Click Track (Package)
            let totalPackageBets = 0;
            items.forEach(item => {
                if (item.type === '单式') totalPackageBets += item.count;
                else {
                    const rCombs = calculatePrice(Array(item.r), Array(item.b)) / 2;
                    totalPackageBets += (rCombs * item.count);
                }
            });
            fetch('/api/track/click', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ storeId: storeId || 'default', type: 'package', count: totalPackageBets })
            }).catch(e => console.error(e));

            if (androidPadMode && redGridRef.current && blueGridRef.current) {
                // ===== ANDROID FAST PATH: generate all upfront, display each sequentially =====
                const allBets = [];
                let totalPrice = 0;
                for (const item of items) {
                    const currentCount = item.count || 1;
                    for (let i = 0; i < currentCount; i++) {
                        if (item.type === 'batch') {
                            const reds = generateRandomNumbers(RED_COUNT, 5);
                            const blues = generateRandomNumbers(BLUE_COUNT, 2);
                            allBets.push({ reds, blues });
                            totalPrice += 2;
                        } else {
                            const reds = generateRandomNumbers(RED_COUNT, item.r);
                            const blues = generateRandomNumbers(BLUE_COUNT, item.b);
                            allBets.push({ reds, blues });
                            totalPrice += calculatePrice(reds, blues);
                        }
                    }
                }
                // Show each bet's balls one by one (no React state sync during loop)
                for (let i = 0; i < allBets.length; i++) {
                    const isLast = i === allBets.length - 1;
                    await showBallsInstant(allBets[i].reds, allBets[i].blues, { holdMs: 300, syncState: false });
                }
                // Sync React state + add all tickets in one batch
                const last = allBets[allBets.length - 1];
                const final = { activeReds: last.reds, activeBlues: last.blues, lockedReds: new Set(last.reds), lockedBlues: new Set(last.blues) };
                drawRef.current = final;
                setDrawState(final);
                setTickets(prev => [{ id: packageId, type: pkgName, bets: allBets, price: totalPrice, tag: '套餐', locked: false }, ...prev]);

            } else {
                // ===== DESKTOP: original per-bet animation =====
                const maxDuration = parseInt(storeConfig.packageDuration) || 30000;
                const STANDARD_TIME = 2000;
                const totalTickets = items.reduce((acc, item) => acc + (item.count || 1), 0);
                const totalNeeded = totalTickets * STANDARD_TIME;
                let timePerTicket = STANDARD_TIME;
                if (totalNeeded > maxDuration) timePerTicket = Math.floor(maxDuration / (totalTickets || 1));
                timePerTicket = Math.max(200, timePerTicket);

                setGenerationStatus('');
                let globalIndex = 0;
                const totalItems = totalTickets;
                const animTime = timePerTicket;

                for (const item of items) {
                    const currentCount = item.count || 1;
                    if (item.type === 'batch') {
                        for (let i = 0; i < currentCount; i++) {
                            globalIndex++;
                            setGenerationStatus(`正在生成：${pkgName} (${globalIndex}/${totalItems}注)`);
                            const reds = generateRandomNumbers(RED_COUNT, 5);
                            const blues = generateRandomNumbers(BLUE_COUNT, 2);
                            await runDrawSequence(reds, blues, animTime);
                            setTickets(prev => {
                                const idx = prev.findIndex(t => t.id === packageId);
                                if (idx >= 0) {
                                    const copy = [...prev];
                                    copy[idx] = { ...copy[idx], bets: [...copy[idx].bets, { reds: [...reds], blues: [...blues] }], price: copy[idx].price + 2 };
                                    return copy;
                                } else {
                                    return [{ id: packageId, type: pkgName, bets: [{ reds: [...reds], blues: [...blues] }], price: 2, tag: '套餐', locked: false }, ...prev];
                                }
                            });
                            await new Promise(r => setTimeout(r, 50));
                        }
                    } else {
                        for (let i = 0; i < currentCount; i++) {
                            globalIndex++;
                            setGenerationStatus(`正在生成：${pkgName} (${globalIndex}/${totalItems}注)`);
                            const reds = generateRandomNumbers(RED_COUNT, item.r);
                            const blues = generateRandomNumbers(BLUE_COUNT, item.b);
                            await runDrawSequence(reds, blues, animTime);
                            const price = calculatePrice(reds, blues);
                            setTickets(prev => {
                                const idx = prev.findIndex(t => t.id === packageId);
                                if (idx >= 0) {
                                    const copy = [...prev];
                                    copy[idx] = { ...copy[idx], bets: [...copy[idx].bets, { reds: [...reds], blues: [...blues] }], price: copy[idx].price + price };
                                    return copy;
                                } else {
                                    return [{ id: packageId, type: pkgName, bets: [{ reds: [...reds], blues: [...blues] }], price, tag: '套餐', locked: false }, ...prev];
                                }
                            });
                            await new Promise(r => setTimeout(r, 50));
                        }
                    }
                }
                setGenerationStatus('');
            }
        });
    };

    // --- Ticket Editing Logic ---
    const checkConfigExists = (rCount, bCount) => {
        if (!storeConfig.gameConfig || !storeConfig.gameConfig.regulars) return false;
        // Also allow minimum standard 5+2 even if not explicitly configured? 
        // User requested strict "If have -> change". So strict check against config.
        return storeConfig.gameConfig.regulars.some(item => item.params.r === rCount && item.params.b === bCount);
    };

    const handleEnterEditMode = (ticketId) => {
        if (isRolling) return;
        const ticket = tickets.find(t => t.id === ticketId);
        if (!ticket) return;

        if (ticket.locked) {
            alert('该彩票已锁定，请先解锁后再修改！');
            return;
        }

        if (ticketId === editingTicketId) {
            // Toggle off
            setEditingTicketId(null);
            setEditingBetIndex(null);
        } else {
            setEditingTicketId(ticketId);
            setEditingBetIndex(null);
        }
    };

    const handleSelectBetToEdit = (ticket, betIndex) => {
        if (isRolling) return;
        if (editingBetIndex === betIndex) return; // Already editing this one
        const bet = ticket.bets ? ticket.bets[betIndex] : { reds: ticket.reds, blues: ticket.blues }; // Handling fallback format
        setEditingBetIndex(betIndex);
        setEditState({
            reds: [...bet.reds],
            blues: [...bet.blues]
        });
    };

    const handleCloseEditor = () => {
        setEditingBetIndex(null);
        setEditState({ reds: [], blues: [] });
    };

    const handleEditNumber = (ticket, type, number) => {
        const isPackage = ticket.tag === '套餐';
        const currentReds = [...editState.reds];
        const currentBlues = [...editState.blues];

        if (type === 'red') {
            if (currentReds.includes(number)) {
                // Remove
                setEditState(prev => ({ ...prev, reds: prev.reds.filter(n => n !== number) }));
            } else {
                // Add
                if (isPackage) {
                    // Package: Strict limit
                    const bet = ticket.bets ? ticket.bets[editingBetIndex] : { reds: ticket.reds, blues: ticket.blues };
                    if (currentReds.length >= bet.reds.length) {
                        alert('套餐票无法增加红球数量，请先取消一个已选红球。');
                        return;
                    }
                    setEditState(prev => ({ ...prev, reds: [...prev.reds, number].sort((a, b) => a - b) }));
                } else {
                    // Regular: Allow add freely (Validation on Save)
                    // Limit to reasonable max (e.g. 20) to prevent UI breakage
                    if (currentReds.length < 25) {
                        setEditState(prev => ({ ...prev, reds: [...prev.reds, number].sort((a, b) => a - b) }));
                    } else {
                        alert('红球数量过多！');
                    }
                }
            }
        } else {
            // BLUE Logic
            if (currentBlues.includes(number)) {
                setEditState(prev => ({ ...prev, blues: prev.blues.filter(n => n !== number) }));
            } else {
                if (isPackage) {
                    const bet = ticket.bets ? ticket.bets[editingBetIndex] : { reds: ticket.reds, blues: ticket.blues };
                    if (currentBlues.length >= bet.blues.length) {
                        alert('套餐票无法增加蓝球数量，请先取消一个已选蓝球。');
                        return;
                    }
                    setEditState(prev => ({ ...prev, blues: [...prev.blues, number].sort((a, b) => a - b) }));
                } else {
                    // Regular: Allow add freely
                    if (currentBlues.length < 12) {
                        setEditState(prev => ({ ...prev, blues: [...prev.blues, number].sort((a, b) => a - b) }));
                    } else {
                        alert('蓝球数量过多！');
                    }
                }
            }
        }
    };

    const handleSaveEdit = (ticket) => {
        const rCount = editState.reds.length;
        const bCount = editState.blues.length;
        let newLabel = ticket.type; // Default to old type

        if (ticket.tag === '套餐') {
            const bet = ticket.bets ? ticket.bets[editingBetIndex] : { reds: ticket.reds, blues: ticket.blues };
            if (rCount !== bet.reds.length || bCount !== bet.blues.length) {
                alert('套餐票修改必须保持原有的红球和蓝球数量！');
                return;
            }
        } else {
            // Regular: Find Config to get Label
            const configItem = storeConfig.gameConfig.regulars ? storeConfig.gameConfig.regulars.find(item => item.params.r === rCount && item.params.b === bCount) : null;

            if (!configItem) {
                if (rCount < 5 || bCount < 2) {
                    alert('红蓝球数量不足，无法保存（最少5+2）！');
                } else {
                    alert('当前组合不在站点配置范围内，无法保存！');
                }
                return;
            }

            // Found Config! Update type if it is a single-bet ticket (or if logic allows)
            // If ticket.bets is null OR length is 1, we update the title to match the new config.
            if (!ticket.bets || ticket.bets.length === 1) {
                newLabel = configItem.label;
            }
        }

        // Calculate Price for this single bet row
        const newBetPrice = calculatePrice(editState.reds, editState.blues);

        setTickets(prev => prev.map(t => {
            if (t.id === ticket.id) {
                let newBets;
                let newTotalPrice = 0;

                if (t.bets) {
                    newBets = [...t.bets];
                    newBets[editingBetIndex] = {
                        reds: editState.reds,
                        blues: editState.blues
                    };
                    // Recalculate total ticket price
                    newBets.forEach(b => {
                        newTotalPrice += calculatePrice(b.reds, b.blues);
                    });
                } else {
                    // Fallback
                    newBets = null;
                    newTotalPrice = newBetPrice;
                }

                if (newBets) {
                    return { ...t, bets: newBets, price: newTotalPrice, type: newLabel };
                } else {
                    return { ...t, reds: editState.reds, blues: editState.blues, price: newTotalPrice, type: newLabel };
                }
            }
            return t;
        }));

        setEditingBetIndex(null); // Close editor
    };

    const toggleLock = (id) => {
        if (isRolling) return;
        if (editingTicketId === id) {
            alert('正在编辑中，无法锁定状态。请先完成或取消编辑！');
            return;
        }
        setTickets(prev => prev.map(t => t.id === id ? { ...t, locked: !t.locked } : t));
    };

    const deleteTicket = (id) => {
        if (isRolling) return;
        const ticket = tickets.find(t => t.id === id);
        if (!ticket) return;

        if (editingTicketId === id) {
            alert('正在编辑中，无法删除。请先完成或取消编辑！');
            return;
        }

        if (ticket.locked) {
            alert('该彩票已锁定，请先解锁后再删除！');
            return;
        }

        if (window.confirm('确定要删除这张彩票吗？')) {
            setTickets(prev => prev.filter(t => t.id !== id));
        }
    };

    const clearTickets = () => {
        if (isRolling) return;
        if (tickets.length === 0) return;
        const hasLocked = tickets.some(t => t.locked);

        if (hasLocked) {
            if (window.confirm('列表包含锁定彩票。确定要清空所有未锁定的彩票吗？(锁定彩票将被保留)')) {
                setTickets(prev => prev.filter(t => t.locked));
            }
        } else {
            if (window.confirm('确定要清空所有彩票吗？')) {
                setTickets([]);
            }
        }
    };

    useEffect(() => {
        const id = requestAnimationFrame(() => onReady?.());
        return () => cancelAnimationFrame(id);
    }, [onReady]);

    useEffect(() => {
        return () => {
            // Cleanup happens in the async functions mostly, but safety check
        }
    }, []);

    if (notFound) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fa-solid fa-store-slash text-4xl text-gray-400"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">站点不存在</h2>
                    <p className="text-gray-500 mb-6">该门店站可能已被管理员删除或暂停运营。</p>
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

    if (isClosed) {
        return (
            <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                <div className={`bg-white/10 p-8 rounded-full mb-6 ${isLowPerf ? '' : 'backdrop-blur-sm'}`}>
                    <div className="text-6xl">🔒</div>
                </div>
                <h1 className="text-3xl font-bold text-white mb-4">本站点暂停服务</h1>
                <p className="text-gray-400 max-w-md mx-auto mb-8">
                    该门店 ({storeConfig.name}) 目前处于关闭维护状态。请联系管理员或稍后再试。
                </p>
                <div className="text-sm text-gray-600 font-mono">Store ID: {storeId || 'default'}</div>
            </div>
        );
    }

    const isLandscape = debugConfig.orientation === 'landscape';

    // Use 'zoom' for scaling instead of transform to allow flow reflow
    const wrapperStyle = {
        zoom: androidPadMode ? 1 : debugConfig.scale,
        // Handle rotation for landscape enforcement (Zoom doesn't handle rotation well, so we might need transform for rotation ONLY)
        transform: isLandscape && !androidPadMode ? 'rotate(90deg)' : 'none',
        transformOrigin: 'top center',
        width: isLandscape && !androidPadMode ? '100vh' : '100%',
        height: isLandscape && !androidPadMode ? '100vw' : '100%',
        position: isLandscape && !androidPadMode ? 'absolute' : 'relative',
        top: isLandscape && !androidPadMode ? '50%' : '0',
        left: isLandscape && !androidPadMode ? '50%' : '0',
        marginTop: isLandscape && !androidPadMode ? '-50vw' : '0',
        marginLeft: isLandscape && !androidPadMode ? '-50vh' : '0',
    };

    return (
        <div className={isLowPerf ? 'low-perf' : ''} style={isMobile ? { minHeight: '100vh', position: 'relative', overflowX: 'hidden', background: '#1f2937' } : { width: '100vw', height: '100vh', overflow: 'hidden', background: '#1f2937', position: 'fixed', inset: 0 }}>
            <button
                type="button"
                onClick={handleBackToPortal}
                className={`fixed z-[1200] flex items-center justify-center w-11 h-11 rounded-full border shadow-lg transition-all active:scale-95 bg-white/90 hover:bg-white text-gray-700 border-gray-200 ${isLowPerf ? '' : 'backdrop-blur-md'}`}
                style={{ left: 'calc(env(safe-area-inset-left, 0px) + 10px)', top: 'calc(env(safe-area-inset-top, 0px) + 10px)' }}
                aria-label="返回门店门户"
                title="返回门店门户"
            >
                <ArrowLeft size={18} />
            </button>

            {showDebugModal && (
                <div className="fixed inset-x-0 bottom-8 z-[9999] flex justify-center pointer-events-none">
                    <div className="pointer-events-auto animate-in slide-in-from-bottom-4 fade-in">
                        <div className={`bg-gray-900/90 ${isLowPerf ? '' : 'backdrop-blur-md'} text-white rounded-full px-6 py-3 shadow-2xl border border-white/10 flex items-center gap-4 min-w-[300px]`}>
                            <span className="font-mono font-bold w-12 text-center text-sm">{Math.round(debugConfig.scale * 100)}%</span>

                            <div className="flex-1 flex items-center gap-2">
                                <button
                                    onClick={() => updateDebugConfig({ scale: parseFloat(Math.max(0.5, debugConfig.scale - 0.01).toFixed(2)) })}
                                    className="w-8 h-8 flex-none flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold"
                                >
                                    <i className="fa-solid fa-minus"></i>
                                </button>
                                <input
                                    type="range"
                                    min="0.5"
                                    max="2"
                                    step="0.01"
                                    value={debugConfig.scale}
                                    onChange={(e) => updateDebugConfig({ scale: parseFloat(e.target.value) })}
                                    className="w-full h-1.5 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:accent-blue-400 transition-all"
                                />
                                <button
                                    onClick={() => updateDebugConfig({ scale: parseFloat(Math.min(2.0, debugConfig.scale + 0.01).toFixed(2)) })}
                                    className="w-8 h-8 flex-none flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold"
                                >
                                    <i className="fa-solid fa-plus"></i>
                                </button>
                            </div>

                            <button
                                onClick={() => {
                                    updateDebugConfig({ scale: 1 });
                                    // Reset also forces Compact Mode OFF
                                    setIsCompact(false);
                                    if (persistDebugSettings) {
                                        localStorage.setItem('cj_density_compact', 'false');
                                    }
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-xs font-bold px-3 py-1.5 rounded-full shadow-lg active:scale-95 transition-all whitespace-nowrap"
                            >
                                重置
                            </button>

                            <div className="w-[1px] h-4 bg-white/20 mx-1"></div>

                            <button onClick={() => setShowDebugModal(false)} className="text-gray-400 hover:text-white transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div id="debug-app-wrapper" style={isMobile ? { width: '100%', minHeight: '100vh', zoom: debugConfig.scale } : wrapperStyle} className={isCompact ? 'compact-mode' : ''}>

                <div className={isMobile ? "min-h-screen bg-orange-50 py-1 px-1 flex flex-col" : "fixed inset-0 bg-orange-50 overflow-hidden flex items-center justify-center"}>


                    {/* --- MOBILE: Drawer Backdrops (Moved FABs inside Drawers) --- */}

                    {/* --- MOBILE: Drawer Backdrops --- */}


                    <div
                        style={!isMobile ? (androidPadMode ? {
                            width: `${Math.round(baseWidth * scale)}px`,
                            height: `${Math.round(baseHeight * scale)}px`,
                            transform: 'none',
                            transition: 'transform 0.2s ease-out',
                            marginTop: padMarginY,
                            marginBottom: padMarginY,
                            marginLeft: padMarginX,
                            marginRight: padMarginX
                        } : {
                            transform: `scale(${scale})`,
                            width: `${baseWidth}px`,
                            height: `${baseHeight}px`,
                            transition: 'transform 0.2s ease-out'
                        }) : { width: '100%', height: '100%', margin: '0' }}
                        className={`origin-center ${isMobile ? '' : 'z-10'} flex gap-4 ${isMobile ? 'flex-col' : ''}`}
                    >

                        {/* --- LEFT: DRAW HISTORY PANEL (Desktop Only) --- */}
                        {!isMobile && (
                            <div
                                style={androidPadMode ? { width: `${panelLeftWidth}px`, minWidth: `${panelLeftWidth}px` } : undefined}
                                className={`
          bg-white rounded-2xl flex flex-col border-[6px] border-white ring-1 ring-gray-200 transform origin-top transition-transform duration-300
          relative h-full ${androidPadMode ? '' : 'w-[380px] min-w-[380px]'} shrink-0 scale-[0.98] translate-y-2 shadow-2xl
        `}>
                                {/* Attached FAB (History) - Visible when closed */}
                                {isMobile && (
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        className="absolute -left-[42px] top-[15%] bg-red-600 text-white rounded-l-2xl rounded-r-none shadow-[-4px_4px_10px_rgba(0,0,0,0.2)] border-l-2 border-y-2 border-white flex flex-col items-center justify-center py-1.5 pl-2 pr-1 hover:bg-red-700 active:scale-95 transition-all w-11 z-50"
                                    >
                                        <i className={`fa-solid ${showHistory ? 'fa-chevron-right' : 'fa-clock-rotate-left'} text-sm mb-0.5`}></i>
                                        <span className="text-[9px] font-bold leading-none transform scale-90 origin-center">{showHistory ? '收起' : '往期'}</span>
                                    </button>
                                )}
                                <div className="flex items-center justify-between p-4 bg-red-50 border-b border-red-100 flex-none rounded-t-xl">
                                    <div className="flex items-center gap-3">
                                        <img src={logoDlt} alt="DLT Logo" className="w-12 h-12 rounded-full shadow-lg border-2 border-white bg-white p-0.5" />
                                        <div>
                                            <div className="text-base font-bold text-red-800 leading-none mb-1">最新开奖</div>
                                            {drawData.updateTime && <div className="text-[10px] text-gray-400 font-medium scale-90 origin-left -mt-0.5">更新: {drawData.updateTime}</div>}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-black text-gray-800">{drawData.latest.period}</div>
                                        <div className="text-xs text-gray-500">{drawData.latest.date}</div>
                                    </div>
                                </div>

                                {/* Latest Draw Details */}
                                <div className="p-5 bg-white border-b border-dashed border-gray-200 shadow-sm relative z-10">
                                    <div className="flex flex-nowrap gap-2 justify-center mb-4">
                                        {drawData.latest.reds.map((n, i) => (
                                            <div key={`lr-${i}`} className="w-9 h-9 aspect-square rounded-full bg-red-600 text-white font-black flex items-center justify-center shadow-lg text-base border border-red-700">{n}</div>
                                        ))}
                                        {drawData.latest.blues.map((n, i) => (
                                            <div key={`lb-${i}`} className="w-9 h-9 aspect-square rounded-full bg-blue-600 text-white font-black flex items-center justify-center shadow-lg text-base border border-blue-700">{n}</div>
                                        ))}
                                    </div>

                                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 text-center border border-gray-200 shadow-inner mb-3">
                                        <div className="text-xs text-gray-500 mb-1 font-bold uppercase tracking-wider">奖池滚存</div>
                                        <div className="text-2xl font-black text-red-600 tracking-tight font-mono drops-shadow-sm leading-none">
                                            {drawData.latest.pool.replace(/,/g, '')}
                                            <span className="text-sm ml-1 text-gray-500 font-normal">元</span>
                                        </div>
                                    </div>

                                </div>

                                {/* History List */}
                                <div className="flex-1 overflow-y-auto bg-gray-50/50 p-3 pt-4">
                                    <div className="flex items-center gap-2 mb-3 px-1">
                                        <i className="fa-solid fa-clock-rotate-left text-gray-400"></i>
                                        <span className="text-xs font-bold text-gray-600">往期开奖记录</span>
                                    </div>
                                    <div className="space-y-3">
                                        {drawData.history.map((item, idx) => (
                                            <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-2 hover:shadow-lg transition-all transform hover:-translate-y-0.5 duration-200">
                                                <div className="flex justify-between items-center text-xs border-b border-gray-50 pb-2 mb-1">
                                                    <span className="font-bold text-gray-800">{item.period}</span>
                                                    <span className="text-gray-400 text-xs">{item.date}</span>
                                                </div>
                                                <div className="flex items-center justify-start gap-3 px-1 whitespace-nowrap">
                                                    <div className="flex gap-1.5">
                                                        {item.reds.map((n, i) => (
                                                            <div key={`hr-${i}`} className="w-6 h-6 aspect-square rounded-full bg-red-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">{n}</div>
                                                        ))}
                                                    </div>
                                                    <div className="w-[1px] h-4 bg-gray-200"></div>
                                                    <div className="flex gap-1.5">
                                                        {item.blues.map((n, i) => (
                                                            <div key={`hb-${i}`} className="w-6 h-6 aspect-square rounded-full bg-blue-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">{n}</div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="text-center text-[10px] text-gray-300 py-6 pb-12">
                                        <p>快乐购彩 理性投注</p>
                                        <p className="opacity-50">v1.2.6 (Layout Fixed)</p>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* --- CENTER: MAIN MACHINE (Kiosk) --- */}
                        <div className={`flex-1 bg-white flex flex-col relative overflow-hidden ${isLowPerf ? '' : 'backdrop-blur-sm'} bg-white/95 rounded-3xl border-[6px] border-white shadow-xl ring-1 ring-gray-200 ${isMobile ? 'order-1 w-full h-full' : ''}`}>

                            <header className={`flex-none text-center border-b-2 border-red-500 bg-red-50 relative flex items-center justify-center shadow-sm ${isMobile ? 'min-h-[3rem] py-1 px-2' : 'h-20 py-3 px-4'}`}>
                                <div className="absolute top-2 left-4 w-6 h-6 bg-blue-500 rounded-full opacity-80 mix-blend-multiply"></div>
                                <div className={`absolute left-8 w-4 h-4 bg-green-500 rounded-full opacity-80 mix-blend-multiply ${isMobile ? 'top-6' : 'top-8'}`}></div>

                                <div className="flex flex-col items-center justify-center">
                                    <h1 className={`font-black text-red-600 tracking-tighter drop-shadow-sm flex justify-center items-center ${isMobile ? 'text-2xl gap-2' : 'text-3xl gap-3'}`}>
                                        <div className={`bg-red-600 text-white font-bold rounded-full shadow-md transform -rotate-2 ${isMobile ? 'text-[10px] px-2 py-0.5' : 'text-xs px-3 py-1'}`}>
                                            快乐购彩！理性投注！
                                        </div>
                                        <div className="flex items-center whitespace-nowrap select-none">
                                            <span onClick={handleRedClick} className="text-red-600 active:scale-90 transition-transform cursor-pointer">
                                                超级
                                            </span>
                                            <span onClick={handleYellowClick} className={`text-yellow-500 relative active:scale-95 transition-transform cursor-pointer ${isMobile ? 'text-3xl' : 'text-4xl'}`} style={{ textShadow: isMobile ? '1px 1px 0px #000' : '2px 2px 0px #000' }}>大乐透</span>
                                        </div>
                                    </h1>
                                    {/* Mobile Period Info */}
                                    {isMobile && (
                                        <div className="flex items-center gap-2 mt-0.5 opacity-90">
                                            <span className="text-[10px] font-bold text-gray-600 tracking-wide leading-none">{nextPeriodStr}</span>
                                            <span className="text-[9px] font-medium text-gray-500 leading-none">{nextDateStr}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Draw Number & Date (Next Period) */}
                                <div className={`absolute right-4 top-1/2 -translate-y-1/2 flex flex-col items-end z-10 ${isMobile ? 'hidden' : 'gap-1'}`}>
                                    <div className={`font-bold text-gray-700 tracking-wide leading-none ${isMobile ? 'text-[10px]' : 'text-sm'}`}>
                                        {nextPeriodStr}
                                    </div>
                                    {/* Next Date */}
                                    <div className={`font-medium text-gray-500 leading-none ${isMobile ? 'text-[9px]' : 'text-xs'}`}>
                                        {nextDateStr}
                                    </div>
                                </div>
                            </header>



                            {/* Store Name Display (Below Marquee) */}
                            {/* Store Name Display (Below Marquee) */}
                            <div className="h-[30px] flex items-center justify-center relative z-10 w-full">
                                <span className="text-xs text-gray-400 font-bold tracking-wide">
                                    {storeConfig.name || ''}
                                </span>
                            </div>

                            {/* Rolling / Countdown Overlay - NO BLUR */}
                            {isRolling && countdown > 0 && (
                                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none">
                                    <div className="animate-bounce bg-red-600 text-white font-black text-5xl w-32 h-32 rounded-full flex items-center justify-center shadow-2xl border-4 border-white opacity-90">
                                        {countdown}
                                    </div>
                                </div>
                            )}

                            <div className={`flex-1 flex flex-col pb-5 pt-0 ${androidPadMode ? 'px-3 gap-1' : 'px-5 gap-3'} overflow-hidden`}>

                                {/* Numbers */}
                                <div className={`glass-panel bg-gradient-to-b from-blue-50 to-white flex flex-col justify-center flex-none rounded-2xl border border-blue-100 shadow-inner ${isMobile ? 'py-1 px-2 mb-1' : (androidPadMode ? 'py-1 px-3' : 'py-2 px-8')}`}>

                                    {/* --- MOBILE: HISTORY ACCORDION (Seamless - Moved Here) --- */}
                                    {isMobile && (
                                        <div className="relative z-20 border-b border-blue-100/50 mb-3 mx-2">
                                            <button
                                                onClick={() => {
                                                    setShowHistory(!showHistory);
                                                }}
                                                className="w-full flex items-center justify-center gap-2 pb-2 active:opacity-70 transition-opacity"
                                                style={{ touchAction: 'manipulation' }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <i className={`fa-solid fa-clock-rotate-left text-blue-600 text-base`}></i>
                                                    <span className="font-black text-blue-900 text-base tracking-wide">往期开奖</span>
                                                    <i className={`fa-solid fa-chevron-down text-blue-400 text-xs transition-transform duration-300 ${showHistory ? 'rotate-180' : ''}`}></i>
                                                </div>
                                            </button>

                                            <div className={`transition-all duration-300 ease-in-out overflow-hidden bg-transparent ${showHistory ? 'max-h-[80vh] opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
                                                <div className="flex flex-col overflow-hidden text-xs">

                                                    {/* Compact Latest Draw */}
                                                    <div className="p-2 border-b border-dashed border-gray-200">
                                                        <div className="flex justify-between items-center mb-1.5 opacity-80">
                                                            <span className="font-bold text-gray-700">{drawData.latest.period} <span className="font-normal text-[10px] scale-90 text-gray-400 ml-1">{drawData.latest.date}</span></span>
                                                            <span className="font-mono text-red-500 font-bold scale-90">奖池: {drawData.latest.pool.replace(/,/g, '')}</span>
                                                        </div>
                                                        <div className="flex justify-center gap-1">
                                                            {drawData.latest.reds.map((n, i) => (
                                                                <div key={`lr-${i}`} className="w-6 h-6 aspect-square rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px] shadow-sm leading-none">{n}</div>
                                                            ))}
                                                            {drawData.latest.blues.map((n, i) => (
                                                                <div key={`lb-${i}`} className="w-6 h-6 aspect-square rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-[10px] shadow-sm leading-none">{n}</div>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    {/* Compact History List */}
                                                    <div className="flex-1 overflow-y-auto bg-gray-50/50 max-h-[300px]">
                                                        {drawData.history.slice(0, !showFullHistory ? 4 : undefined).map((item, idx) => (
                                                            <div key={idx} className="flex items-center justify-between p-2 border-b border-gray-100 last:border-0 hover:bg-white transition-colors">
                                                                <div className="flex flex-col w-20 flex-none">
                                                                    <span className="font-bold text-gray-600 scale-90 origin-left whitespace-nowrap">{item.period}</span>
                                                                    <span className="text-[9px] text-gray-300 scale-90 origin-left">{item.date.slice(5)}</span>
                                                                </div>
                                                                <div className="flex gap-1 flex-1 justify-end">
                                                                    <span className="text-red-600 font-mono font-bold tracking-tighter text-xs">{item.reds.join(' ')}</span>
                                                                    <span className="text-gray-300 mx-1">|</span>
                                                                    <span className="text-blue-600 font-mono font-bold tracking-tighter text-xs">{item.blues.join(' ')}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {/* Expand/Collapse Button */}
                                                        <button
                                                            onClick={() => setShowFullHistory(!showFullHistory)}
                                                            className="w-full py-2 text-center text-blue-500 text-xs font-bold active:bg-blue-50 transition-colors flex items-center justify-center gap-1"
                                                        >
                                                            {showFullHistory ? (
                                                                <>
                                                                    <span>收起更多</span>
                                                                    <i className="fa-solid fa-chevron-up text-[10px]"></i>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <span>展开更多</span>
                                                                    <i className="fa-solid fa-chevron-down text-[10px]"></i>
                                                                </>
                                                            )}
                                                        </button>
                                                        <div className="h-2"></div>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Red Balls: Grid 7 cols */}
                                    <div ref={redGridRef} className={`grid grid-cols-7 justify-items-center mx-auto ${isMobile ? (isCompact ? 'gap-y-1 gap-x-0.5' : 'gap-y-2 gap-x-1') : (androidPadMode ? 'gap-y-1 gap-x-1 w-full' : 'gap-y-2 gap-x-2 max-w-3xl')}`}>
                                        {Array.from({ length: RED_COUNT }, (_, i) => i + 1).map(n => {
                                            const isLocked = lockedNumbers.reds.has(n);
                                            const isFlashing = activeReds.includes(n) && !isLocked;
                                            const isActive = isLocked || isFlashing;
                                            return (
                                                <div key={`r-${n}`} className={`ball-red shadow-sm flex items-center justify-center font-bold ${androidPadMode ? 'transition-none' : 'transition-all duration-100'} ${isMobile ? (isCompact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm') : (androidPadMode ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base')} ${isActive ? (isLocked ? 'ball-red-active' : 'ball-red-flash') : 'opacity-40 scale-90 grayscale-[0.3]'}`}>
                                                    {String(n).padStart(2, '0')}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Divider */}
                                    <div className={`w-full mx-auto border-t-2 border-dashed border-gray-200 relative ${androidPadMode ? 'pt-1 mt-1' : 'max-w-2xl pt-2 mt-2'}`}></div>

                                    {/* Blue Balls: Grid 6 cols */}
                                    <div ref={blueGridRef} className={`grid grid-cols-6 justify-items-center mx-auto ${isMobile ? (isCompact ? 'gap-y-1 gap-x-1' : 'gap-y-2 gap-x-2') : (androidPadMode ? 'gap-y-1 gap-x-2 w-full' : 'gap-y-2 gap-x-4 max-w-xl')}`}>
                                        {Array.from({ length: BLUE_COUNT }, (_, i) => i + 1).map(n => {
                                            const isLocked = lockedNumbers.blues.has(n);
                                            const isFlashing = activeBlues.includes(n) && !isLocked;
                                            const isActive = isLocked || isFlashing;
                                            return (
                                                <div key={`b-${n}`} className={`ball-blue shadow-sm flex items-center justify-center font-bold ${androidPadMode ? 'transition-none' : 'transition-all duration-100'} ${isMobile ? (isCompact ? 'w-7 h-7 text-xs' : 'w-8 h-8 text-sm') : (androidPadMode ? 'w-8 h-8 text-sm' : 'w-10 h-10 text-base')} ${isActive ? (isLocked ? 'ball-blue-active' : 'ball-blue-flash') : 'opacity-40 scale-90 grayscale-[0.3]'}`}>
                                                    {String(n).padStart(2, '0')}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    {/* --- MOBILE: TICKETS ACCORDION (Seamless - NEW) --- */}
                                    {isMobile && (
                                        <div className="relative z-20 border-t border-blue-50 mt-1 pt-1 mx-2">
                                            <button
                                                onClick={() => setShowTickets(!showTickets)}
                                                className="w-full flex items-center justify-center gap-2 pb-1 active:opacity-70 transition-opacity"
                                                style={{ touchAction: 'manipulation' }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <i className="fa-solid fa-receipt text-blue-600 text-base"></i>
                                                    <span className="font-black text-blue-900 text-base tracking-wide">我的彩票</span>
                                                    <i className={`fa-solid fa-chevron-down text-blue-400 text-xs transition-transform duration-300 ${showTickets ? 'rotate-180' : ''}`}></i>
                                                </div>
                                                {tickets.length > 0 && <span className="absolute right-4 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-sm">{tickets.length}</span>}
                                            </button>

                                            <div className={`transition-all duration-300 ease-in-out overflow-hidden bg-transparent ${showTickets ? 'max-h-[60vh] opacity-100 mb-2' : 'max-h-0 opacity-0'}`}>
                                                <div className="flex flex-col overflow-hidden text-xs">
                                                    {tickets.length > 0 && (
                                                        <div className="flex justify-between items-center px-3 py-2 mb-2 bg-blue-50/50 rounded-xl border border-blue-100">
                                                            <span className="text-gray-500 text-xs font-bold">合计: <span className="text-red-600 font-black text-lg ml-1">¥{tickets.reduce((acc, t) => acc + (t.price || 0), 0)}</span></span>
                                                            <button
                                                                onClick={() => {
                                                                    if (tickets.some(t => t.locked)) {
                                                                        try {
                                                                            const lockedTickets = tickets.filter(t => t.locked);
                                                                            const storeIdParam = storeId || 'default';
                                                                            const totalPrice = lockedTickets.reduce((acc, t) => acc + (t.price || 0), 0);
                                                                            const trackingTickets = lockedTickets.map(t => ({
                                                                                mode: t.tag === '套餐' ? 'package' : 'regular',
                                                                                type: t.bets.length > 1 ? 'batch' : (t.bets[0].reds.length > 5 || t.bets[0].blues.length > 2 ? 'duplex' : 'single'),
                                                                                numbers: t.bets,
                                                                                count: t.bets.length,
                                                                                price: t.price
                                                                            }));
                                                                            fetch('/api/track/share', {
                                                                                method: 'POST',
                                                                                headers: { 'Content-Type': 'application/json' },
                                                                                body: JSON.stringify({
                                                                                    storeId: storeIdParam,
                                                                                    period: typeof nextPeriodStr !== 'undefined' ? nextPeriodStr.replace(/[^\d]/g, '') : '',
                                                                                    totalPrice,
                                                                                    tickets: trackingTickets
                                                                                })
                                                                            }).catch(e => console.error("Tracking Silent Fail", e));
                                                                        } catch (e) { console.error("Tracking Error", e); }
                                                                        setShowShareModal(true);
                                                                    } else {
                                                                        alert("请先点击彩票上的 🔒 图标锁定至少一张彩票用于分享！");
                                                                    }
                                                                }}
                                                                className="text-xs text-white bg-orange-500 px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1 active:scale-95 transition-all font-bold"
                                                            >
                                                                <i className="fa-solid fa-share-nodes"></i> 分享
                                                            </button>
                                                        </div>
                                                    )}

                                                    <div className="flex-1 overflow-y-auto max-h-[300px] space-y-1">
                                                        {tickets.length === 0 ? (
                                                            <div className="text-center text-gray-300 py-4 text-[10px]">
                                                                暂无号码，请在下方选号
                                                            </div>
                                                        ) : (
                                                            tickets.map(t => (
                                                                <div key={t.id} className={`flex flex-col gap-1 p-3 rounded-xl transition-all border ${editingTicketId === t.id ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-xl z-20 scale-[1.02]' : (t.locked ? 'bg-yellow-50 border-yellow-400 ring-1 ring-yellow-200 shadow-md transform scale-[1.01]' : 'bg-white/60 border-gray-100 hover:bg-white shadow-sm')}`}>
                                                                    <div className="flex justify-between items-center pb-1 border-b border-gray-100/50 mb-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <span className={`text-[10px] px-1.5 py-0.5 text-white rounded font-bold shadow-sm ${t.tag === '套餐' ? 'bg-teal-500' : 'bg-red-500'}`}>{t.tag}</span>
                                                                            <span className="font-bold text-gray-700 text-xs">{t.type}</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleEnterEditMode(t.id); }}
                                                                                disabled={t.locked || isRolling}
                                                                                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95 ${editingTicketId === t.id ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-400' : ((t.locked || isRolling) ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50' : 'bg-gray-50 text-gray-300 hover:bg-gray-100')}`}
                                                                            >
                                                                                <i className="fa-solid fa-pen text-xs"></i>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); toggleLock(t.id); }}
                                                                                disabled={editingTicketId === t.id || isRolling}
                                                                                className={`w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-95 ${(editingTicketId === t.id || isRolling) ? 'bg-gray-100 text-gray-300 cursor-not-allowed opacity-50' : (t.locked ? 'bg-yellow-100 text-yellow-600 shadow-inner' : 'bg-gray-50 text-gray-300 hover:bg-gray-100')}`}
                                                                            >
                                                                                <i className={`fa-solid ${t.locked ? 'fa-lock' : 'fa-lock-open'} text-xs`}></i>
                                                                            </button>
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); deleteTicket(t.id); }}
                                                                                disabled={editingTicketId === t.id || isRolling}
                                                                                className={`w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-300 transition-all ${(editingTicketId === t.id || isRolling) ? 'cursor-not-allowed opacity-50' : 'hover:bg-red-50 hover:text-red-500 active:scale-95'}`}
                                                                            >
                                                                                <i className="fa-solid fa-trash-can text-xs"></i>
                                                                            </button>
                                                                            <span className="text-red-600 font-extrabold text-xs ml-1">¥{t.price}</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="pl-0.5 space-y-2 pb-1">
                                                                        {(t.bets || []).map((bet, bIdx) => (
                                                                            <div key={bIdx} className="flex flex-col w-full">
                                                                                <div
                                                                                    onClick={() => editingTicketId === t.id && handleSelectBetToEdit(t, bIdx)}
                                                                                    className={`flex items-center justify-between text-[11px] w-full py-1 transition-all rounded px-1 ${editingTicketId === t.id ? 'cursor-pointer hover:bg-blue-100/50 ring-1 ring-blue-200' : ''} ${(editingTicketId === t.id && editingBetIndex === bIdx) ? 'bg-blue-50 ring-2 ring-blue-400 shadow-sm' : ''}`}
                                                                                >
                                                                                    <div style={{ display: 'grid', flex: 8, gridTemplateColumns: 'repeat(8, 1fr)', placeItems: 'center', paddingRight: '4px' }}>
                                                                                        {Array.from({ length: Math.max(0, 8 - bet.reds.length) }).map((_, i) => <div key={`e-${i}`} />)}
                                                                                        {bet.reds.map((n, i) => (
                                                                                            <div key={i} className="w-[18px] h-[18px] rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-bold text-[9px] shadow-sm leading-none shrink-0">
                                                                                                {String(n).padStart(2, '0')}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                    <div className="w-[1px] h-3 bg-gray-200 shrink-0 mx-1"></div>
                                                                                    <div style={{ display: 'grid', flex: 3, gridTemplateColumns: 'repeat(3, 1fr)', placeItems: 'center', paddingLeft: '4px' }}>
                                                                                        {bet.blues.map((n, i) => (
                                                                                            <div key={i} className="w-[18px] h-[18px] rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-[9px] shadow-sm leading-none shrink-0">
                                                                                                {String(n).padStart(2, '0')}
                                                                                            </div>
                                                                                        ))}
                                                                                    </div>
                                                                                </div>

                                                                            </div>
                                                                        ))}
                                                                        {!t.bets && (
                                                                            <div className="flex items-center justify-between text-[11px] w-full py-1">
                                                                                <div style={{ display: 'grid', flex: 8, gridTemplateColumns: 'repeat(8, 1fr)', placeItems: 'center', paddingRight: '4px' }}>
                                                                                    {Array.from({ length: Math.max(0, 8 - t.reds.length) }).map((_, i) => <div key={`e-${i}`} />)}
                                                                                    {t.reds.map((n, i) => (
                                                                                        <div key={i} className="w-[18px] h-[18px] rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center justify-center font-bold text-[9px] shadow-sm leading-none shrink-0">
                                                                                            {String(n).padStart(2, '0')}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                                <div className="w-[1px] h-3 bg-gray-200 shrink-0 mx-1"></div>
                                                                                <div style={{ display: 'grid', flex: 3, gridTemplateColumns: 'repeat(3, 1fr)', placeItems: 'center', paddingLeft: '4px' }}>
                                                                                    {t.blues.map((n, i) => (
                                                                                        <div key={i} className="w-[18px] h-[18px] rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold text-[9px] shadow-sm leading-none shrink-0">
                                                                                            {String(n).padStart(2, '0')}
                                                                                        </div>
                                                                                    ))}
                                                                                </div>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            ))
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>


                                {/* Controls - REVERSED: Package Left, Regular Right */}
                                {isMobile ? (
                                    // --- MOBILE: TABS ---
                                    <div className="flex flex-col flex-1 min-h-0 bg-white/50 rounded-xl overflow-hidden shadow-inner border border-white/50 relative">
                                        {isRolling && <SelectionOverlay />}
                                        {/* Tab Headers */}
                                        <div className="flex border-b border-gray-200 bg-white">
                                            {/* Regular Tab */}
                                            {(storeConfig.features?.regular !== false) && (
                                                <button
                                                    onClick={() => setMobileTab('regular')}
                                                    className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mobileTab === 'regular' ? 'text-orange-600 bg-orange-50 border-b-2 border-orange-500' : 'text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    <i className="fa-solid fa-crown"></i> 常规选号
                                                </button>
                                            )}
                                            {/* Package Tab */}
                                            {(storeConfig.features?.package !== false) && (
                                                <button
                                                    onClick={() => setMobileTab('package')}
                                                    className={`flex-1 py-2 text-sm font-bold flex items-center justify-center gap-2 transition-colors ${mobileTab === 'package' ? 'text-green-600 bg-green-50 border-b-2 border-green-500' : 'text-gray-500 hover:bg-gray-50'}`}
                                                >
                                                    <i className="fa-solid fa-box-open"></i> 套餐票
                                                </button>
                                            )}
                                        </div>

                                        {/* Tab Content */}
                                        <div className={`flex-1 overflow-y-auto p-3 ${isRolling ? 'opacity-50 pointer-events-none' : ''}`}>
                                            {mobileTab === 'regular' ? (
                                                <div className="grid grid-cols-2 gap-3 pb-20">
                                                    {(storeConfig.gameConfig?.regulars?.length > 0) ? (
                                                        storeConfig.gameConfig.regulars.map((item) => (
                                                            <MobileCouponButton
                                                                key={item.id}
                                                                price={item.price}
                                                                title={item.label}
                                                                color={item.color || "orange"}
                                                                className="h-14"
                                                                onClick={() => {
                                                                    if (item.action === 'batch') {
                                                                        handleBatchBet(item.params.count);
                                                                    } else {
                                                                        handleRegularBet(item.label, item.params.r, item.params.b);
                                                                    }
                                                                }}
                                                            />
                                                        ))
                                                    ) : (
                                                        <div className="col-span-2 flex flex-col items-center justify-center text-gray-400 py-12">
                                                            <i className="fa-solid fa-crown text-4xl mb-3 opacity-30"></i>
                                                            <span className="text-sm font-bold opacity-60">暂无常规配置</span>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-2 gap-3 pb-20">
                                                    {(storeConfig.gameConfig?.packages?.length > 0) ? (
                                                        storeConfig.gameConfig.packages.map((pkg) => (
                                                            <MobileCouponButton
                                                                key={pkg.id}
                                                                price={pkg.price}
                                                                title={
                                                                    <div className="flex flex-col gap-0.5">
                                                                        {pkg.items.map((item, idx) => (
                                                                            <span key={idx} className="text-lg font-black text-gray-800 leading-tight">
                                                                                {item.text || (item.type === 'batch' ? `单式 ${item.count} 注` : `复式 ${item.r} + ${item.b}`)}
                                                                            </span>
                                                                        ))}
                                                                    </div>
                                                                }
                                                                color="green"
                                                                className="min-h-[4.8rem]"
                                                                onClick={() => handlePackageBet(pkg.title, pkg.items)}
                                                            />
                                                        ))
                                                    ) : (
                                                        <div className="col-span-2 flex flex-col items-center justify-center text-gray-400 py-12">
                                                            <i className="fa-solid fa-box-open text-4xl mb-3 opacity-30"></i>
                                                            <span className="text-sm font-bold opacity-60">暂无套餐配置</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {editingTicketId && editingBetIndex !== null && (
                                            <MobileTicketEditor
                                                ticket={tickets.find(t => t.id === editingTicketId)}
                                                betIndex={editingBetIndex}
                                                editState={editState}
                                                onEdit={handleEditNumber}
                                                onClose={handleCloseEditor}
                                                onSave={handleSaveEdit}
                                            />
                                        )}
                                    </div>
                                ) : (
                                    // --- DESKTOP: FULL VIEW ---
                                    <div className={`flex-1 min-h-0 transition-opacity ${isRolling ? 'opacity-50 pointer-events-none' : ''}`} style={androidPadMode ? { display: 'grid', gridTemplateColumns: '2fr 3fr', gap: '1rem' } : { display: 'flex', gap: '1rem' }}>

                                        {/* Package (Left) - Optimized Size (2/5) */}
                                        {(storeConfig.features?.package !== false) && (
                                            <div className={`${androidPadMode ? 'p-4 shadow-none border-t-0' : 'glass-panel shadow-md border-t-8 border-t-green-500'} flex-[2] flex flex-col rounded-xl bg-white relative`} style={padGreenBarStyle}>
                                                {isRolling && <SelectionOverlay />}
                                                <h3 className={`font-bold text-green-600 flex items-center justify-center flex-none bg-green-50/50 rounded-t-xl ${androidPadMode ? 'text-xs mb-1 p-1.5' : 'text-base mb-2 p-3'}`}>
                                                    <i className={`fa-solid fa-box-open mr-1.5 ${androidPadMode ? 'text-sm' : 'text-2xl'}`}></i>
                                                    <span className={androidPadMode ? 'text-xs' : 'text-base'}>套餐票</span>
                                                </h3>
                                                {(() => {
                                                    const pkgN = storeConfig.gameConfig?.packages?.length || 0;
                                                    const pkgRows = pkgN <= 1 ? 1 : 2;
                                                    const pkgCols = pkgN <= 2 ? 1 : 2;
                                                    const padStyle = androidPadMode ? { gridTemplateColumns: `repeat(${pkgCols}, 1fr)`, gridTemplateRows: `repeat(${pkgRows}, 1fr)` } : {};
                                                    return (
                                                        <div className={`grid flex-1 ${androidPadMode ? 'gap-2 p-2 pt-0' : 'grid-cols-2 grid-rows-2 gap-3 p-3 pt-0'}`} style={padStyle}>
                                                            {pkgN > 0 ? (
                                                                storeConfig.gameConfig.packages.map((pkg) => (
                                                                    <PackageButton
                                                                        key={pkg.id}
                                                                        price={pkg.price}
                                                                        content={pkg.items.map(i => i.text || (i.type === 'batch' ? `单式${i.count}注` : `复式${i.r}+${i.b}`))}
                                                                        hidePrice={androidPadMode}
                                                                        onClick={() => handlePackageBet(pkg.title, pkg.items)}
                                                                    />
                                                                ))
                                                            ) : (
                                                                <div className="col-span-2 row-span-2 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 h-full">
                                                                    <i className="fa-solid fa-box-open text-3xl mb-2 opacity-30"></i>
                                                                    <span className="text-sm font-bold opacity-60">暂无套餐配置</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                        {/* Regular (Right) - Optimized Size (3/5) */}
                                        {(storeConfig.features?.regular !== false) && (
                                            <div className={`${androidPadMode ? 'p-4 shadow-none border-t-0 self-stretch min-h-0' : 'glass-panel shadow-md border-t-8 border-t-orange-400'} flex-[3] flex flex-col rounded-xl bg-white relative overflow-hidden`} style={padOrangeBarStyle}>
                                                {isRolling && <SelectionOverlay />}
                                                <h3 className={`font-bold text-orange-600 flex items-center justify-center flex-none bg-orange-50/50 rounded-t-xl ${androidPadMode ? 'text-xs mb-1 p-1.5' : 'text-base mb-2 p-3'}`}>
                                                    <i className={`fa-solid fa-crown mr-1.5 ${androidPadMode ? 'text-sm' : 'text-2xl'}`}></i>
                                                    <span className={androidPadMode ? 'text-xs' : 'text-base'}>常规选号</span>
                                                </h3>
                                                {(() => {
                                                    const pkgN = storeConfig.gameConfig?.packages?.length || 0;
                                                    const pkgRows = pkgN <= 1 ? 1 : 2;
                                                    const regN = storeConfig.gameConfig?.regulars?.length || 0;
                                                    let regRows = pkgRows;
                                                    let regCols = regN <= 0 ? 1 : Math.ceil(regN / regRows);
                                                    if (regCols > 5) { regRows = 3; regCols = Math.ceil(regN / 3); }
                                                    if (regN <= 1) { regCols = 1; regRows = pkgRows; }
                                                    const padStyle = androidPadMode ? { gridTemplateColumns: `repeat(${regCols}, 1fr)`, gridTemplateRows: `repeat(${regRows}, 1fr)` } : {};
                                                    return (
                                                        <div className={`grid flex-1 ${androidPadMode ? 'gap-2 p-2 pt-0' : 'grid-cols-4 gap-3 p-3 pt-0'}`} style={padStyle}>
                                                    {(storeConfig.gameConfig?.regulars?.length > 0) ? (
                                                        storeConfig.gameConfig.regulars.map((item) => (
                                                            <BetButton
                                                                key={item.id}
                                                                label={item.label}
                                                                sub={item.sub || `￥${item.price}`}
                                                                color={item.color || "orange"}
                                                                hidePrice={androidPadMode}
                                                                onClick={() => {
                                                                    if (item.action === 'batch') {
                                                                        handleBatchBet(item.params.count);
                                                                    } else {
                                                                        handleRegularBet(item.label, item.params.r, item.params.b);
                                                                    }
                                                                }}
                                                            />
                                                        ))
                                                    ) : (
                                                        <div className="col-span-4 flex flex-col items-center justify-center text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 h-full py-8">
                                                            <i className="fa-solid fa-crown text-3xl mb-2 opacity-30"></i>
                                                            <span className="text-sm font-bold opacity-60">暂无常规配置</span>
                                                        </div>
                                                    )}
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}

                                    </div>
                                )}

                            </div>
                        </div>

                        {/* --- RIGHT: EXTERNAL TICKET PANEL (Desktop Only) --- */}
                        {!isMobile && (
                            <div
                                style={androidPadMode ? { width: `${panelRightWidth}px`, minWidth: `${panelRightWidth}px` } : undefined}
                                className={`
          bg-white flex flex-col
          relative h-full ${androidPadMode ? '' : 'w-[400px] min-w-[400px]'} shrink-0 shadow-2xl rounded-2xl border-[6px] border-white ring-1 ring-gray-200 transform scale-[0.98] translate-y-2 origin-top
        `}>
                                {/* Attached FAB (Tickets) - Visible when closed */}
                                {isMobile && (
                                    <button
                                        onClick={() => setShowTickets(!showTickets)}
                                        className="absolute -left-[42px] top-[24%] bg-blue-600 text-white rounded-l-2xl rounded-r-none shadow-[-4px_4px_10px_rgba(0,0,0,0.2)] border-l-2 border-y-2 border-white flex flex-col items-center justify-center py-1.5 pl-2 pr-1 hover:bg-blue-700 active:scale-95 transition-all w-11 z-50"
                                    >
                                        <i className={`fa-solid ${showTickets ? 'fa-chevron-right' : 'fa-receipt'} text-sm mb-0.5`}></i>
                                        <span className="text-[9px] font-bold leading-none transform scale-90 origin-center">{showTickets ? '收起' : '彩票'}</span>
                                        {!showTickets && tickets.length > 0 && <span className="absolute -top-1.5 -left-1.5 bg-yellow-400 text-red-600 text-[9px] font-black w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white shadow-sm z-10">{tickets.length}</span>}
                                    </button>
                                )}
                                {/* Receipt jagged edge top */}
                                <div className="absolute -top-[10px] left-0 right-0 h-[10px]"
                                    style={{
                                        background: 'radial-gradient(circle, transparent 70%, white 75%)',
                                        backgroundSize: '20px 20px',
                                        backgroundPosition: '0 10px'
                                    }}>
                                </div>

                                <div className="flex justify-between items-center p-4 bg-gray-50 border-b border-gray-100 flex-none rounded-t-xl">
                                    <div className="flex items-center gap-2">
                                        <i className="fa-solid fa-receipt text-2xl text-gray-600"></i>
                                        <div>
                                            <h3 className="font-bold text-gray-700 text-base leading-none">我的彩票</h3>
                                            <span className="text-[10px] text-gray-400">{storeConfig.watermarkText || '幸运号码'}清单</span>
                                        </div>
                                        {tickets.length > 0 && <span className="ml-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full animate-pulse">{tickets.length}</span>}
                                    </div>
                                    {tickets.length > 0 && (
                                        <button
                                            onClick={() => {
                                                if (tickets.some(t => t.locked)) {
                                                    // [TRACKING] Share - Locked Tickets Only
                                                    try {
                                                        const lockedTickets = tickets.filter(t => t.locked);
                                                        const storeIdParam = storeId || 'default';
                                                        const totalPrice = lockedTickets.reduce((acc, t) => acc + (t.price || 0), 0);
                                                        const trackingTickets = lockedTickets.map(t => ({
                                                            mode: t.tag === '套餐' ? 'package' : 'regular',
                                                            type: t.bets.length > 1 ? 'batch' : (t.bets[0].reds.length > 5 || t.bets[0].blues.length > 2 ? 'duplex' : 'single'),
                                                            numbers: t.bets,
                                                            count: t.bets.length,
                                                            price: t.price
                                                        }));

                                                        fetch('/api/track/share', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({
                                                                storeId: storeIdParam,
                                                                period: typeof nextPeriodStr !== 'undefined' ? nextPeriodStr.replace(/[^\d]/g, '') : '',
                                                                totalPrice,
                                                                tickets: trackingTickets
                                                            })
                                                        }).catch(e => console.error("Tracking Silent Fail", e));
                                                    } catch (e) { console.error("Tracking Error", e); }

                                                    setShowShareModal(true);
                                                } else {
                                                    alert("请先点击彩票上的 🔒 图标锁定至少一张彩票用于分享！");
                                                }
                                            }}
                                            className="text-xs text-orange-500 hover:text-white hover:bg-orange-500 px-3 py-1.5 rounded-lg border border-orange-200 transition-all flex items-center gap-1"
                                            title="分享截图"
                                        >
                                            <i className="fa-solid fa-share-nodes"></i>
                                            <span className="font-bold">分享</span>
                                        </button>
                                    )}
                                </div>

                                <div className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-3 bg-gray-50/30">
                                    {tickets.length === 0 ? (
                                        <div className="h-full flex flex-col items-center justify-center text-gray-300">
                                            <i className="fa-solid fa-ticket text-6xl mb-4 opacity-50"></i>
                                            <div className="text-sm font-medium">暂无彩票</div>
                                            <div className="text-xs mt-1 text-center max-w-[150px]">请在左侧机器上<br />选择您的{storeConfig.watermarkText || '幸运号码'}</div>
                                        </div>
                                    ) : (
                                        tickets.map(t => (
                                            <div key={t.id} className={`bg-white border rounded-xl px-2 py-3 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all ${editingTicketId === t.id ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-300 shadow-md' : (t.locked ? 'border-yellow-400 bg-yellow-50 ring-1 ring-yellow-200' : 'border-gray-200 border-l-4 border-l-red-500')}`}>

                                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-dashed border-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`text-[10px] font-bold px-2 py-0.5 text-white rounded shadow-sm ${t.tag === '套餐' ? 'bg-teal-500' : 'bg-red-500'}`}>{t.tag}</span>
                                                        <span className="text-xs font-bold text-gray-800">{t.type}</span>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleEnterEditMode(t.id); }}
                                                            disabled={t.locked || isRolling}
                                                            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${editingTicketId === t.id ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-400' : ((t.locked || isRolling) ? 'text-gray-300 bg-gray-50 cursor-not-allowed opacity-50' : 'text-gray-300 hover:bg-gray-100')}`}
                                                            title="编辑"
                                                        >
                                                            <i className="fa-solid fa-pen text-xs scale-90"></i>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); toggleLock(t.id); }}
                                                            disabled={editingTicketId === t.id || isRolling}
                                                            className={`w-7 h-7 flex items-center justify-center rounded-full transition-colors ${(editingTicketId === t.id || isRolling) ? 'text-gray-300 bg-gray-50 cursor-not-allowed opacity-50' : (t.locked ? 'text-yellow-600 bg-yellow-100 hover:bg-yellow-200' : 'text-gray-300 hover:text-yellow-500 hover:bg-gray-100')}`}
                                                            title={t.locked ? "解锁" : "锁定"}
                                                        >
                                                            <i className={`fa-solid ${t.locked ? 'fa-lock' : 'fa-lock-open'} text-xs scale-90`}></i>
                                                        </button>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); deleteTicket(t.id); }}
                                                            disabled={editingTicketId === t.id || isRolling}
                                                            className={`w-7 h-7 flex items-center justify-center rounded-full text-gray-300 transition-colors ${(editingTicketId === t.id || isRolling) ? 'cursor-not-allowed opacity-50' : 'hover:text-red-500 hover:bg-red-50'}`}
                                                            title="删除"
                                                        >
                                                            <i className="fa-solid fa-trash-can text-xs scale-90"></i>
                                                        </button>                           <div className="text-xl font-black text-red-600 ml-1 w-14 text-right">¥{t.price}</div>
                                                    </div>
                                                </div>

                                                <div className="pr-2 pl-1">
                                                    {t.bets ? (
                                                        t.bets.map((bet, bIdx) => (
                                                            <div key={bIdx} className="flex flex-col w-full">
                                                                <div
                                                                    onClick={() => editingTicketId === t.id && handleSelectBetToEdit(t, bIdx)}
                                                                    className={`flex items-center border-b border-dashed border-gray-100 last:border-0 border-opacity-50 min-h-[32px] py-1.5 transition-all rounded px-1 ${editingTicketId === t.id ? 'cursor-pointer hover:bg-blue-100/50 ring-1 ring-blue-200' : ''} ${(editingTicketId === t.id && editingBetIndex === bIdx) ? 'bg-blue-50 ring-2 ring-blue-400 shadow-sm' : ''}`}
                                                                >                               {/* Reds: Flex-8 Right (Inline) */}
                                                                    <div style={{ display: 'grid', flex: 8, gridTemplateColumns: 'repeat(8, 1fr)', placeItems: 'center', paddingRight: '2px' }}>
                                                                        {Array.from({ length: Math.max(0, 8 - bet.reds.length) }).map((_, i) => <div key={`e-${i}`} />)}
                                                                        {bet.reds.map((n, i) => (
                                                                            <div key={i} className="w-6 h-6 rounded-full bg-red-50 text-red-600 font-bold flex items-center justify-center text-xs leading-none shadow-sm border border-red-100 flex-shrink-0">
                                                                                {String(n).padStart(2, '0')}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                    {/* Divider */}
                                                                    <div className="w-[1px] h-5 bg-gray-200 flex-none opacity-60"></div>
                                                                    {/* Blues: Flex-3 Left (Inline) */}
                                                                    <div style={{ display: 'grid', flex: 3, gridTemplateColumns: 'repeat(3, 1fr)', placeItems: 'center', paddingLeft: '2px' }}>
                                                                        {bet.blues.map((n, i) => (
                                                                            <div key={i} className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs leading-none shadow-sm border border-blue-100 flex-shrink-0">
                                                                                {String(n).padStart(2, '0')}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>

                                                                {/* EDITOR UI */}
                                                                {editingTicketId === t.id && editingBetIndex === bIdx && (
                                                                    <div className="bg-white border text-left border-blue-200 p-2 my-1 rounded-xl shadow-lg animate-in zoom-in-95 relative z-10" onClick={e => e.stopPropagation()}>
                                                                        <div className="flex justify-between items-center mb-2">
                                                                            <span className="text-[10px] font-bold text-gray-500">修改号码 (选号)</span>
                                                                            <div className="flex gap-2 text-[10px]">
                                                                                <span className="text-red-500 font-bold">{editState.reds.length}红</span>
                                                                                <span className="text-blue-500 font-bold">{editState.blues.length}蓝</span>
                                                                            </div>
                                                                        </div>

                                                                        {/* Red Grid (7 cols) */}
                                                                        <div className="grid grid-cols-7 gap-1 mb-3">
                                                                            {Array.from({ length: 35 }, (_, k) => k + 1).map(n => {
                                                                                const selected = editState.reds.includes(n);
                                                                                return (
                                                                                    <button key={n} onClick={() => handleEditNumber(t, 'red', n)} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${selected ? 'bg-red-500 text-white shadow-md scale-105' : 'bg-gray-100 text-gray-400'}`}>
                                                                                        {String(n).padStart(2, '0')}
                                                                                    </button>
                                                                                )
                                                                            })}
                                                                        </div>

                                                                        {/* Blue Grid (6 cols) */}
                                                                        <div className="grid grid-cols-6 gap-1 mb-3">
                                                                            {Array.from({ length: 12 }, (_, k) => k + 1).map(n => {
                                                                                const selected = editState.blues.includes(n);
                                                                                return (
                                                                                    <button key={n} onClick={() => handleEditNumber(t, 'blue', n)} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${selected ? 'bg-blue-500 text-white shadow-md scale-105' : 'bg-blue-50 text-blue-300'}`}>
                                                                                        {String(n).padStart(2, '0')}
                                                                                    </button>
                                                                                )
                                                                            })}
                                                                        </div>

                                                                        {/* Actions */}
                                                                        <div className="flex gap-2">
                                                                            <button onClick={handleCloseEditor} className="flex-1 py-2 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 active:scale-95">取消</button>
                                                                            <button onClick={() => handleSaveEdit(t)} className="flex-1 py-2 bg-blue-600 rounded-lg text-xs font-bold text-white shadow-md active:scale-95">确认修改</button>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        /* Fallback */
                                                        <div className="flex items-center py-1.5 min-h-[32px]">
                                                            {/* Reds: Flex-8 Right (Inline) */}
                                                            <div style={{ display: 'grid', flex: 8, gridTemplateColumns: 'repeat(8, 1fr)', placeItems: 'center', paddingRight: '8px' }}>
                                                                {Array.from({ length: Math.max(0, 8 - t.reds.length) }).map((_, i) => <div key={`e-${i}`} />)}
                                                                {t.reds.map((n, i) => (
                                                                    <div key={i} className="w-6 h-6 rounded-full bg-red-50 text-red-600 font-bold flex items-center justify-center text-xs leading-none shadow-sm border border-red-100 flex-shrink-0">
                                                                        {String(n).padStart(2, '0')}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                            <div className="w-[1px] h-5 bg-gray-200 flex-none opacity-60"></div>
                                                            {/* Blues: Flex-3 Left (Inline) */}
                                                            <div style={{ display: 'grid', flex: 3, gridTemplateColumns: 'repeat(3, 1fr)', placeItems: 'center', paddingLeft: '8px' }}>
                                                                {t.blues.map((n, i) => (
                                                                    <div key={i} className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-xs leading-none shadow-sm border border-blue-100 flex-shrink-0">
                                                                        {String(n).padStart(2, '0')}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="absolute bottom-1 right-1 opacity-5 font-black text-xl text-gray-400 rotate-[-15deg] pointer-events-none select-none tracking-widest">
                                                    {storeConfig.watermarkText || '幸运号码'}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                {/* Summary Footer */}
                                {tickets.length > 0 && (
                                    <div className="p-4 bg-white border-t border-dashed border-gray-300 flex justify-between items-center shadow-[0_-5px_15px_rgba(0,0,0,0.03)] z-10 rounded-b-xl relative">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-gray-400 font-bold uppercase">快乐购彩！理性投注！</span>
                                            <span className="font-bold text-gray-700">合计金额</span>
                                        </div>
                                        <span className="font-black text-2xl text-red-600 tracking-tighter">
                                            ¥{tickets.reduce((acc, t) => acc + t.price, 0)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}

                    </div>

                    {/* --- Share Modal --- */}
                    {showShareModal && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                            <div className={`absolute inset-0 bg-black/60 transition-opacity ${isLowPerf ? '' : 'backdrop-blur-md'}`} onClick={() => setShowShareModal(false)}></div>

                            <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col transform transition-all animate-bounce-in">
                                {/* Header */}
                                <div className="bg-orange-500 p-4 text-center relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-white/10 rounded-full -mr-10 -mt-10 blur-xl"></div>
                                    <div className="absolute bottom-0 left-0 w-16 h-16 bg-white/10 rounded-full -ml-8 -mb-8 blur-lg"></div>

                                    <h3 className="text-white font-black text-xl tracking-wider drop-shadow-sm">截图分享</h3>
                                    <p className="text-white/80 text-xs font-bold mt-0.5">我的{storeConfig.watermarkText || '幸运号码'}清单</p>

                                    <button
                                        onClick={() => setShowShareModal(false)}
                                        className="absolute top-3 right-3 text-white/70 hover:text-white w-8 h-8 flex items-center justify-center rounded-full bg-black/10 hover:bg-black/20 transition-all"
                                    >
                                        <i className="fa-solid fa-xmark"></i>
                                    </button>
                                </div>

                                {/* Content (Locked Tickets Only) */}
                                <div className="bg-gray-100 p-4 max-h-[60vh] overflow-y-auto">
                                    {/* Inner container for capture to ensure full height and background are captured */}
                                    <div ref={shareRef} className="text-left" style={{ backgroundColor: '#F3F4F6', padding: '16px' }}>
                                        {tickets.filter(t => t.locked).length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                                                <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                                                    <i className="fa-solid fa-lock-open text-3xl"></i>
                                                </div>
                                                <div className="text-center">
                                                    <p className="font-bold text-gray-600">暂无锁定号码</p>
                                                    <p className="text-xs mt-1">请先点击彩票上的 <i className="fa-solid fa-lock text-yellow-500 mx-1"></i> 进行锁定</p>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="space-y-3">
                                                {/* User Info Mock */}
                                                <div className="flex items-start gap-3 mb-4 mx-1">
                                                    <div className="flex-none w-12 h-12 rounded-full overflow-hidden mt-1" style={{ backgroundColor: '#FFFFFF', border: '2px solid #FFFFFF', padding: '2px', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }}>
                                                        <img
                                                            src={logoDlt}
                                                            crossOrigin="anonymous"
                                                            alt="Logo"
                                                            className="w-full h-full object-contain rounded-full"
                                                        />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        {/* Row 1: Title + Total Badge */}
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <h2 className="text-xl font-black text-gray-900" style={{ fontFamily: '"Microsoft YaHei", sans-serif' }}>
                                                                        超级大乐透
                                                                    </h2>
                                                                </div>

                                                            </div>



                                                            <div className="flex flex-col items-end">
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-gray-900 font-extrabold text-lg" style={{ fontFamily: '"Microsoft YaHei", sans-serif' }}>合计</span>
                                                                    <span className="text-red-600 font-black text-xl tracking-tight" style={{ fontFamily: '"Microsoft YaHei", sans-serif' }}>¥{tickets.filter(t => t.locked).reduce((sum, t) => sum + t.price, 0)}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Row 2: Period Info */}
                                                        <div className="flex items-center gap-2 mt-0.5">
                                                            <svg width="240" height="24" viewBox="0 0 240 24" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                                                                <text x="0" y="17" fill="#6B7280" fontSize="12" fontFamily="sans-serif">
                                                                    <tspan fontWeight="900">{nextPeriodStr}</tspan>
                                                                    <tspan dx="12" fontWeight="normal">{nextDateStr} 开奖</tspan>
                                                                </text>
                                                            </svg>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Slogan */}
                                                <div className="flex justify-center -mt-1 mb-2">
                                                    <svg width="200" height="20" viewBox="0 0 200 20" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                                                        <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#6B7280" fontSize="12" fontWeight="bold" fontFamily="sans-serif">快乐购彩！理性投注！</text>
                                                    </svg>
                                                </div>

                                                {/* Cards */}
                                                {tickets.filter(t => t.locked).map(t => (
                                                    <div key={t.id} className="relative overflow-hidden" style={{
                                                        background: 'linear-gradient(to right, #FACC15 6px, #FFFFFF 6px)',
                                                        borderRadius: '0.75rem',
                                                        padding: '12px',
                                                        paddingLeft: '18px', // Slightly adjusted for spacing
                                                        boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
                                                        marginBottom: '12px'
                                                    }}>
                                                        <div className="flex items-center gap-2 mb-2 pb-2" style={{ borderBottom: '1px dashed #F3F4F6' }}>
                                                            {/* SVG Tag */}
                                                            <div style={{ display: 'flex', alignItems: 'center', boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                                <svg width="34" height="20" viewBox="0 0 34 20" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                                                                    <rect width="100%" height="100%" fill={t.tag === '套餐' ? '#14B8A6' : '#EF4444'} />
                                                                    <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="white" fontSize="11" fontWeight="bold" fontFamily="sans-serif">{t.tag}</text>
                                                                </svg>
                                                            </div>
                                                            {/* Type SVG */}
                                                            <svg width="60" height="20" viewBox="0 0 60 20" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                                                                <text x="0" y="55%" dominantBaseline="central" textAnchor="start" fill="#1F2937" fontSize="12" fontWeight="bold" fontFamily="sans-serif">{t.type}</text>
                                                            </svg>
                                                            {/* Price SVG */}
                                                            <div className="ml-auto">
                                                                <svg width="80" height="20" viewBox="0 0 80 20" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                                                                    <text x="100%" y="55%" dominantBaseline="central" textAnchor="end" fill="#DC2626" fontSize="14" fontWeight="900" fontFamily="sans-serif">¥{t.price}</text>
                                                                </svg>
                                                            </div>
                                                        </div>
                                                        {t.bets && t.bets.map((bet, bIdx) => (
                                                            <div key={bIdx} className="flex items-center py-1.5" style={{ borderBottom: '1px dashed #F3F4F6', minHeight: '32px' }}>
                                                                {/* Reds: Grid 8 cols - Right aligned (fill from right) */}
                                                                <div style={{
                                                                    flex: 8,
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(8, 1fr)',
                                                                    gap: '1px',
                                                                    paddingRight: '4px',
                                                                    justifyItems: 'center',
                                                                    alignItems: 'center'
                                                                }}>
                                                                    {/* Add spacers to align right (push bits to the end columns) */}
                                                                    {Array.from({ length: Math.max(0, 8 - bet.reds.length) }).map((_, i) => (
                                                                        <div key={`spacer-${i}`} />
                                                                    ))}

                                                                    {/* Render balls */}
                                                                    {bet.reds.map((n, i) => (
                                                                        <div key={i} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                                                            <svg width="20" height="20" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                                                                                <circle cx="50%" cy="50%" r="9" fill="#FEF2F2" stroke="#FEE2E2" strokeWidth="1.5" />
                                                                                <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#DC2626" fontSize="11" fontWeight="bold" fontFamily="sans-serif">{String(n).padStart(2, '0')}</text>
                                                                            </svg>
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Fixed Divider */}
                                                                <div className="w-[1px] h-4 flex-none opacity-60" style={{ backgroundColor: '#D1D5DB' }}></div>

                                                                {/* Blues: Grid 3 cols */}
                                                                <div style={{
                                                                    flex: 3,
                                                                    display: 'grid',
                                                                    gridTemplateColumns: 'repeat(3, 1fr)',
                                                                    gap: '1px',
                                                                    paddingLeft: '4px',
                                                                    justifyItems: 'center',
                                                                    alignItems: 'center'
                                                                }}>
                                                                    {bet.blues.map((n, i) => (
                                                                        <div key={i} style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
                                                                            <svg width="20" height="20" viewBox="0 0 22 22" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                                                                                <circle cx="50%" cy="50%" r="9" fill="#EFF6FF" stroke="#DBEAFE" strokeWidth="1.5" />
                                                                                <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#2563EB" fontSize="11" fontWeight="bold" fontFamily="sans-serif">{String(n).padStart(2, '0')}</text>
                                                                            </svg>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {/* Watermark SVG (Adaptive Pattern) */}
                                                        <div style={{
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            bottom: 0,
                                                            pointerEvents: 'none',
                                                            zIndex: 0,
                                                            overflow: 'hidden'
                                                        }}>
                                                            <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                                                                <defs>
                                                                    <pattern id={`watermark-pattern-${t.id}-${storeConfig.watermarkText}`} width="100" height="60" patternUnits="userSpaceOnUse" patternTransform="rotate(-25)">
                                                                        <text x="50" y="30" dominantBaseline="middle" textAnchor="middle" fill="#9CA3AF" fontSize="16" fontWeight="bold" fontFamily="sans-serif" style={{ opacity: 0.15 }}>{storeConfig.watermarkText || '幸运号码'}</text>
                                                                    </pattern>
                                                                </defs>
                                                                <rect width="100%" height="100%" fill={`url(#watermark-pattern-${t.id}-${storeConfig.watermarkText})`} />
                                                            </svg>
                                                        </div>
                                                    </div>
                                                ))}

                                                <div className="h-4"></div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Share Actions (Bottom) */}
                                <div className="bg-white p-5 pt-4">
                                    <div className={`grid ${(isMobile && !isNativeApp) ? 'grid-cols-1' : 'grid-cols-2'} gap-4`}>
                                        {/* Mobile Web: Save Image (Hidden in APK) */}
                                        {isMobile && !isNativeApp && (
                                            <button
                                                onClick={async () => {
                                                    if (!shareRef.current) return;

                                                    // Create a clone to avoid transform/animation issues
                                                    const original = shareRef.current;
                                                    const clone = original.cloneNode(true);

                                                    // Wrapper to isolate context - Exact Width Match
                                                    const wrapper = document.createElement('div');
                                                    wrapper.style.position = 'absolute';
                                                    wrapper.style.top = window.scrollY + 'px';
                                                    wrapper.style.top = '0';
                                                    wrapper.style.left = '0';
                                                    wrapper.style.width = original.offsetWidth + 'px';
                                                    wrapper.style.height = 'auto';
                                                    wrapper.style.zIndex = '-9999';
                                                    wrapper.style.overflow = 'visible';
                                                    wrapper.style.overflow = 'hidden';
                                                    wrapper.style.pointerEvents = 'none';
                                                    wrapper.style.backgroundColor = '#ffffff';

                                                    clone.style.width = '100%';
                                                    clone.style.position = 'relative';
                                                    clone.style.margin = '0';
                                                    clone.style.transform = 'none';
                                                    clone.style.backgroundColor = '#F3F4F6';
                                                    clone.style.display = 'block';

                                                    wrapper.appendChild(clone);
                                                    document.body.appendChild(wrapper);

                                                    await new Promise(resolve => setTimeout(resolve, 100));

                                                    try {
                                                        const rect = clone.getBoundingClientRect();

                                                        const html2canvas = (await import('html2canvas')).default;
                                                        const canvas = await html2canvas(clone, {
                                                            useCORS: true,
                                                            backgroundColor: '#F3F4F6',
                                                            scale: 3,
                                                            logging: false,
                                                            scrollX: 0,
                                                            scrollY: 0,
                                                            width: wrapper.offsetWidth,
                                                            windowWidth: wrapper.offsetWidth,
                                                            height: rect.height,
                                                            windowHeight: rect.height,
                                                            x: 0,
                                                            y: 0
                                                        });

                                                        document.body.removeChild(wrapper);

                                                        const imgData = canvas.toDataURL('image/png');

                                                        // Try native sharing first
                                                        if (navigator.share) {
                                                            try {
                                                                const blob = await (await fetch(imgData)).blob();
                                                                const file = new File([blob], 'lucky-dlt.png', { type: 'image/png' });

                                                                if (navigator.canShare({ files: [file] })) {
                                                                    await navigator.share({
                                                                        files: [file],
                                                                        title: (storeConfig.name || '大乐透') + ' ' + (storeConfig.watermarkText || '幸运号码'),
                                                                        text: '这是我的超级大乐透选号，祝我好运！'
                                                                    });
                                                                    return;
                                                                }
                                                            } catch (e) { console.warn("Share failed", e); }
                                                        }

                                                        // Force Download
                                                        try {
                                                            const link = document.createElement('a');
                                                            link.href = imgData;
                                                            link.download = `dlt-${Date.now()}.png`;
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            document.body.removeChild(link);
                                                        } catch (err) {
                                                            setShareImage(imgData);
                                                        }
                                                    } catch (err) {
                                                        console.error("Share failed:", err);
                                                        if (document.body.contains(wrapper)) {
                                                            document.body.removeChild(wrapper);
                                                        }
                                                        alert("图片生成失败: " + (err.message || "未知错误") + "\n请尝试长按截图区域手动保存。");
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-2 group py-2"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-200 group-active:scale-95 transition-all">
                                                    <i className="fa-solid fa-download text-lg"></i>
                                                </div>
                                                <span className="text-xs text-gray-700 font-medium">保存图片</span>
                                            </button>
                                        )}

                                        {/* PC or APK: QR Code for download */}
                                        {(!isMobile || isNativeApp) && (
                                            <button
                                                onClick={async () => {
                                                    if (!shareRef.current) return;

                                                    const original = shareRef.current;
                                                    const clone = original.cloneNode(true);

                                                    const wrapper = document.createElement('div');
                                                    wrapper.style.position = 'absolute';
                                                    wrapper.style.top = '0';
                                                    wrapper.style.left = '0';
                                                    wrapper.style.width = original.offsetWidth + 'px';
                                                    wrapper.style.height = 'auto';
                                                    wrapper.style.zIndex = '-9999';
                                                    wrapper.style.overflow = 'hidden';
                                                    wrapper.style.pointerEvents = 'none';
                                                    wrapper.style.backgroundColor = '#ffffff';

                                                    clone.style.width = '100%';
                                                    clone.style.position = 'relative';
                                                    clone.style.margin = '0';
                                                    clone.style.transform = 'none';
                                                    clone.style.backgroundColor = '#F3F4F6';
                                                    clone.style.display = 'block';

                                                    wrapper.appendChild(clone);
                                                    document.body.appendChild(wrapper);

                                                    await new Promise(resolve => setTimeout(resolve, 100));

                                                    try {
                                                        const rect = clone.getBoundingClientRect();

                                                        const html2canvas = (await import('html2canvas')).default;
                                                        const canvas = await html2canvas(clone, {
                                                            useCORS: true,
                                                            backgroundColor: '#F3F4F6',
                                                            scale: 3,
                                                            logging: false,
                                                            scrollX: 0,
                                                            scrollY: 0,
                                                            width: wrapper.offsetWidth,
                                                            windowWidth: wrapper.offsetWidth,
                                                            height: rect.height,
                                                            windowHeight: rect.height,
                                                            x: 0,
                                                            y: 0
                                                        });

                                                        document.body.removeChild(wrapper);

                                                        const imgData = canvas.toDataURL('image/png');

                                                        // Generate QR code
                                                        const qrResponse = await fetch('/api/generate-qr', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ dataUrl: imgData })
                                                        });
                                                        const qrData = await qrResponse.json();
                                                        if (qrData.success) {
                                                            setQrCodeImage(qrData.qrCode);
                                                        } else {
                                                            alert('二维码生成失败');
                                                        }
                                                    } catch (err) {
                                                        console.error("QR generation failed:", err);
                                                        if (document.body.contains(wrapper)) {
                                                            document.body.removeChild(wrapper);
                                                        }
                                                        alert("二维码生成失败: " + (err.message || "未知错误"));
                                                    }
                                                }}
                                                className="flex flex-col items-center gap-2 group py-2"
                                            >
                                                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 group-hover:bg-purple-200 group-active:scale-95 transition-all">
                                                    <i className="fa-solid fa-qrcode text-lg"></i>
                                                </div>
                                                <span className="text-xs text-gray-700 font-medium">扫码下载</span>
                                            </button>
                                        )}
                                    </div>
                                </div>

                            </div>

                            {/* QR Code Floating Overlay - Covers Screenshot */}
                            {qrCodeImage && (
                                <div
                                    className={`fixed inset-0 bg-black/60 flex items-center justify-center z-[99999] animate-in fade-in ${isLowPerf ? '' : 'backdrop-blur-sm'}`}
                                    onClick={() => setQrCodeImage(null)}
                                >
                                    <div
                                        className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm mx-4 animate-in zoom-in-95"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <p className="text-base text-gray-700 font-bold text-center">请使用手机扫描下载图片</p>
                                        <img
                                            src={qrCodeImage}
                                            alt="QR Code"
                                            className="w-64 h-64 bg-white p-3 rounded-xl border-2 border-gray-100"
                                        />
                                        <button
                                            onClick={() => setQrCodeImage(null)}
                                            className="px-6 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 active:scale-95 transition-all font-medium text-sm"
                                        >
                                            关闭
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                    }

                    {/* Generated Image Modal (WeChat/Fallback) */}
                    {
                        shareImage && (
                            <div className={`fixed inset-0 z-[99999] bg-black/95 overflow-y-auto overflow-x-hidden ${isLowPerf ? '' : 'backdrop-blur-sm'}`} onClick={() => setShareImage(null)}>
                                <div className="min-h-full w-full flex flex-col items-center justify-start p-6 pt-16 pb-12">

                                    {/* Fixed Close Button */}
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setShareImage(null); }}
                                        className={`fixed top-4 right-4 w-10 h-10 bg-white/10 text-white rounded-full flex items-center justify-center ${isLowPerf ? '' : 'backdrop-blur-md'} border border-white/20 shadow-lg active:scale-90 transition-all z-[100000]`}
                                    >
                                        <i className="fa-solid fa-xmark text-lg"></i>
                                    </button>

                                    {/* Tips at Top */}
                                    <div className="text-center mb-6 space-y-1 animate-fade-in" onClick={e => e.stopPropagation()}>
                                        <p className="text-xl font-black text-yellow-400 drop-shadow-md">长按下方图片</p>
                                        <p className="text-sm text-gray-300">{isWeChat ? '选择「发送给朋友」或「保存图片」' : '选择「保存到相册」'}</p>
                                    </div>

                                    {/* Scrollable Image */}
                                    <img
                                        src={shareImage}
                                        alt="Generated Share"
                                        className="w-full max-w-[375px] h-auto rounded-xl shadow-2xl ring-1 ring-white/10"
                                        onClick={e => e.stopPropagation()}
                                    />
                                </div>
                            </div>
                        )
                    }
                </div>
            </div >
        </div >
    );
}

// Sub-components
const BetButton = ({ label, sub, color, onClick, compact = false, hidePrice = false }) => {
    const styles = {
        orange: {
            bg: 'bg-gradient-to-br from-orange-50 to-orange-100',
            border: 'border-orange-200',
            text: 'text-orange-800',
            subBg: 'bg-orange-500',
            subText: 'text-white',
            hover: 'hover:border-orange-400 hover:shadow-orange-100 hover:from-orange-100 hover:to-orange-200'
        },
        blue: {
            bg: 'bg-gradient-to-br from-blue-50 to-blue-100',
            border: 'border-blue-200',
            text: 'text-blue-800',
            subBg: 'bg-blue-500',
            subText: 'text-white',
            hover: 'hover:border-blue-400 hover:shadow-blue-100 hover:from-blue-100 hover:to-blue-200'
        },
    };

    const current = styles[color];

    const labelClass = compact ? 'text-base' : (hidePrice ? 'text-base' : 'text-lg');
    const subClass = compact ? 'text-[10px] py-0.5 max-w-[70px]' : 'text-xs py-0.5 max-w-[80px]';
    const paddingClass = compact ? 'py-1.5 px-1' : (hidePrice ? 'py-1 px-1' : 'py-2 px-1');

    return (
        <button onClick={onClick} className={`h-full flex flex-col items-center justify-center ${paddingClass} rounded-xl border-2 shadow-sm transition-all duration-300 transform active:scale-95 group relative overflow-hidden ${current.bg} ${current.border} ${current.hover}`}>
            {/* Background decoration */}
            <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-full opacity-10 transition-transform group-hover:scale-150 ${color === 'orange' ? 'bg-orange-500' : 'bg-blue-500'} -mr-3 -mt-3`}></div>

            <span className={`${labelClass} font-black italic tracking-tighter z-10 mb-1 ${current.text} group-hover:scale-110 transition-transform`}>{label}</span>
            {!hidePrice && (
                <div className={`${subClass} font-bold rounded-full z-10 shadow-sm w-full text-center ${current.subBg} ${current.subText}`}>{sub}</div>
            )}
        </button>
    );
};

const PackageButton = ({ price, content, onClick, compact = false, hidePrice = false }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-between ${compact ? 'p-1.5' : 'p-2'} bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-100 rounded-xl hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all text-center group hover:border-emerald-300 w-full h-full relative overflow-hidden`}>
        <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-400/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-150"></div>
        <div className="absolute bottom-0 left-0 w-12 h-12 bg-teal-400/10 rounded-tr-full -ml-4 -mb-4 transition-transform group-hover:scale-150"></div>

        <div className="flex flex-col items-center justify-center flex-1 z-10 w-full gap-0.5">
            {content.map((line, i) => {
                let sizeClass;
                if (compact) sizeClass = 'text-xs';
                else if (hidePrice) {
                    if (content.length >= 3) sizeClass = 'text-[10px]';
                    else sizeClass = line.length > 7 ? 'text-xs' : 'text-sm';
                } else sizeClass = line.length > 7 ? 'text-sm' : 'text-base';
                return (
                    <div key={i} className={`font-black text-emerald-800 leading-none ${sizeClass}`}>
                        {line}
                    </div>
                );
            })}
        </div>

        {!hidePrice && (
            <div className={`mt-1.5 z-10 w-full ${compact ? 'px-2' : 'px-4'}`}>
                <div className={`mx-auto bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-bold rounded-full ${compact ? 'text-[9px] py-0.5 max-w-[70px]' : 'text-xs py-0.5 max-w-[80px]'} shadow-md group-hover:shadow-lg group-hover:scale-105 transition-all w-full`}>
                    &yen;{price}
                </div>
            </div>
        )}
    </button>
);

const MobileCouponButton = ({ price, title, subTitle, color = 'green', onClick, className = '' }) => {
    const isGreen = color === 'green';
    const bgClass = isGreen ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200';
    const priceBg = isGreen ? 'bg-emerald-500' : 'bg-orange-500';
    const textColor = isGreen ? 'text-emerald-900' : 'text-orange-900';
    const subTextColor = isGreen ? 'text-emerald-600' : 'text-orange-600';
    const circleColor = isGreen ? 'bg-emerald-500' : 'bg-orange-500';

    return (
        <button onClick={onClick} className={`relative flex items-center w-full border rounded-lg overflow-hidden shadow-sm active:scale-95 transition-transform ${bgClass} ${className}`}>
            {/* Left: Price Section */}
            <div className={`w-[35%] h-full flex flex-col items-center justify-center text-white font-black italic ${priceBg} relative`}>
                <div className="flex items-baseline">
                    <span className="text-xs mr-0.5 not-italic opacity-90 font-bold">¥</span>
                    <span className="text-2xl tracking-tighter">{price}</span>
                </div>

                {/* Dashed Separator Line */}
                <div className="absolute right-0 top-1.5 bottom-1.5 border-r-2 border-dashed border-white/40"></div>

                {/* Perforation holes at ends */}
                <div className="absolute -right-1.5 -top-1.5 w-3 h-3 bg-white rounded-full z-10"></div>
                <div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-white rounded-full z-10"></div>
            </div>

            {/* Right: Content Section */}
            <div className="flex-1 h-full flex flex-col items-start justify-center pl-4 pr-1 relative z-10 py-0.5 overflow-hidden">
                <div className={`font-black text-xl text-left w-full flex flex-col justify-center gap-0.5 ${textColor}`}>
                    {title}
                </div>
                {subTitle && <div className={`text-xs mt-0.5 leading-none font-bold opacity-80 ${subTextColor}`}>{subTitle}</div>}

                {/* Decorative Circles */}
                <div className={`absolute -right-4 -top-4 w-12 h-12 rounded-full opacity-[0.08] ${circleColor} pointer-events-none`}></div>
                <div className={`absolute -right-2 -bottom-6 w-16 h-16 rounded-full opacity-[0.08] ${circleColor} pointer-events-none`}></div>
            </div>
        </button>
    );
};



// --- MOBILE EDITOR COMPONENT ---
const MobileTicketEditor = ({ ticket, betIndex, editState, onEdit, onClose, onSave }) => {
    if (!ticket) return null;

    // Use Portal to render outside of any overflow/transform containers
    return createPortal(
        <div className="fixed inset-0 z-[9999] flex flex-col justify-end" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, top: 0 }}>
            {/* Backdrop */}
            <div className={`absolute inset-0 bg-black/60 transition-opacity ${isLowPerf ? '' : 'backdrop-blur-sm'}`} onClick={onClose}></div>

            {/* Sheet */}
            <div className="bg-white w-full rounded-t-3xl shadow-2xl relative z-10 animate-in slide-in-from-bottom duration-300 flex flex-col max-h-[80vh] safe-area-bottom">

                {/* Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    {/* Row 1: Title Info & Close */}
                    <div className="flex justify-between items-start mb-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 text-white rounded shadow-sm ${ticket.tag === '套餐' ? 'bg-teal-500' : 'bg-red-500'}`}>
                                    {ticket.tag}
                                </span>
                                <span className="text-sm font-black text-gray-800">{ticket.type}</span>
                            </div>
                            {ticket.tag !== '套餐' && (
                                <div className="text-lg font-black text-red-600 tracking-tight">
                                    ¥{ticket.price}
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 flex items-center justify-center hover:bg-gray-50 active:scale-90 transition-all shadow-sm">
                            <i className="fa-solid fa-xmark text-lg"></i>
                        </button>
                    </div>

                    {/* Row 2: Original Numbers Display */}
                    <div className="bg-white border border-dashed border-gray-200 rounded-lg p-2 flex items-center shadow-sm">
                        <div className="text-[10px] text-gray-400 font-bold mr-2 whitespace-nowrap">原号</div>

                        {/* Visual Balls (Same Layout as List) */}
                        <div className="flex-1 flex items-center overflow-hidden">
                            {/* Reds */}
                            <div className="flex items-center gap-0.5">
                                {ticket.bets[betIndex].reds.map((n, i) => (
                                    <div key={`r-${i}`} className="w-5 h-5 rounded-full bg-red-50 text-red-600 font-bold flex items-center justify-center text-[10px] leading-none border border-red-100 flex-shrink-0">
                                        {String(n).padStart(2, '0')}
                                    </div>
                                ))}
                            </div>
                            {/* Divider */}
                            <div className="w-[1px] h-3 bg-gray-300 mx-2 flex-none"></div>
                            {/* Blues */}
                            <div className="flex items-center gap-0.5">
                                {ticket.bets[betIndex].blues.map((n, i) => (
                                    <div key={`b-${i}`} className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 font-bold flex items-center justify-center text-[10px] leading-none border border-blue-100 flex-shrink-0">
                                        {String(n).padStart(2, '0')}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Status Bar */}
                    <div className="flex justify-center gap-4 mb-2">
                        <div className="flex items-center gap-2 bg-red-50 text-red-600 px-3 py-1.5 rounded-full font-bold text-sm shadow-sm border border-red-100">
                            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                            {editState.reds.length} 红球
                        </div>
                        <div className="flex items-center gap-2 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-full font-bold text-sm shadow-sm border border-blue-100">
                            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                            {editState.blues.length} 蓝球
                        </div>
                    </div>

                    {/* Red Section */}
                    <div>
                        <h4 className="font-bold text-gray-700 mb-3 flex items-center">
                            <div className="w-1 h-4 bg-red-500 rounded-full mr-2"></div>
                            前区 (红球)
                        </h4>
                        <div className="grid grid-cols-7 gap-y-3 gap-x-2 place-items-center">
                            {Array.from({ length: 35 }, (_, k) => k + 1).map(n => {
                                const selected = editState.reds.includes(n);
                                return (
                                    <button
                                        key={n}
                                        onClick={() => onEdit(ticket, 'red', n)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm ${selected
                                            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-red-200 shadow-lg scale-110 ring-2 ring-red-200'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:border-red-200 active:scale-95'
                                            }`}
                                    >
                                        {String(n).padStart(2, '0')}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Blue Section */}
                    <div>
                        <h4 className="font-bold text-gray-700 mb-3 flex items-center">
                            <div className="w-1 h-4 bg-blue-500 rounded-full mr-2"></div>
                            后区 (蓝球)
                        </h4>
                        <div className="grid grid-cols-6 gap-y-3 gap-x-2 place-items-center">
                            {Array.from({ length: 12 }, (_, k) => k + 1).map(n => {
                                const selected = editState.blues.includes(n);
                                return (
                                    <button
                                        key={n}
                                        onClick={() => onEdit(ticket, 'blue', n)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base transition-all shadow-sm ${selected
                                            ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-blue-200 shadow-lg scale-110 ring-2 ring-blue-200'
                                            : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-200 active:scale-95'
                                            }`}
                                    >
                                        {String(n).padStart(2, '0')}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white border-t border-gray-100 flex gap-3 pb-8">
                    <button
                        onClick={onClose}
                        className="flex-[1] py-3.5 rounded-xl bg-gray-50 text-gray-600 font-bold text-sm hover:bg-gray-100 active:scale-95 transition-all"
                    >
                        取消
                    </button>
                    <button
                        onClick={() => onSave(ticket)}
                        className="flex-[2] py-3.5 rounded-xl bg-blue-600 text-white font-bold text-lg shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <i className="fa-solid fa-check"></i> 确认修改
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};
