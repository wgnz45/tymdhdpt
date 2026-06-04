import { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';

const StoreDataContext = createContext(null);

// 简化深比较：JSON 字符串比对，避免无意义 setState
const isEqual = (a, b) => {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; }
};

export function StoreDataProvider({ storeId, children }) {
  const tid = storeId || 'default';
  const [storeData, setStoreData] = useState(null);
  const [sourcesData, setSourcesData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [annConfig, setAnnConfig] = useState({ rounds: 99, interval: 0, intervalUnit: 's' });
  const [drawHistory, setDrawHistory] = useState(null);
  const [notFound, setNotFound] = useState(false);

  const prevRef = useRef({ store: null, sources: null, ann: null, draw: null });
  const aliveRef = useRef(true);
  const visibleRef = useRef(true);
  // AbortController refs — cancel stale in-flight requests
  const abortRefs = useRef({ store: null, sources: null, ann: null, draw: null });

  const fetchJson = useCallback(async (url, signal) => {
    const sep = url.includes('?') ? '&' : '?';
    try {
      const res = await fetch(`${url}${sep}_ts=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' },
        signal,
      });
      if (!res.ok) return { ok: false, status: res.status, data: null };
      return { ok: true, status: res.status, data: await res.json() };
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, status: 0, data: null, aborted: true };
      return { ok: false, status: 0, data: null };
    }
  }, []);

  const loadStore = useCallback(async () => {
    if (!aliveRef.current || !visibleRef.current) return;
    if (abortRefs.current.store) abortRefs.current.store.abort();
    const ac = abortRefs.current.store = new AbortController();
    const result = await fetchJson(`/api/store/${tid}`, ac.signal);
    if (!aliveRef.current || result.aborted) return;
    if (!result.ok) {
      if (result.status === 404) setNotFound(true);
      return;
    }
    setNotFound(false);
    if (!isEqual(result.data, prevRef.current.store)) {
      prevRef.current.store = result.data;
      setStoreData(result.data);
    }
  }, [tid, fetchJson]);

  const loadSources = useCallback(async () => {
    if (!aliveRef.current || !visibleRef.current) return;
    if (abortRefs.current.sources) abortRefs.current.sources.abort();
    const ac = abortRefs.current.sources = new AbortController();
    const result = await fetchJson(`/api/system/sources?storeId=${tid}`, ac.signal);
    if (!aliveRef.current || result.aborted || !result.ok) return;
    if (result.data?.success && result.data?.data) {
      const d = result.data.data;
      if (!isEqual(d, prevRef.current.sources)) {
        prevRef.current.sources = d;
        setSourcesData(d);
      }
    }
  }, [fetchJson]);

  const loadAnnouncements = useCallback(async () => {
    if (!aliveRef.current || !visibleRef.current) return;
    if (abortRefs.current.ann) abortRefs.current.ann.abort();
    const ac = abortRefs.current.ann = new AbortController();
    const result = await fetchJson(`/api/announcements/${tid}`, ac.signal);
    if (!aliveRef.current || result.aborted || !result.ok) return;
    const anns = result.data?.announcements || [];
    const cfg = result.data?.config || { rounds: 99, interval: 0, intervalUnit: 's' };
    if (!isEqual(anns, prevRef.current.ann)) {
      prevRef.current.ann = anns;
      setAnnouncements(anns);
      setAnnConfig(cfg);
    }
  }, [tid, fetchJson]);

  const loadDrawHistory = useCallback(async () => {
    if (!aliveRef.current || !visibleRef.current) return;
    if (abortRefs.current.draw) abortRefs.current.draw.abort();
    const ac = abortRefs.current.draw = new AbortController();
    const result = await fetchJson('/api/system/draw-history', ac.signal);
    if (!aliveRef.current || result.aborted || !result.ok) return;
    if (result.data?.success && result.data?.data) {
      if (!isEqual(result.data.data, prevRef.current.draw)) {
        prevRef.current.draw = result.data.data;
        setDrawHistory(result.data.data);
      }
    }
  }, [fetchJson]);

  // 统一轮询调度 — 页面不可见时暂停，可见时恢复
  useEffect(() => {
    aliveRef.current = true;
    let storeTimer = null, sourceTimer = null, annTimer = null;

    const startPolling = () => {
      storeTimer = setInterval(loadStore, 30000);
      sourceTimer = setInterval(loadSources, 60000);
      annTimer = setInterval(loadAnnouncements, 30000);
    };
    const stopPolling = () => {
      if (storeTimer) { clearInterval(storeTimer); storeTimer = null; }
      if (sourceTimer) { clearInterval(sourceTimer); sourceTimer = null; }
      if (annTimer) { clearInterval(annTimer); annTimer = null; }
    };
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible';
      if (visibleRef.current) {
        loadStore(); loadSources(); loadAnnouncements();
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Initial load
    loadStore(); loadSources(); loadAnnouncements(); loadDrawHistory();
    startPolling();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      aliveRef.current = false;
      stopPolling();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [tid, loadStore, loadSources, loadAnnouncements, loadDrawHistory]);

  const value = {
    storeId: tid,
    storeData,
    sourcesData,
    announcements,
    annConfig,
    drawHistory,
    notFound,
    refreshStore: loadStore,
    refreshSources: loadSources,
  };

  return <StoreDataContext.Provider value={value}>{children}</StoreDataContext.Provider>;
}

export function useStoreData() {
  const ctx = useContext(StoreDataContext);
  if (!ctx) throw new Error('useStoreData must be used within StoreDataProvider');
  return ctx;
}
