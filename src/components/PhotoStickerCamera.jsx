import React, { useEffect, useRef, useState, useCallback } from 'react';
import { X, Camera, Download, RefreshCw, AlertTriangle, Sparkles, QrCode } from 'lucide-react';

/**
 * 中奖大头贴拍照组件（全屏覆盖）
 * 
 * 功能：
 *  - 调用前/后置摄像头实时预览
 *  - 在预览上覆盖大头贴 PNG 边框（中央透明区显示人脸）
 *  - 拍照后用 Canvas 合成「相机画面 + 边框」输出 JPEG
 *  - 支持下载到本地（Web 浏览器）/ 后续 APK 中可对接 Capacitor Filesystem 保存到相册
 * 
 * 用法：
 *  <PhotoStickerCamera open={state} onClose={() => setState(false)} />
 * 
 * 边框 PNG：内置多套边框，可通过左侧「✨ 边框」按钮切换
 *   边框列表全部从后台 /api/photo-frames 拉取（含内置种子 + 自定义上传）
 */

// 生产/开发环境下，APK 内调用本地局域网 API；普通浏览器走相对路径
const API_BASE = (typeof window !== 'undefined' && window.__API_BASE__) || '';

export default function PhotoStickerCamera({ open, onClose }) {
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const frameImgRef = useRef(null);

    const [phase, setPhase] = useState('idle'); // idle | requesting | preview | error | captured
    const [errorMsg, setErrorMsg] = useState('');
    const [facingMode, setFacingMode] = useState('user'); // user | environment
    const [capturedDataUrl, setCapturedDataUrl] = useState(null);
    const [frameLoaded, setFrameLoaded] = useState(false);
    const [frameIndex, setFrameIndex] = useState(0);
    const [frames, setFrames] = useState([]);
    const [countdown, setCountdown] = useState(0); // 0 表示无倒计时；3/2/1 表示当前数字
    const [qrCodeImage, setQrCodeImage] = useState(null);
    const [qrLoading, setQrLoading] = useState(false);
    const countdownTimerRef = useRef(null);

    const frameSrc = frames[frameIndex]?.url || '';
    const frameLabel = frames[frameIndex]?.label || '';

    const handleSwitchFrame = useCallback(() => {
        setFrameIndex((i) => (i + 1) % frames.length);
    }, [frames.length]);

    // ── 拉取服务端边框列表（开关打开时） ───────────
    useEffect(() => {
        if (!open) return;
        let cancelled = false;
        fetch(`${API_BASE}/api/photo-frames`, { cache: 'no-store' })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (cancelled || !data) return;
                if (Array.isArray(data.frames) && data.frames.length > 0) {
                    // 把相对 url 转成完整 url（APK 环境下指向局域网服务器）
                    setFrames(data.frames.map(f => ({
                        ...f,
                        url: f.url?.startsWith('http') ? f.url : `${API_BASE}${f.url}`,
                    })));
                }
            })
            .catch(e => {
                console.warn('[PhotoStickerCamera] 拉取边框列表失败', e);
                if (!cancelled) {
                    setErrorMsg('无法连接服务器，边框列表加载失败');
                    setPhase('error');
                }
            });
        return () => { cancelled = true; };
    }, [open]);

    // ── 预加载边框 PNG（切换边框时重新加载） ───────────────
    useEffect(() => {
        if (!open || !frameSrc) return; // frameSrc 为空时等 API 返回
        setFrameLoaded(false);
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            frameImgRef.current = img;
            setFrameLoaded(true);
        };
        img.onerror = () => {
            setErrorMsg('大头贴边框加载失败');
            setPhase('error');
        };
        img.src = frameSrc;
    }, [open, frameSrc]);

    // ── 启动摄像头 ──────────────────────────────
    const startCamera = useCallback(async (mode) => {
        setPhase('requesting');
        setErrorMsg('');
        try {
            // 1) API 是否存在
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                // 2) 非安全上下文（局域网 IP 访问安卓 Chrome 是这种情况）
                if (typeof window !== 'undefined' && window.isSecureContext === false) {
                    throw Object.assign(new Error('INSECURE_CONTEXT'), { name: 'InsecureContext' });
                }
                throw Object.assign(new Error('API_UNAVAILABLE'), { name: 'NotSupportedError' });
            }

            // 关掉旧流
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: mode,
                    width: { ideal: 1280 },
                    height: { ideal: 960 },
                },
                audio: false,
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                await videoRef.current.play().catch(() => {});
            }
            setPhase('preview');
        } catch (e) {
            console.error('[PhotoStickerCamera] getUserMedia failed:', e);
            const name = e?.name || '';
            const host = typeof location !== 'undefined' ? location.host : '';
            const proto = typeof location !== 'undefined' ? location.protocol : '';
            if (name === 'InsecureContext' || (proto === 'http:' && host && !host.startsWith('localhost') && !host.startsWith('127.0.0.1'))) {
                setErrorMsg(`非安全访问环境（${proto}//${host}）。\n安卓 Chrome 必须 HTTPS 或 localhost 才能调用摄像头。\n请用 APK 安装，或参考文档配置 HTTPS。`);
            } else if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
                setErrorMsg('未授权摄像头权限，请在系统设置中开启');
            } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
                setErrorMsg('未检测到摄像头设备');
            } else if (name === 'NotReadableError') {
                setErrorMsg('摄像头被其他应用占用');
            } else if (name === 'NotSupportedError') {
                setErrorMsg('当前浏览器不支持摄像头 API');
            } else {
                setErrorMsg('启动摄像头失败：' + (e?.message || name || '未知错误'));
            }
            setPhase('error');
        }
    }, []);

    // ── 打开/关闭时的副作用 ───────────────────────
    useEffect(() => {
        if (open) {
            startCamera(facingMode);
        }
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
                streamRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);


    // ── 拍照合成（不带倒计时的核心逻辑） ─────────────
    const handleCapture = useCallback(() => {
        const video = videoRef.current;
        const frameImg = frameImgRef.current;
        if (!video || !frameImg) {
            console.warn('[PhotoStickerCamera] 拍照失败：视频或边框未就绪', { video: !!video, frameImg: !!frameImg });
            return;
        }

        // 输出尺寸固定为边框 PNG 的尺寸（保持原图比例）
        const outW = frameImg.naturalWidth || 1024;
        const outH = frameImg.naturalHeight || 768;

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');

        // ── 第 1 层：摄像头画面（按 cover 方式裁剪到 outW × outH） ──
        const vw = video.videoWidth || outW;
        const vh = video.videoHeight || outH;
        const scale = Math.max(outW / vw, outH / vh);
        const drawW = vw * scale;
        const drawH = vh * scale;
        const dx = (outW - drawW) / 2;
        const dy = (outH - drawH) / 2;

        ctx.save();
        // 前置摄像头预览是镜像的，合成时还原成正向（避免文字反过来）
        if (facingMode === 'user') {
            ctx.translate(outW, 0);
            ctx.scale(-1, 1);
            ctx.drawImage(video, outW - dx - drawW, dy, drawW, drawH);
        } else {
            ctx.drawImage(video, dx, dy, drawW, drawH);
        }
        ctx.restore();

        // ── 第 2 层：大头贴边框（透明中央会让下层人脸露出） ──
        ctx.drawImage(frameImg, 0, 0, outW, outH);

        // 输出 JPEG
        const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
        setCapturedDataUrl(dataUrl);
        setPhase('captured');

        // 关闭摄像头流（节省资源）
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
    }, [facingMode]);

    // ── 快门按钮：3 秒倒计时 → 拍照 ──────────────────
    const handleShutter = useCallback(() => {
        if (countdown > 0) return; // 倒计时中再点忽略
        setCountdown(3);
        let n = 3;
        const tick = () => {
            n -= 1;
            if (n <= 0) {
                setCountdown(0);
                handleCapture();
                countdownTimerRef.current = null;
            } else {
                setCountdown(n);
                countdownTimerRef.current = setTimeout(tick, 1000);
            }
        };
        countdownTimerRef.current = setTimeout(tick, 1000);
    }, [countdown, handleCapture]);

    // 关闭时清掉倒计时
    useEffect(() => {
        if (!open && countdownTimerRef.current) {
            clearTimeout(countdownTimerRef.current);
            countdownTimerRef.current = null;
            setCountdown(0);
        }
    }, [open]);

    // ── 重拍 ──────────────────────────────────
    const handleRetake = useCallback(() => {
        setCapturedDataUrl(null);
        setQrCodeImage(null);
        startCamera(facingMode);
    }, [facingMode, startCamera]);

    // ── 扫码下载：把图片 dataUrl 上传到服务器 → 拿到二维码 ──
    const handleQRDownload = useCallback(async () => {
        if (!capturedDataUrl) return;
        setQrLoading(true);
        try {
            const resp = await fetch(`${API_BASE}/api/generate-qr`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dataUrl: capturedDataUrl })
            });
            const data = await resp.json();
            if (data && data.success && data.qrCode) {
                setQrCodeImage(data.qrCode);
            } else {
                alert('二维码生成失败');
            }
        } catch (e) {
            console.error('[PhotoStickerCamera] QR 生成失败:', e);
            alert('二维码生成失败：' + (e.message || '未知错误'));
        } finally {
            setQrLoading(false);
        }
    }, [capturedDataUrl]);

    // ── 保存 ──────────────────────────────────
    const handleSave = useCallback(async () => {
        if (!capturedDataUrl) return;

        // ── 路径 1：Capacitor 环境（APK） ─────
        // Capacitor 在原生壳中会把 Filesystem 插件注入到 window.Capacitor.Plugins
        // 这样写不用 import @capacitor/filesystem，避免 Vite 在 Web 端报模块未找到
        try {
            const Cap = typeof window !== 'undefined' ? window.Capacitor : null;
            if (Cap && Cap.isNativePlatform?.() && Cap.Plugins?.Filesystem) {
                const Filesystem = Cap.Plugins.Filesystem;
                const base64 = capturedDataUrl.split(',')[1];
                const filename = `tymdhdpt-${Date.now()}.jpg`;
                await Filesystem.writeFile({
                    path: filename,
                    data: base64,
                    directory: 'EXTERNAL',  // 等价 Directory.External
                });
                alert(`已保存：${filename}\n位置：手机外部存储`);
                return;
            }
        } catch (err) {
            console.warn('[PhotoStickerCamera] Capacitor save failed, fallback to download:', err);
        }

        // ── 路径 2：浏览器环境，触发下载 ─────
        const a = document.createElement('a');
        a.href = capturedDataUrl;
        a.download = `tymdhdpt-${Date.now()}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }, [capturedDataUrl]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black" style={{ touchAction: 'none' }}>
            {/* 顶部关闭按钮（浮在最上层）*/}
            <button
                onClick={onClose}
                aria-label="关闭"
                className="absolute top-4 right-4 z-50 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white active:scale-90 transition"
            >
                <X size={22} />
            </button>

            {/* ── 摄像头 + 边框预览（4:3 居中，左右红色装饰条延伸边框） ── */}
            {(phase === 'preview' || phase === 'requesting') && (
                <div className="absolute inset-0 flex items-stretch justify-center overflow-hidden bg-black">
                    {/* 左侧装饰条 */}
                    <SideDecor side="left" />

                    {/* 4:3 比例容器，与边框 PNG 完全对齐 */}
                    <div
                        className="relative bg-black overflow-hidden flex-shrink-0"
                        style={{
                            aspectRatio: '4 / 3',
                            height: '100%',
                            maxWidth: '100%',
                        }}
                    >
                        {/* 摄像头视频流（前置时镜像）— 限制在 4:3 容器内 */}
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="absolute inset-0 w-full h-full object-cover"
                            style={{
                                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                            }}
                        />

                        {/* 大头贴边框蒙层（覆盖 4:3 容器，正好对齐） */}
                        {frameLoaded && (
                            <img
                                src={frameSrc}
                                alt="大头贴边框"
                                className="absolute inset-0 w-full h-full pointer-events-none select-none"
                                style={{ objectFit: 'fill' }}
                                draggable={false}
                            />
                        )}
                    </div>

                    {/* 右侧装饰条（含快门按钮） */}
                    <div className="relative flex-1 h-full overflow-hidden">
                        <SideDecor side="right" inWrapper />
                        {/* 快门按钮：用 inset-0 + flex 精确居中 */}
                        {phase === 'preview' && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center">
                                <button
                                    onClick={handleShutter}
                                    disabled={countdown > 0}
                                    aria-label="拍照"
                                    className="w-20 h-20 rounded-full bg-white border-4 border-white/40 active:scale-95 transition shadow-2xl flex items-center justify-center ring-2 ring-black/10 disabled:opacity-60"
                                >
                                    {countdown > 0 ? (
                                        <span className="text-3xl font-black text-red-600">{countdown}</span>
                                    ) : (
                                        <div className="w-14 h-14 rounded-full bg-white border-2 border-black/20" />
                                    )}
                                </button>
                            </div>
                        )}
                    </div>

                    {/* 加载提示 */}
                    {phase === 'requesting' && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                            <div className="text-white text-base flex items-center gap-3">
                                <RefreshCw size={20} className="animate-spin" />
                                正在启动摄像头…
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── 错误状态 ── */}
            {phase === 'error' && (
                <div className="absolute inset-0 flex items-center justify-center px-6">
                    <div className="text-center">
                        <AlertTriangle size={56} className="mx-auto text-amber-400 mb-4" />
                        <p className="text-white text-base mb-2">无法打开摄像头</p>
                        <p className="text-white/60 text-sm mb-6 whitespace-pre-line leading-relaxed">{errorMsg}</p>
                        <button
                            onClick={() => startCamera(facingMode)}
                            className="px-6 h-11 rounded-full bg-white text-black font-semibold text-sm active:scale-95"
                        >
                            重试
                        </button>
                    </div>
                </div>
            )}

            {/* ── 拍照后预览 ── */}
            {phase === 'captured' && capturedDataUrl && (
                <div className="absolute inset-0 flex items-center justify-center p-4 pb-32">
                    <img
                        src={capturedDataUrl}
                        alt="拍照成果"
                        className="max-w-full max-h-full object-contain rounded-xl shadow-2xl"
                    />
                </div>
            )}

            {/* ── 预览态：左侧「切换边框」按钮 ── */}
            {phase === 'preview' && (
                <div className="absolute left-0 top-0 bottom-0 z-40 flex items-center px-4 sm:px-6 pointer-events-none">
                    <button
                        onClick={handleSwitchFrame}
                        aria-label="切换边框样式"
                        className="pointer-events-auto w-16 h-16 rounded-full bg-white/15 backdrop-blur-md flex flex-col items-center justify-center text-white active:scale-90 transition shadow-lg ring-1 ring-white/20"
                    >
                        <Sparkles size={22} />
                        <span className="text-[10px] mt-0.5 font-semibold tracking-wide">
                            {frameLabel || '换框'}
                        </span>
                        <span className="text-[9px] opacity-70 mt-0.5">
                            {frameIndex + 1}/{frames.length}
                        </span>
                    </button>
                </div>
            )}


            {/* ── 全屏倒计时数字（拍照前 3-2-1 ） ── */}
            {countdown > 0 && (
                <div className="absolute inset-0 z-[55] flex items-center justify-center pointer-events-none">
                    <div
                        key={countdown}
                        className="font-black text-white"
                        style={{
                            fontSize: 'min(40vw, 280px)',
                            lineHeight: 1,
                            textShadow: '0 8px 40px rgba(0,0,0,0.6), 0 0 80px rgba(255,80,80,0.5)',
                            animation: 'photoStickerCountdown 1s ease-out forwards',
                        }}
                    >
                        {countdown}
                    </div>
                    <style>{`
                        @keyframes photoStickerCountdown {
                            0%   { transform: scale(1.6); opacity: 0; }
                            30%  { transform: scale(1.0); opacity: 1; }
                            100% { transform: scale(0.7); opacity: 0.85; }
                        }
                    `}</style>
                </div>
            )}

            {/* ── 拍照后：底部「重拍 / 扫码下载」操作栏 ── */}
            {phase === 'captured' && (
                <div className="absolute left-0 right-0 bottom-0 z-40 bg-gradient-to-t from-black/80 via-black/40 to-transparent pb-6 pt-8 px-6">
                    <div className="flex items-center justify-center gap-3 max-w-md mx-auto">
                        <button
                            onClick={handleRetake}
                            className="flex-1 h-12 rounded-full bg-white/15 backdrop-blur-md text-white font-semibold text-sm flex items-center justify-center gap-2 active:scale-95 transition"
                        >
                            <Camera size={18} />
                            重拍
                        </button>
                        <button
                            onClick={handleQRDownload}
                            disabled={qrLoading}
                            className="flex-1 h-12 rounded-full bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition shadow-lg shadow-purple-500/40 disabled:opacity-60"
                        >
                            {qrLoading ? <RefreshCw size={18} className="animate-spin" /> : <QrCode size={18} />}
                            扫码下载
                        </button>
                    </div>
                </div>
            )}

            {/* ── 二维码弹窗 ── */}
            {qrCodeImage && (
                <div
                    className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setQrCodeImage(null)}
                >
                    <div
                        className="bg-white rounded-3xl p-8 shadow-2xl flex flex-col items-center gap-4 max-w-sm"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <p className="text-base text-gray-800 font-bold text-center">请使用手机扫码下载图片</p>
                        <img
                            src={qrCodeImage}
                            alt="二维码"
                            className="w-64 h-64 bg-white p-3 rounded-2xl border-2 border-gray-100"
                        />
                        <p className="text-xs text-gray-500 text-center leading-relaxed">
                            链接 1 小时内有效，请尽快扫码保存
                        </p>
                        <button
                            onClick={() => setQrCodeImage(null)}
                            className="mt-2 px-8 h-10 rounded-full bg-gray-900 text-white text-sm font-semibold active:scale-95"
                        >
                            关闭
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────
 * 左右两侧装饰条：与大头贴边框风格呼应（红黄渐变 + 五彩纸屑 + 竖排标语）
 * 16:10 横屏 Pad 上 4:3 居中后两侧约各 75px 宽
 * ──────────────────────────────────────────────────────────────────────── */
function SideDecor({ side, inWrapper = false }) {
    const isLeft = side === 'left';
    const slogan = isLeft ? '公益体彩' : '乐善人生';

    return (
        <div
            className={`${inWrapper ? 'absolute inset-0' : 'relative flex-1'} h-full overflow-hidden select-none pointer-events-none`}
            style={{
                background:
                    'linear-gradient(180deg, #e83a2c 0%, #d42a1f 45%, #b81a14 100%)',
            }}
        >
            {/* 顶部黄色装饰带 */}
            <div
                className="absolute top-0 left-0 right-0 h-16"
                style={{
                    background:
                        'linear-gradient(180deg, #ffd84d 0%, #ffb937 70%, rgba(255,185,55,0) 100%)',
                }}
            />

            {/* 底部弧形装饰带 */}
            <div
                className="absolute bottom-0 left-0 right-0 h-24"
                style={{
                    background:
                        'linear-gradient(0deg, #b81a14 0%, #d42a1f 60%, rgba(212,42,31,0) 100%)',
                }}
            />

            {/* 散落的五彩纸屑 */}
            <Confetti side={side} />

            {/* 顶部「中国体彩」标识（避开关闭按钮：右侧不显示） */}
            {isLeft && (
                <div
                    className="absolute top-2 left-1/2 -translate-x-1/2 text-white font-black text-[11px] leading-tight text-center"
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.5)' }}
                >
                    中国体彩
                </div>
            )}

            {/* 底部竖排 4 字标语 */}
            <div
                className="absolute left-0 right-0 flex justify-center text-white font-black"
                style={{
                    bottom: '12px',
                    fontSize: '12px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                }}
            >
                <div
                    style={{
                        writingMode: 'vertical-rl',
                        textOrientation: 'upright',
                        letterSpacing: '0.1em',
                        lineHeight: 1.4,
                    }}
                >
                    {slogan}
                </div>
            </div>

            {/* 内侧细金线 */}
            <div
                className={`absolute top-0 bottom-0 ${isLeft ? 'right-0' : 'left-0'} w-1`}
                style={{
                    background:
                        'linear-gradient(180deg, #ffd84d 0%, #ffb937 50%, #ffd84d 100%)',
                    boxShadow: '0 0 8px rgba(255,200,55,0.6)',
                }}
            />
        </div>
    );
}

/* 散落的彩色纸屑碎片（用纯色方块/三角点缀，符合中奖喜庆氛围） */
function Confetti({ side }) {
    // 每边一组固定位置（避免随机重渲染抖动）
    const dotsLeft = [
        { top: '12%', left: '20%', size: 8, color: '#ffd84d', rot: 18 },
        { top: '22%', left: '65%', size: 6, color: '#ffffff', rot: -25 },
        { top: '36%', left: '30%', size: 10, color: '#ffb937', rot: 35 },
        { top: '48%', left: '70%', size: 7, color: '#ffffff', rot: 10 },
        { top: '62%', left: '25%', size: 9, color: '#ffd84d', rot: -45 },
        { top: '78%', left: '60%', size: 6, color: '#ffffff', rot: 22 },
        { top: '88%', left: '30%', size: 8, color: '#ffb937', rot: -15 },
    ];
    const dotsRight = dotsLeft.map((d) => ({
        ...d,
        left: `${100 - parseFloat(d.left)}%`,
        rot: -d.rot,
    }));
    const dots = side === 'left' ? dotsLeft : dotsRight;

    return (
        <>
            {dots.map((d, i) => (
                <div
                    key={i}
                    className="absolute"
                    style={{
                        top: d.top,
                        left: d.left,
                        width: d.size,
                        height: d.size * 1.4,
                        background: d.color,
                        transform: `rotate(${d.rot}deg)`,
                        borderRadius: 2,
                        opacity: 0.9,
                        boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                />
            ))}
            {/* 几个白色小星点 */}
            {[
                { top: '8%', left: '55%', size: 14 },
                { top: '40%', left: '15%', size: 16 },
                { top: '70%', left: '75%', size: 12 },
            ].map((s, i) => (
                <div
                    key={`s-${i}`}
                    className="absolute text-yellow-200"
                    style={{
                        top: s.top,
                        left: side === 'left' ? s.left : `${100 - parseFloat(s.left)}%`,
                        fontSize: s.size,
                        lineHeight: 1,
                        textShadow: '0 0 6px rgba(255,220,80,0.7)',
                    }}
                >
                    ★
                </div>
            ))}
        </>
    );
}
