import { useRef, useEffect, useCallback } from 'react';

/**
 * Canvas 游戏循环 Hook
 * 提供 requestAnimationFrame 驱动的渲染循环
 */
export default function useGameLoop(canvasRef, drawFn, deps = []) {
    const rafRef = useRef(null);
    const lastTimeRef = useRef(0);

    const loop = useCallback((timestamp) => {
        const dt = lastTimeRef.current ? (timestamp - lastTimeRef.current) / 1000 : 0.016;
        lastTimeRef.current = timestamp;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // HiDPI 处理
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        if (canvas.width !== rect.width * dpr || canvas.height !== rect.height * dpr) {
            canvas.width = rect.width * dpr;
            canvas.height = rect.height * dpr;
            ctx.scale(dpr, dpr);
        }

        ctx.clearRect(0, 0, rect.width, rect.height);
        drawFn(ctx, rect.width, rect.height, dt);

        rafRef.current = requestAnimationFrame(loop);
    }, [canvasRef, drawFn]);

    useEffect(() => {
        rafRef.current = requestAnimationFrame(loop);
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
        };
    }, [loop, ...deps]);

    return { rafRef };
}
