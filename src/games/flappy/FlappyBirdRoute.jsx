import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function FlappyBirdRoute() {
    const navigate = useNavigate();

    useEffect(() => {
        // Lock landscape on Android if possible
        try { screen.orientation?.lock?.('landscape').catch(() => {}); } catch {}
        return () => { try { screen.orientation?.unlock?.(); } catch {} };
    }, []);

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#4ec0ca' }}>
            <button
                onClick={() => navigate(-1)}
                style={{
                    position: 'absolute', top: 12, left: 12, zIndex: 10,
                    width: 40, height: 40, borderRadius: '50%',
                    background: 'rgba(0,0,0,0.35)', border: 'none',
                    color: '#fff', fontSize: 20, fontWeight: 900,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                }}
                aria-label="返回"
            >
                ✕
            </button>
            <iframe
                src="/games/flappy-bird/index.html"
                title="Flappy Bird"
                style={{
                    width: '100%', height: '100%',
                    border: 'none', display: 'block',
                }}
                allow="autoplay"
            />
        </div>
    );
}
