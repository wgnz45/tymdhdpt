import React, { useEffect, useState, useRef, createContext, useContext } from 'react';
import { Outlet, useParams, useLocation, useNavigate } from 'react-router-dom';
import { StoreDataProvider, useStoreData } from '../hooks/useStoreData';
import { getHeartbeatIntervalMs, shouldUpdateState } from '../utils/performanceConfig';

const HeartbeatContext = createContext({ announcements: [], availableTags: [], announcementConfig: null });
export const useHeartbeat = () => useContext(HeartbeatContext);

// ── Device Info Collector (Web API) ──
function collectDeviceInfo() {
    const nav = navigator;
    const screen = window.screen;

    // Memory info (Chrome/Android WebView only)
    const mem = performance?.memory ? {
        jsHeapUsed: Math.round(performance.memory.usedJSHeapSize / 1048576),
        jsHeapTotal: Math.round(performance.memory.totalJSHeapSize / 1048576),
        jsHeapLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
    } : null;

    // Battery (async, filled later)
    const info = {
        // System
        userAgent: nav.userAgent,
        platform: nav.platform || nav.userAgentData?.platform || '',
        language: nav.language,
        cores: nav.hardwareConcurrency || null,
        deviceMemory: nav.deviceMemory || null, // GB (Chrome 63+)

        // Screen
        screenW: screen.width,
        screenH: screen.height,
        screenAvailW: screen.availWidth,
        screenAvailH: screen.availHeight,
        dpr: window.devicePixelRatio || 1,
        colorDepth: screen.colorDepth,

        // Viewport
        viewportW: window.innerWidth,
        viewportH: window.innerHeight,

        // Network
        connection: null,

        // Memory
        memory: mem,

        // GPU (from WebGL)
        gpu: null,

        // Battery (filled async)
        battery: null,
    };

    // Network info
    const conn = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (conn) {
        info.connection = {
            type: conn.effectiveType || conn.type || '',
            downlink: conn.downlink,
            rtt: conn.rtt,
            saveData: conn.saveData || false,
        };
    }

    // GPU info via WebGL
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
            const ext = gl.getExtension('WEBGL_debug_renderer_info');
            if (ext) {
                info.gpu = {
                    vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL),
                    renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL),
                };
            }
        }
    } catch { /* ignore */ }

    return info;
}

// ── Real-time Performance Monitor ──
const perfStats = {
    fps: 0,
    fpsMin: 999,
    fpsMax: 0,
    longTasks: 0,      // count of tasks > 50ms since last reset
    longTaskMs: 0,      // total ms of long tasks
    domNodes: 0,
    uptimeMs: 0,
    _startTime: Date.now(),
    _frames: 0,
    _lastFpsCalc: Date.now(),
    _running: false,
};

function startPerfMonitor() {
    if (perfStats._running) return;
    perfStats._running = true;
    perfStats._startTime = Date.now();

    // FPS counter via requestAnimationFrame
    let rafId;
    const countFrame = () => {
        perfStats._frames++;
        const now = Date.now();
        const elapsed = now - perfStats._lastFpsCalc;
        if (elapsed >= 1000) {
            perfStats.fps = Math.round(perfStats._frames * 1000 / elapsed);
            if (perfStats.fps < perfStats.fpsMin) perfStats.fpsMin = perfStats.fps;
            if (perfStats.fps > perfStats.fpsMax) perfStats.fpsMax = perfStats.fps;
            perfStats._frames = 0;
            perfStats._lastFpsCalc = now;
        }
        rafId = requestAnimationFrame(countFrame);
    };
    rafId = requestAnimationFrame(countFrame);

    // Long task observer (PerformanceObserver)
    let longTaskObs;
    try {
        if (typeof PerformanceObserver !== 'undefined') {
            longTaskObs = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                    perfStats.longTasks++;
                    perfStats.longTaskMs += Math.round(entry.duration);
                }
            });
            longTaskObs.observe({ type: 'longtask', buffered: false });
        }
    } catch { /* not supported */ }

    // DOM node counter (every 30s, use getElementsByTagName for zero-allocation count)
    const domTimer = setInterval(() => {
        perfStats.domNodes = document.getElementsByTagName('*').length;
    }, 30000);
    perfStats.domNodes = document.getElementsByTagName('*').length;

    return () => {
        cancelAnimationFrame(rafId);
        if (longTaskObs) longTaskObs.disconnect();
        clearInterval(domTimer);
        perfStats._running = false;
    };
}

function getPerfSnapshot() {
    const mem = performance?.memory ? {
        jsHeapUsed: Math.round(performance.memory.usedJSHeapSize / 1048576),
        jsHeapTotal: Math.round(performance.memory.totalJSHeapSize / 1048576),
        jsHeapLimit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
    } : null;

    return {
        fps: perfStats.fps,
        fpsMin: perfStats.fpsMin === 999 ? 0 : perfStats.fpsMin,
        fpsMax: perfStats.fpsMax,
        longTasks: perfStats.longTasks,
        longTaskMs: perfStats.longTaskMs,
        domNodes: perfStats.domNodes,
        uptimeSec: Math.round((Date.now() - perfStats._startTime) / 1000),
        memory: mem,
        timestamp: Date.now(),
    };
}

async function collectDeviceInfoAsync() {
    const info = collectDeviceInfo();
    // Battery API (async)
    try {
        if (navigator.getBattery) {
            const batt = await navigator.getBattery();
            info.battery = {
                level: Math.round(batt.level * 100),
                charging: batt.charging,
            };
        }
    } catch { /* ignore */ }

    // Storage estimate
    try {
        if (navigator.storage?.estimate) {
            const est = await navigator.storage.estimate();
            info.storage = {
                usedMB: Math.round((est.usage || 0) / 1048576),
                quotaMB: Math.round((est.quota || 0) / 1048576),
            };
        }
    } catch { /* ignore */ }

    return info;
}

// ── Client Error Reporter ──
function reportClientError(storeId, type, message, extra = {}) {
    if (!storeId) return;
    const mem = performance?.memory ? {
        used: Math.round(performance.memory.usedJSHeapSize / 1048576),
        total: Math.round(performance.memory.totalJSHeapSize / 1048576),
        limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576),
    } : null;
    fetch(`/api/store/${storeId}/error-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            type, message: String(message).slice(0, 500),
            stack: extra.stack ? String(extra.stack).slice(0, 1000) : '',
            url: window.location.href,
            memory: mem,
            timestamp: Date.now(),
        }),
    }).catch(() => {});
}

function StoreClientInner() {
    const { storeId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { announcements, annConfig } = useStoreData();
    const [heartbeatAnnouncements, setHeartbeatAnnouncements] = useState([]);
    const [availableTags, setAvailableTags] = useState([]);
    const [announcementConfig, setAnnouncementConfig] = useState(null);
    const visibleRef = useRef(true);
    const lastNavRef = useRef('');

    // ── Start perf monitor ──
    useEffect(() => {
        const cleanup = startPerfMonitor();
        return cleanup;
    }, []);

    // ── Global error & crash monitoring ──
    useEffect(() => {
        if (!storeId) return;

        const onError = (event) => {
            reportClientError(storeId, 'js_error', event.message || 'Unknown JS error', {
                stack: event.error?.stack || `${event.filename}:${event.lineno}:${event.colno}`,
            });
        };
        const onUnhandled = (event) => {
            const reason = event.reason;
            reportClientError(storeId, 'promise_reject', reason?.message || String(reason).slice(0, 300), {
                stack: reason?.stack,
            });
        };

        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onUnhandled);

        // Memory watchdog: report when JS heap > 80% of limit (Android WebView OOM predictor)
        let memTimer;
        if (performance?.memory) {
            memTimer = setInterval(() => {
                const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
                if (usedJSHeapSize / jsHeapSizeLimit > 0.8) {
                    reportClientError(storeId, 'memory_warning',
                        `JS Heap ${Math.round(usedJSHeapSize / 1048576)}MB / ${Math.round(jsHeapSizeLimit / 1048576)}MB (>${Math.round(usedJSHeapSize / jsHeapSizeLimit * 100)}%)`);
                }
            }, 60000);
        }

        // ── Last-breath snapshot: capture device state when page closes/crashes ──
        let lastBreathSent = false;
        const sendLastBreath = (reason) => {
            if (lastBreathSent) return;
            lastBreathSent = true;
            const snapshot = getPerfSnapshot();
            const payload = JSON.stringify({
                type: 'page_close',
                reason,
                perfSnapshot: snapshot,
                url: window.location.href,
                timestamp: Date.now(),
            });
            // sendBeacon needs Blob with correct content-type for Express json() to parse
            if (navigator.sendBeacon) {
                const blob = new Blob([payload], { type: 'application/json' });
                navigator.sendBeacon(`/api/store/${storeId}/last-breath`, blob);
            } else {
                // Fallback: sync XHR (last resort)
                try {
                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', `/api/store/${storeId}/last-breath`, false);
                    xhr.setRequestHeader('Content-Type', 'application/json');
                    xhr.send(payload);
                } catch { /* ignore */ }
            }
            // Reset after 3s so repeated events can fire again (e.g. visibility → unload)
            setTimeout(() => { lastBreathSent = false; }, 3000);
        };

        const onBeforeUnload = () => sendLastBreath('beforeunload');
        const onPageHide = (e) => sendLastBreath(e.persisted ? 'pagehide_bfcache' : 'pagehide');
        const onVisHidden = () => {
            if (document.visibilityState === 'hidden') sendLastBreath('visibilitychange_hidden');
        };

        window.addEventListener('beforeunload', onBeforeUnload);
        window.addEventListener('pagehide', onPageHide);
        document.addEventListener('visibilitychange', onVisHidden);

        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onUnhandled);
            window.removeEventListener('beforeunload', onBeforeUnload);
            window.removeEventListener('pagehide', onPageHide);
            document.removeEventListener('visibilitychange', onVisHidden);
            if (memTimer) clearInterval(memTimer);
        };
    }, [storeId]);

    const deviceInfoSentRef = useRef(0); // timestamp of last full device info send

    useEffect(() => {
        if (!storeId) return;

        const sendHeartbeat = async () => {
            if (!visibleRef.current) return;
            try {
                // Send device info every 5 minutes (300000ms)
                const now = Date.now();
                let deviceInfo = undefined;
                if (now - deviceInfoSentRef.current > 300000) {
                    try {
                        deviceInfo = await collectDeviceInfoAsync();
                        deviceInfoSentRef.current = now;
                    } catch { /* ignore */ }
                }

                const perfSnapshot = getPerfSnapshot();

                const res = await fetch(`/api/store/${storeId}/heartbeat`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        currentPage: location.pathname || '/',
                        perfSnapshot,
                        ...(deviceInfo ? { deviceInfo } : {}),
                    })
                });
                const data = await res.json();

                // 导航命令去抖：同一路径不重复跳转
                if (data.command && data.command.action === 'navigate') {
                    const targetPath = `/s/${storeId}${data.command.path}`;
                    if (lastNavRef.current !== targetPath) {
                        lastNavRef.current = targetPath;
                        navigate(targetPath);
                    }
                }
                // 强制刷新页面命令（显示提示后刷新）
                if (data.command && data.command.action === 'refresh') {
                    // 防止循环：同一命令只执行一次
                    const cmdTs = String(data.command.timestamp || '');
                    if (sessionStorage.getItem('cjdl_last_refresh') === cmdTs) return;
                    sessionStorage.setItem('cjdl_last_refresh', cmdTs);

                    // 清除可能残留的旧提示
                    const old = document.getElementById('cjdl-refresh-tip');
                    if (old) old.remove();

                    const tip = document.createElement('div');
                    tip.id = 'cjdl-refresh-tip';
                    tip.textContent = '后台正在刷新页面...';
                    Object.assign(tip.style, {
                        position: 'fixed', top: '0', left: '0', width: '100vw', height: '100vh',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(0,0,0,.8)', color: '#fde68a', padding: '24px 48px',
                        borderRadius: '16px', fontSize: '20px', fontWeight: 'bold', zIndex: '99999',
                        boxShadow: '0 4px 24px rgba(0,0,0,.4)', letterSpacing: '1px'
                    });
                    document.body.appendChild(tip);

                    // 2秒后无论如何移除提示，再尝试刷新
                    setTimeout(() => {
                        tip.remove();
                        // 用 href 赋值强制完整页面跳转（兼容 Android WebView）
                        const url = window.location.origin + window.location.pathname + window.location.search;
                        window.location.href = url + (url.includes('?') ? '&' : '?') + '_t=' + Date.now();
                    }, 2000);
                }
                // 手动采集命令：立即收集完整设备信息并上报
                if (data.command && data.command.action === 'collect_info') {
                    try {
                        const fullInfo = await collectDeviceInfoAsync();
                        const fullPerf = getPerfSnapshot();
                        await fetch(`/api/store/${storeId}/heartbeat`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                currentPage: location.pathname || '/',
                                perfSnapshot: fullPerf,
                                deviceInfo: fullInfo,
                            })
                        });
                        deviceInfoSentRef.current = Date.now();
                    } catch { /* ignore */ }
                }
                if (data.announcements && shouldUpdateState(heartbeatAnnouncements, data.announcements)) {
                    setHeartbeatAnnouncements(data.announcements);
                }
                if (Array.isArray(data.availableTags) && shouldUpdateState(availableTags, data.availableTags)) {
                    setAvailableTags(data.availableTags);
                }
                if (data.announcementConfig && shouldUpdateState(announcementConfig, data.announcementConfig)) {
                    setAnnouncementConfig(data.announcementConfig);
                }
            } catch {
                // 静默失败
            }
        };

        sendHeartbeat();
        // 从 10s 放宽到 30s（盒子模式）
        const intervalId = setInterval(sendHeartbeat, getHeartbeatIntervalMs({ isBoxMode: true }));

        const onVisibility = () => {
            visibleRef.current = document.visibilityState === 'visible';
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(intervalId);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [storeId, location.pathname, navigate]);

    // 合并心跳公告和统一数据层公告，心跳的优先
    const mergedAnnouncements = heartbeatAnnouncements.length > 0 ? heartbeatAnnouncements : announcements;
    const mergedConfig = announcementConfig || annConfig;

    return (
        <HeartbeatContext.Provider value={{ announcements: mergedAnnouncements, availableTags, announcementConfig: mergedConfig }}>
            <Outlet />
        </HeartbeatContext.Provider>
    );
}

export default function StoreClientLayout() {
    const { storeId } = useParams();
    return (
        <StoreDataProvider storeId={storeId}>
            <StoreClientInner />
        </StoreDataProvider>
    );
}
