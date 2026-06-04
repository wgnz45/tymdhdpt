import { useState, useEffect, useRef } from 'react';

/**
 * Hook that tracks page visibility.
 * Returns `true` when the page is visible, `false` when hidden (background tab / screen off).
 *
 * Also provides a ref for synchronous access in timers and callbacks.
 */
export function usePageVisibility() {
    const [visible, setVisible] = useState(() => document.visibilityState === 'visible');
    const visibleRef = useRef(visible);

    useEffect(() => {
        const onChange = () => {
            const v = document.visibilityState === 'visible';
            visibleRef.current = v;
            setVisible(v);
        };
        document.addEventListener('visibilitychange', onChange);
        return () => document.removeEventListener('visibilitychange', onChange);
    }, []);

    return { visible, visibleRef };
}
