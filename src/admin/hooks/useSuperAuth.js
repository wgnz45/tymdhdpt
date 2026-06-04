import { useState, useCallback } from 'react';

/**
 * Shared authentication hook for super admin pages.
 * Replaces inline superKey management in SuperAdmin, LayoutManager, CrawlerMonitor etc.
 */
export function useSuperAuth() {
    const [superKey, setSuperKey] = useState(() => sessionStorage.getItem('superKey') || '');
    const [isAuthed, setIsAuthed] = useState(() => {
        // Restore from session if previously authenticated
        return sessionStorage.getItem('superAuthed') === 'true' && !!sessionStorage.getItem('superKey');
    });

    const login = useCallback(async (key) => {
        // Verify against backend
        const res = await fetch(`/api/super/config?superKey=${encodeURIComponent(key)}`);
        if (!res.ok) throw new Error('Invalid key');
        const data = await res.json();
        if (data.error) throw new Error(data.error);

        setSuperKey(key);
        setIsAuthed(true);
        sessionStorage.setItem('superKey', key);
        sessionStorage.setItem('superAuthed', 'true');
        return data;
    }, []);

    const logout = useCallback(() => {
        setSuperKey('');
        setIsAuthed(false);
        sessionStorage.removeItem('superKey');
        sessionStorage.removeItem('superAuthed');
    }, []);

    return { superKey, isAuthed, login, logout };
}
