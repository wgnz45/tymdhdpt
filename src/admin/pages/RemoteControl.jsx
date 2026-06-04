import React, { useState, useEffect, useCallback } from 'react';
import {
    Monitor, RefreshCcw, Edit2, Send, Save, Zap, Home,
    X, Loader2
} from 'lucide-react';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import ConfirmDialog from '../components/ConfirmDialog';
import { splitManagerText, sanitizeManagerTitles } from '../../utils/adminHelpers';

export default function RemoteControl() {
    const [superKey, setSuperKey] = useState(() => sessionStorage.getItem('superKey') || '');
    const [isAuthed, setIsAuthed] = useState(() => !!sessionStorage.getItem('superKey'));
    const [stores, setStores] = useState([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Manual draw modal
    const [showManualDraw, setShowManualDraw] = useState(false);
    const [drawForm, setDrawForm] = useState({
        period: '', date: '', reds: '', blues: '', pool: ''
    });

    // Confirm dialog for refresh-all
    const [confirmState, setConfirmState] = useState({
        open: false, title: '', message: '', onConfirm: null
    });

    // Quick-edit state per store (storeId -> field values)
    const [editFields, setEditFields] = useState({});
    const [savingStoreId, setSavingStoreId] = useState(null);

    // Auto-dismiss messages
    useEffect(() => {
        if (!message.text) return;
        const timer = setTimeout(() => setMessage({ type: '', text: '' }), 4000);
        return () => clearTimeout(timer);
    }, [message.text]);

    // Check stored key on mount
    useEffect(() => {
        const stored = sessionStorage.getItem('superKey');
        if (stored) {
            setSuperKey(stored);
            loadStores(stored);
        }
    }, []);

    const showMessage = useCallback((text, type = 'success') => {
        setMessage({ type, text });
    }, []);

    const loadStores = useCallback(async (key) => {
        const effectiveKey = key || superKey;
        if (!effectiveKey) return;
        try {
            const res = await fetch(`/api/super/stores?superKey=${effectiveKey}`);
            if (!res.ok) throw new Error('Auth failed');
            const data = await res.json();
            setStores(Array.isArray(data) ? data : []);
            setIsAuthed(true);
            setMessage({ type: '', text: '' });
        } catch {
            setIsAuthed(false);
            showMessage('Super Key 验证失败', 'error');
        }
    }, [superKey, showMessage]);

    const handleLogin = useCallback(async (key) => {
        sessionStorage.setItem('superKey', key);
        setSuperKey(key);
        await loadStores(key);
    }, [loadStores]);

    // ---- Force refresh data ----
    const handleRefreshData = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch('/api/super/refresh-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey })
            });
            const data = await res.json();
            if (data.success) {
                showMessage('数据刷新指令已发送');
            } else {
                showMessage('操作失败: ' + (data.error || '未知错误'), 'error');
            }
        } catch {
            showMessage('网络错误', 'error');
        } finally {
            setLoading(false);
        }
    };

    // ---- Refresh all pages ----
    const handleRefreshAllPages = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const res = await fetch('/api/super/refresh-all-pages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey })
            });
            const data = await res.json();
            if (data.success) {
                showMessage(`页面刷新指令已下发，在线设备: ${data.count || 0}台`);
            } else {
                showMessage('操作失败: ' + (data.error || '未知错误'), 'error');
            }
        } catch {
            showMessage('网络错误', 'error');
        } finally {
            setLoading(false);
        }
    };

    const askRefreshAllPages = () => {
        const onlineCount = stores.filter(s => s.isOnline).length;
        setConfirmState({
            open: true,
            title: '刷新所有页面',
            message: `确定要刷新所有在线设备的页面吗？当前在线 ${onlineCount} 台设备。`,
            onConfirm: () => {
                setConfirmState(prev => ({ ...prev, open: false }));
                handleRefreshAllPages();
            }
        });
    };

    // ---- Manual draw submit ----
    const handleManualDrawSubmit = async () => {
        const { period, date, reds, blues, pool } = drawForm;
        const redArr = reds.trim().split(/\s+/);
        const blueArr = blues.trim().split(/\s+/);

        if (!period || !date || redArr.length !== 5 || blueArr.length !== 2) {
            showMessage('请填写完整数据：红球5个，蓝球2个', 'error');
            return;
        }

        try {
            const res = await fetch('/api/super/manual-draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    superKey,
                    drawData: { period, date, reds: redArr, blues: blueArr, pool }
                })
            });
            const data = await res.json();
            if (data.success) {
                showMessage('开奖结果已更新');
                setShowManualDraw(false);
                setDrawForm({ period: '', date: '', reds: '', blues: '', pool: '' });
            } else {
                showMessage('更新失败: ' + (data.error || '未知错误'), 'error');
            }
        } catch {
            showMessage('网络错误', 'error');
        }
    };

    // ---- Remote navigate command ----
    const handleRemoteNavigate = async (storeId, path) => {
        try {
            const res = await fetch(`/api/super/store/${storeId}/command`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, command: { action: 'navigate', path } })
            });
            const data = await res.json();
            if (data.success) {
                showMessage(`${storeId} 指令已发送`);
            } else {
                showMessage('发送失败: ' + (data.error || '未知错误'), 'error');
            }
        } catch {
            showMessage('网络错误，指令发送失败', 'error');
        }
    };

    // ---- Quick-edit store info ----
    const startEdit = (store) => {
        const titles = sanitizeManagerTitles();
        const parts = splitManagerText(store.manager, titles);
        setEditFields(prev => ({
            ...prev,
            [store.id]: {
                name: store.name || '',
                managerSurname: String(parts.surname || ''),
                managerTitle: titles.includes(parts.title) ? parts.title : titles[0],
                phone: String(store.contact || store.phone || '').replace(/\D/g, '').slice(0, 11),
                address: store.address || ''
            }
        }));
    };

    const cancelEdit = (storeId) => {
        setEditFields(prev => {
            const next = { ...prev };
            delete next[storeId];
            return next;
        });
    };

    const updateEditField = (storeId, field, value) => {
        setEditFields(prev => ({
            ...prev,
            [storeId]: { ...prev[storeId], [field]: value }
        }));
    };

    const handleQuickSave = async (store) => {
        const fields = editFields[store.id];
        if (!fields) return;

        const cleanSurname = String(fields.managerSurname || '').trim();
        const titles = sanitizeManagerTitles();
        const finalTitle = titles.includes(fields.managerTitle) ? fields.managerTitle : titles[0];
        const finalManager = cleanSurname ? `${cleanSurname}${finalTitle}` : '';
        const finalPhone = String(fields.phone || '').replace(/\D/g, '').slice(0, 11);

        setSavingStoreId(store.id);
        try {
            const res = await fetch('/api/store/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: store.id,
                    superKey,
                    config: {
                        name: fields.name,
                        contact: finalPhone,
                        phone: finalPhone,
                        address: fields.address,
                        manager: finalManager
                    }
                })
            });
            const data = await res.json();
            if (data.success) {
                showMessage(`${store.id} 信息已保存`);
                cancelEdit(store.id);
                loadStores();
            } else {
                showMessage('保存失败: ' + (data.error || '未知错误'), 'error');
            }
        } catch {
            showMessage('网络错误，保存失败', 'error');
        } finally {
            setSavingStoreId(null);
        }
    };

    // ---- Auth gate ----
    if (!isAuthed) {
        return <PageContainer><div className="flex items-center justify-center min-h-[40vh] text-slate-400">正在验证权限...</div></PageContainer>;
    }

    const onlineStores = stores.filter(s => s.isOnline);
    const offlineStores = stores.filter(s => !s.isOnline);

    return (
        <PageContainer>
            <PageHeader
                icon={Monitor}
                title="远程控制"
                description="远程操控设备和刷新数据"
            >
            </PageHeader>

            {/* Status message */}
            {message.text && (
                <div className={`mb-4 px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    message.type === 'error'
                        ? 'bg-red-50 text-red-600 border border-red-200'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                    <Zap size={14} />
                    {message.text}
                </div>
            )}

            {/* Top action row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
                <button
                    onClick={handleRefreshData}
                    disabled={loading}
                    className="p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                    强制刷新数据
                </button>

                <button
                    onClick={askRefreshAllPages}
                    disabled={loading}
                    className="p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-2xl text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <RefreshCcw size={16} />
                    刷新所有页面
                    <span className="text-xs text-white/70 ml-1">({onlineStores.length}台在线)</span>
                </button>

                <button
                    onClick={() => setShowManualDraw(true)}
                    className="p-4 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl text-sm font-medium"
                >
                    <Edit2 size={16} />
                    手动录入开奖
                </button>
            </div>

            {/* Store list */}
            <div className="mb-3 flex items-center justify-between">
                <h3 className="text-base font-semibold text-slate-800">
                    设备列表
                    <span className="ml-2 text-sm font-normal text-slate-400">
                        共 {stores.length} 个，在线 {onlineStores.length} 个
                    </span>
                </h3>
                <button
                    onClick={() => loadStores()}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-blue-600 hover:bg-blue-50 border border-gray-200 rounded-lg transition-colors"
                >
                    <RefreshCcw size={12} className={loading ? 'animate-spin' : ''} />
                    刷新列表
                </button>
            </div>

            {stores.length === 0 ? (
                <Card>
                    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                        <Monitor size={40} className="mb-3 opacity-40" />
                        <p className="text-sm font-medium">暂无门店数据</p>
                    </div>
                </Card>
            ) : (
                <div className="space-y-3">
                    {stores.map(store => {
                        const isEditing = !!editFields[store.id];
                        const fields = editFields[store.id];
                        const isSaving = savingStoreId === store.id;

                        return (
                            <Card key={store.id} className="hover:shadow-md transition-shadow">
                                <div className="flex flex-col gap-4">
                                    {/* Top row: id, city, status, actions */}
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-mono rounded">
                                                {store.id}
                                            </span>
                                            <span className="bg-[#1e3a5f] text-white px-2 py-0.5 rounded-md text-xs font-medium">
                                                {store.city || '--'}
                                            </span>
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${
                                                store.isOnline
                                                    ? 'text-emerald-600'
                                                    : 'text-slate-400'
                                            }`}>
                                                <span className={`w-2 h-2 rounded-full ${
                                                    store.isOnline
                                                        ? 'bg-emerald-500 animate-pulse'
                                                        : 'bg-slate-300'
                                                }`} />
                                                {store.isOnline ? '在线' : '离线'}
                                            </span>
                                            {store.isOnline && store.currentPage && (
                                                <span className="text-xs text-slate-400">{store.currentPage}</span>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => handleRemoteNavigate(store.id, '/')}
                                                disabled={!store.isOnline}
                                                title="返回主页"
                                                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                            >
                                                <Home size={16} />
                                            </button>
                                            {!isEditing ? (
                                                <button
                                                    onClick={() => startEdit(store)}
                                                    title="快速编辑"
                                                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                            ) : (
                                                <>
                                                    <button
                                                        onClick={() => cancelEdit(store.id)}
                                                        title="取消"
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleQuickSave(store)}
                                                        disabled={isSaving}
                                                        title="保存"
                                                        className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                                                    >
                                                        {isSaving
                                                            ? <Loader2 size={16} className="animate-spin" />
                                                            : <Save size={16} />
                                                        }
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Store name */}
                                    {isEditing ? (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">门店名称</label>
                                                <input
                                                    value={fields.name}
                                                    onChange={e => updateEditField(store.id, 'name', e.target.value)}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                                    placeholder="门店名称"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">门店地址</label>
                                                <input
                                                    value={fields.address}
                                                    onChange={e => updateEditField(store.id, 'address', e.target.value)}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                                    placeholder="门店地址"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">联系人</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        value={fields.managerSurname}
                                                        onChange={e => updateEditField(store.id, 'managerSurname', e.target.value)}
                                                        className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                                        placeholder="姓氏"
                                                        maxLength={2}
                                                    />
                                                    <select
                                                        value={fields.managerTitle}
                                                        onChange={e => updateEditField(store.id, 'managerTitle', e.target.value)}
                                                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                                    >
                                                        {sanitizeManagerTitles().map(t => (
                                                            <option key={t} value={t}>{t}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <p className="text-xs text-slate-400 mt-1">
                                                    预览：{fields.managerSurname ? `${fields.managerSurname}${fields.managerTitle}` : '--'}
                                                </p>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-slate-400 mb-1">联系电话</label>
                                                <input
                                                    value={fields.phone}
                                                    onChange={e => updateEditField(
                                                        store.id,
                                                        'phone',
                                                        String(e.target.value || '').replace(/\D/g, '').slice(0, 11)
                                                    )}
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                                    placeholder="联系电话"
                                                    maxLength={11}
                                                    inputMode="numeric"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
                                            <span className="font-medium text-slate-800">{store.name || store.id}</span>
                                            {store.manager && <span>{store.manager}</span>}
                                            {(store.contact || store.phone) && <span>{store.contact || store.phone}</span>}
                                            {store.address && <span className="text-slate-400">{store.address}</span>}
                                        </div>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Manual draw modal */}
            {showManualDraw && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-lg p-6 overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1e3a5f] via-[#3b82f6] to-[#06b6d4]" />
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-lg font-semibold text-slate-900">手动录入开奖结果</h3>
                            <button
                                onClick={() => setShowManualDraw(false)}
                                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">期号</label>
                                    <input
                                        value={drawForm.period}
                                        onChange={e => setDrawForm(prev => ({ ...prev, period: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                        placeholder="如 26010"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-400 mb-1.5">日期</label>
                                    <input
                                        value={drawForm.date}
                                        onChange={e => setDrawForm(prev => ({ ...prev, date: e.target.value }))}
                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                        placeholder="如 01月26日 周一"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">红球 (空格分隔 5个)</label>
                                <input
                                    value={drawForm.reds}
                                    onChange={e => setDrawForm(prev => ({ ...prev, reds: e.target.value }))}
                                    className="w-full px-3 py-2 border border-red-200 bg-red-50/50 rounded-xl text-sm font-medium text-red-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                    placeholder="05 12 18 20 25"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">蓝球 (空格分隔 2个)</label>
                                <input
                                    value={drawForm.blues}
                                    onChange={e => setDrawForm(prev => ({ ...prev, blues: e.target.value }))}
                                    className="w-full px-3 py-2 border border-blue-200 bg-blue-50/50 rounded-xl text-sm font-medium text-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                    placeholder="03 11"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-400 mb-1.5">奖池金额</label>
                                <input
                                    value={drawForm.pool}
                                    onChange={e => setDrawForm(prev => ({ ...prev, pool: e.target.value }))}
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none transition-all"
                                    placeholder="888,888,888"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 mt-6">
                            <button
                                onClick={() => setShowManualDraw(false)}
                                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleManualDrawSubmit}
                                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg hover:opacity-90 flex items-center gap-2 transition-all"
                            >
                                <Send size={14} />
                                确认发布
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm dialog */}
            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                confirmLabel="确认刷新"
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
            />
        </PageContainer>
    );
}
