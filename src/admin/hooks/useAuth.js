import { useState, useCallback, createContext, useContext } from 'react';

/**
 * Auth context + hook for admin pages.
 * Supports both JWT login (new) and legacy superKey (backward compat).
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const auth = useAuthInternal();
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        // Fallback: direct usage outside provider (shouldn't happen)
        return useAuthInternal();
    }
    return ctx;
}

function useAuthInternal() {
    const [token, setToken] = useState(() => sessionStorage.getItem('adminToken') || '');
    const [user, setUser] = useState(() => {
        try { return JSON.parse(sessionStorage.getItem('adminUser') || 'null'); }
        catch { return null; }
    });
    const [isAuthed, setIsAuthed] = useState(() => !!sessionStorage.getItem('adminToken'));

    // Legacy superKey compat
    const superKey = user ? (sessionStorage.getItem('superKey') || '') : '';

    const login = useCallback(async (username, password) => {
        const res = await fetch('/api/rbac/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || '登录失败');
        }

        setToken(data.token);
        setUser(data.user);
        setIsAuthed(true);
        sessionStorage.setItem('adminToken', data.token);
        sessionStorage.setItem('adminUser', JSON.stringify(data.user));

        // Also store superKey for backward compat with existing API calls
        // Fetch superConfig to get the key
        try {
            const cfgRes = await fetch('/api/super/config', {
                headers: { 'Authorization': `Bearer ${data.token}` },
            });
            if (cfgRes.ok) {
                const cfg = await cfgRes.json();
                if (cfg.superKey) {
                    sessionStorage.setItem('superKey', cfg.superKey);
                    sessionStorage.setItem('superAuthed', 'true');
                }
            }
        } catch { /* ignore */ }

        return data;
    }, []);

    const logout = useCallback(() => {
        setToken('');
        setUser(null);
        setIsAuthed(false);
        sessionStorage.removeItem('adminToken');
        sessionStorage.removeItem('adminUser');
        sessionStorage.removeItem('superKey');
        sessionStorage.removeItem('superAuthed');
    }, []);

    // Check if user has specific permission
    const hasPerm = useCallback((module, action = 'view') => {
        if (!user?.permissions) return false;
        const perms = user.permissions[module];
        if (!perms) return false;
        return perms.includes(action);
    }, [user]);

    // Authenticated fetch helper
    const authFetch = useCallback(async (url, options = {}) => {
        const headers = { ...options.headers };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        return fetch(url, { ...options, headers });
    }, [token]);

    return {
        token,
        user,
        isAuthed,
        superKey,
        login,
        logout,
        hasPerm,
        authFetch,
    };
}

// Legacy compat: drop-in for useSuperAuth
export function useSuperAuth() {
    const [superKey, setSuperKey] = useState(() => sessionStorage.getItem('superKey') || '');
    const [isAuthed, setIsAuthed] = useState(() => {
        return sessionStorage.getItem('superAuthed') === 'true' && !!sessionStorage.getItem('superKey');
    });

    const login = useCallback(async (key) => {
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
