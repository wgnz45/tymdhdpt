import React, { useState, useEffect, useRef } from 'react';
import { ImageIcon, Link as LinkIcon, Trash2, Loader2, Plus, Edit2, X, Save, Download, ToggleLeft, ToggleRight, Ticket, Upload, Presentation, Globe, Images, CheckCircle, AlertCircle, Info } from 'lucide-react';
import PageContainer from './components/PageContainer';
import PageHeader from './components/PageHeader';
import Card from './components/Card';
import TabBar from './components/TabBar';
import ConfirmDialog from './components/ConfirmDialog';

const FUJIAN_CITIES = ['福州', '厦门', '莆田', '三明', '泉州', '漳州', '南平', '龙岩', '宁德'];

export default function LayoutManager() {
    const [superKey, setSuperKey] = useState(() => sessionStorage.getItem('superKey') || '');
    const [loading, setLoading] = useState(true);
    const [isAuthed, setIsAuthed] = useState(() => !!sessionStorage.getItem('superKey'));
    const [activeTab, setActiveTab] = useState('logo');
    const [toast, setToast] = useState({ type: '', text: '' });
    const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });

    // Logo state
    const [layoutLibrary, setLayoutLibrary] = useState([]);
    const [drawLogoMap, setDrawLogoMap] = useState({});
    const [drawLogoOpacity, setDrawLogoOpacity] = useState(0.18);
    const [savingDrawLogoMap, setSavingDrawLogoMap] = useState(false);
    const [layoutUploadName, setLayoutUploadName] = useState('');
    const [layoutUploadUrl, setLayoutUploadUrl] = useState('');
    const [layoutUploading, setLayoutUploading] = useState(false);
    const layoutFileInput = useRef(null);

    // Carousel state
    const [carouselLibrary, setCarouselLibrary] = useState([]);
    const [carouselUploadName, setCarouselUploadName] = useState('');
    const [carouselUploadUrl, setCarouselUploadUrl] = useState('');
    const [carouselUploading, setCarouselUploading] = useState(false);
    const carouselFileInput = useRef(null);
    const [carouselUploadLevel, setCarouselUploadLevel] = useState('province');
    const [carouselUploadCities, setCarouselUploadCities] = useState([]);
    const [carouselUploadDuration, setCarouselUploadDuration] = useState(8);
    const [carouselUploadBadge, setCarouselUploadBadge] = useState('');
    const [carouselUploadTitle, setCarouselUploadTitle] = useState('');
    const [carouselUploadSub, setCarouselUploadSub] = useState('');
    const [carouselUploadPriority, setCarouselUploadPriority] = useState(0);

    // Scratch state
    const [scratchLibrary, setScratchLibrary] = useState([]);
    const [scratchUploadTier, setScratchUploadTier] = useState(10);
    const [scratchUploadName, setScratchUploadName] = useState('');
    const [scratchUploadUrl, setScratchUploadUrl] = useState('');
    const [scratchUploading, setScratchUploading] = useState(false);
    const [scratchCrawling, setScratchCrawling] = useState(false);
    const [scratchSelectMode, setScratchSelectMode] = useState(false);
    const [selectedScratch, setSelectedScratch] = useState(new Set());
    const [scratchDeleting, setScratchDeleting] = useState(false);
    const scratchFileInput = useRef(null);

    // Edit modal state
    const [editingAsset, setEditingAsset] = useState(null);
    const [editName, setEditName] = useState('');
    const [editUrl, setEditUrl] = useState('');
    const [editUploading, setEditUploading] = useState(false);
    const [editTier, setEditTier] = useState(10);
    const [editIntro, setEditIntro] = useState('');
    const [editMaxPrize, setEditMaxPrize] = useState('');
    const [editFrontUrl, setEditFrontUrl] = useState('');
    const [editBackUrl, setEditBackUrl] = useState('');
    const [editEnabled, setEditEnabled] = useState(true);
    const [editLevel, setEditLevel] = useState('province');
    const [editCities, setEditCities] = useState([]);
    const [editDuration, setEditDuration] = useState(8);
    const [editBadge, setEditBadge] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editSub, setEditSub] = useState('');
    const [editPriority, setEditPriority] = useState(0);
    const [downloadingId, setDownloadingId] = useState(null);
    const [editTargetLibrary, setEditTargetLibrary] = useState('layout');
    const editFileInput = useRef(null);

    const showToast = (type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast({ type: '', text: '' }), 3000);
    };

    const showConfirm = (title, message, onConfirm) => {
        setConfirmState({ open: true, title, message, onConfirm });
    };

    useEffect(() => {
        if (superKey) verifyKey();
        else setLoading(false);
    }, []);

    const verifyKey = () => {
        setLoading(true);
        fetch(`/api/super/config?superKey=${superKey}`)
            .then(res => res.json())
            .then(data => {
                if (data.superKey || data.platformName) {
                    setIsAuthed(true);
                    sessionStorage.setItem('superKey', superKey);
                    if (data.drawLogoMap) setDrawLogoMap(data.drawLogoMap || {});
                    if (typeof data.drawLogoOpacity === 'number') setDrawLogoOpacity(data.drawLogoOpacity);
                    loadLayoutLibrary();
                    loadCarouselLibrary();
                    loadScratchLibrary();
                }
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    const loadSuperConfig = () => {
        fetch(`/api/super/config?superKey=${superKey}`)
            .then(res => res.json())
            .then(data => {
                if (data && typeof data === 'object') {
                    setDrawLogoMap(data.drawLogoMap || {});
                    if (typeof data.drawLogoOpacity === 'number') setDrawLogoOpacity(data.drawLogoOpacity);
                }
            })
            .catch(() => {});
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text).then(() => showToast('success', 'URL 已复制到剪贴板')).catch(() => showToast('error', '复制失败'));
    };

    // Logo handlers
    const loadLayoutLibrary = () => {
        fetch(`/api/super/layout/library?superKey=${superKey}`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setLayoutLibrary(data); })
            .catch(() => {});
    };

    const handleLayoutUpload = async (imageDataUrl = null) => {
        if (!layoutUploadUrl && !imageDataUrl) return showToast('error', '请输入 URL 或选择文件');
        setLayoutUploading(true);
        try {
            const res = await fetch('/api/super/layout/upload', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, name: layoutUploadName, url: layoutUploadUrl, imageDataUrl })
            });
            const data = await res.json();
            if (data.success) { setLayoutUploadName(''); setLayoutUploadUrl(''); loadLayoutLibrary(); showToast('success', '上传成功'); }
            else showToast('error', '上传失败: ' + data.error);
        } catch { showToast('error', '网络错误'); }
        finally { setLayoutUploading(false); }
    };

    const handleLayoutFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => handleLayoutUpload(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleLayoutDelete = (id) => {
        showConfirm('确认删除', '确定删除此 Logo 素材？', async () => {
            setConfirmState(prev => ({ ...prev, open: false }));
            try {
                const res = await fetch('/api/super/layout/delete', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ superKey, id })
                });
                const data = await res.json();
                if (data.success) loadLayoutLibrary();
                else showToast('error', '删除失败: ' + data.error);
            } catch { showToast('error', '网络错误'); }
        });
    };

    const handleDownloadExternal = async (asset, libType = 'layout') => {
        setDownloadingId(asset.id);
        try {
            const res = await fetch(`/api/super/${libType}/download-external`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, id: asset.id })
            });
            const data = await res.json();
            if (data.success) {
                if (libType === 'layout') loadLayoutLibrary();
                else if (libType === 'carousel') loadCarouselLibrary();
                else loadScratchLibrary();
                showToast('success', '下载成功');
            } else showToast('error', '下载失败: ' + data.error);
        } catch { showToast('error', '网络错误'); }
        finally { setDownloadingId(null); }
    };

    const handleDrawLogoChange = (key, value) => {
        setDrawLogoMap(prev => {
            const next = { ...(prev || {}) };
            if (!value) delete next[key];
            else next[key] = value;
            return next;
        });
    };

    const handleSaveDrawLogos = async () => {
        if (savingDrawLogoMap) return;
        setSavingDrawLogoMap(true);
        try {
            const res = await fetch('/api/super/update-config', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, drawLogoMap, drawLogoOpacity })
            });
            const data = await res.json();
            if (!data.success) showToast('error', '保存失败: ' + (data.error || '未知错误'));
            else { loadSuperConfig(); showToast('success', '开奖信息图标已保存'); }
        } catch { showToast('error', '网络错误'); }
        finally { setSavingDrawLogoMap(false); }
    };

    const DRAW_LOGO_TARGETS = [
        { key: '超级大乐透', label: '超级大乐透' }, { key: '排列3', label: '排列3' },
        { key: '排列5', label: '排列5' }, { key: '7星彩', label: '7星彩' },
        { key: '36选7', label: '36选7' }, { key: '22选5', label: '22选5' },
        { key: '31选7', label: '31选7' }, { key: '31选7附加', label: '31选7附加' }
    ];

    // Carousel handlers
    const loadCarouselLibrary = () => {
        fetch(`/api/super/carousel/library?superKey=${superKey}`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setCarouselLibrary(data); })
            .catch(() => {});
    };

    const handleCarouselUpload = async (imageDataUrl = null) => {
        if (!carouselUploadUrl && !imageDataUrl) return showToast('error', '请输入 URL 或选择文件');
        setCarouselUploading(true);
        try {
            const res = await fetch('/api/super/carousel/upload', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    superKey, name: carouselUploadName, url: carouselUploadUrl, imageDataUrl,
                    badge: carouselUploadBadge, title: carouselUploadTitle, sub: carouselUploadSub,
                    level: carouselUploadLevel, cities: carouselUploadCities,
                    duration: carouselUploadDuration * 1000,
                    priority: carouselUploadPriority,
                })
            });
            const data = await res.json();
            if (data.success) {
                setCarouselUploadName(''); setCarouselUploadUrl('');
                setCarouselUploadBadge(''); setCarouselUploadTitle(''); setCarouselUploadSub('');
                setCarouselUploadLevel('province'); setCarouselUploadCities([]); setCarouselUploadDuration(8); setCarouselUploadPriority(0);
                loadCarouselLibrary(); showToast('success', '上传成功');
            }
            else showToast('error', '上传失败: ' + data.error);
        } catch { showToast('error', '网络错误'); }
        finally { setCarouselUploading(false); }
    };

    const handleCarouselFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => handleCarouselUpload(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleCarouselDelete = (id) => {
        showConfirm('确认删除', '确定删除此轮播图素材？', async () => {
            setConfirmState(prev => ({ ...prev, open: false }));
            try {
                const res = await fetch('/api/super/carousel/delete', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ superKey, id })
                });
                const data = await res.json();
                if (data.success) loadCarouselLibrary();
                else showToast('error', '删除失败: ' + data.error);
            } catch { showToast('error', '网络错误'); }
        });
    };

    // Shared edit modal handlers
    const handleEditClick = (asset, libType) => {
        setEditTargetLibrary(libType);
        setEditingAsset(asset);
        setEditName(asset.name || '');
        setEditUrl(asset.url || asset.frontUrl || '');
        setEditTier(asset.tier || 10);
        setEditIntro(asset.intro || '');
        setEditMaxPrize(asset.maxPrize || '');
        setEditFrontUrl(asset.frontUrl || '');
        setEditBackUrl(asset.backUrl || '');
        setEditEnabled(asset.enabled !== false);
        setEditLevel(asset.level || 'province');
        setEditCities(Array.isArray(asset.cities) ? asset.cities : []);
        setEditDuration(asset.duration ? Math.round(asset.duration / 1000) : 8);
        setEditBadge(asset.badge || '');
        setEditTitle(asset.title || '');
        setEditSub(asset.sub || '');
        setEditPriority(asset.priority || 0);
    };

    const handleEditSave = async (imageDataUrl = null) => {
        if (!editingAsset) return;
        setEditUploading(true);
        try {
            const payload = { superKey, id: editingAsset.id, name: editName };
            if (imageDataUrl) payload.imageDataUrl = imageDataUrl;
            else payload.url = editUrl;

            if (editTargetLibrary === 'scratch') {
                payload.tier = Number(editTier);
                payload.intro = editIntro;
                payload.maxPrize = editMaxPrize;
                payload.enabled = editEnabled;
                if (editUrl === editBackUrl && editBackUrl) {
                    payload.frontUrl = editBackUrl;
                    payload.backUrl = editFrontUrl;
                } else {
                    payload.frontUrl = editFrontUrl;
                    payload.backUrl = editBackUrl;
                }
            }

            if (editTargetLibrary === 'carousel') {
                payload.badge = editBadge;
                payload.title = editTitle;
                payload.sub = editSub;
                payload.level = editLevel;
                payload.cities = editCities;
                payload.duration = editDuration * 1000;
                payload.enabled = editEnabled;
                payload.priority = editPriority;
            }

            const res = await fetch(`/api/super/${editTargetLibrary}/update`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (data.success) {
                setEditingAsset(null);
                if (editTargetLibrary === 'layout') loadLayoutLibrary();
                else if (editTargetLibrary === 'carousel') loadCarouselLibrary();
                else loadScratchLibrary();
                showToast('success', '更新成功');
            } else showToast('error', '更新失败: ' + data.error);
        } catch { showToast('error', '网络错误'); }
        finally { setEditUploading(false); }
    };

    const handleEditFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => handleEditSave(ev.target.result);
        reader.readAsDataURL(file);
    };

    // Scratch handlers
    const loadScratchLibrary = () => {
        fetch(`/api/super/scratch/library?superKey=${superKey}`)
            .then(r => r.json())
            .then(data => { if (Array.isArray(data)) setScratchLibrary(data); })
            .catch(() => {});
    };

    const handleScratchUpload = async (imageDataUrl = null) => {
        if (!scratchUploadUrl && !imageDataUrl) return showToast('error', '请输入 URL 或选择文件');
        setScratchUploading(true);
        try {
            const res = await fetch('/api/super/scratch/upload', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, tier: scratchUploadTier, name: scratchUploadName, url: scratchUploadUrl, imageDataUrl })
            });
            const data = await res.json();
            if (data.success) { setScratchUploadName(''); setScratchUploadUrl(''); loadScratchLibrary(); showToast('success', '上传成功'); }
            else showToast('error', '上传失败: ' + data.error);
        } catch { showToast('error', '网络错误'); }
        finally { setScratchUploading(false); if (scratchFileInput.current) scratchFileInput.current.value = ''; }
    };

    const handleScratchFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => handleScratchUpload(ev.target.result);
        reader.readAsDataURL(file);
    };

    const handleScratchCrawl = () => {
        showConfirm('确认抓取', '确定要从官方抓取顶呱刮素材吗？这可能需要几分钟时间。', async () => {
            setConfirmState(prev => ({ ...prev, open: false }));
            setScratchCrawling(true);
            try {
                const response = await fetch('/api/super/scratch/crawl', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ superKey })
                });
                const data = await response.json();
                if (data.success) {
                    showToast('success', `抓取成功！新增 ${data.added ?? data.count ?? 0} 个，共处理 ${data.total} 个`);
                    loadScratchLibrary();
                } else showToast('error', '抓取失败: ' + (data.error || '未知错误'));
            } catch { showToast('error', '抓取过程中发生错误'); }
            finally { setScratchCrawling(false); }
        });
    };

    const handleScratchSelectToggle = (id) => {
        setSelectedScratch(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    };

    const handleScratchSelectAll = (items) => {
        setSelectedScratch(selectedScratch.size === items.length ? new Set() : new Set(items.map(i => i.id)));
    };

    const handleScratchBatchUpdate = async (enabled) => {
        if (selectedScratch.size === 0) return;
        showConfirm('确认操作', `确定将选中的 ${selectedScratch.size} 个票面全部${enabled ? '上架' : '下架'}？`, async () => {
            setConfirmState(prev => ({ ...prev, open: false }));
            try {
                const res = await fetch('/api/super/scratch/update-batch', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ superKey, ids: [...selectedScratch], enabled })
                });
                const data = await res.json();
                if (data.success) { setSelectedScratch(new Set()); setScratchSelectMode(false); loadScratchLibrary(); }
                else showToast('error', '批量操作失败: ' + data.error);
            } catch { showToast('error', '网络错误'); }
        });
    };

    const handleScratchBatchDelete = () => {
        if (selectedScratch.size === 0) return;
        showConfirm('确认删除', `确定删除选中的 ${selectedScratch.size} 个票面？此操作不可撤销。`, async () => {
            setConfirmState(prev => ({ ...prev, open: false }));
            setScratchDeleting(true);
            try {
                const res = await fetch('/api/super/scratch/delete-batch', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ superKey, ids: [...selectedScratch] })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('success', `已删除 ${data.deleted} 个票面`);
                    setSelectedScratch(new Set()); setScratchSelectMode(false); loadScratchLibrary();
                } else showToast('error', '批量删除失败: ' + data.error);
            } catch { showToast('error', '网络错误'); }
            finally { setScratchDeleting(false); }
        });
    };

    const handleScratchToggle = async (id, enabled) => {
        await fetch('/api/super/scratch/update', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ superKey, id, enabled: !enabled })
        });
        loadScratchLibrary();
    };

    const handleScratchDelete = (id) => {
        showConfirm('确认删除', '确定删除此顶呱刮票面图片？', async () => {
            setConfirmState(prev => ({ ...prev, open: false }));
            try {
                const res = await fetch('/api/super/scratch/delete', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ superKey, id })
                });
                const data = await res.json();
                if (data.success) loadScratchLibrary();
                else showToast('error', '删除失败: ' + (data.error || '未知错误'));
            } catch { showToast('error', '网络错误'); }
        });
    };

    // Auth gates
    if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">正在验证权限...</div>;
    if (!isAuthed) return <PageContainer><div className="flex items-center justify-center min-h-[40vh] text-slate-400">正在验证权限...</div></PageContainer>;

    const tabs = [
        { key: 'logo', label: 'Logo 图标库', icon: ImageIcon },
        { key: 'carousel', label: '轮播海报库', icon: Presentation },
        { key: 'scratch', label: '顶呱刮票面库', icon: Ticket },
    ];

    return (
        <PageContainer>
            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                confirmLabel="确认"
                danger
                onConfirm={confirmState.onConfirm || (() => {})}
                onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))}
            />

            <PageHeader icon={Images} title="素材管理" description="管理 Logo、轮播海报和顶呱刮票面素材" />

            {/* Toast */}
            {toast.text && (
                <div className={`mb-4 p-3 rounded-xl flex items-center gap-2 text-sm border ${
                    toast.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-700 border-red-100'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    <span>{toast.text}</span>
                </div>
            )}

            <TabBar tabs={tabs} activeKey={activeTab} onChange={setActiveTab} />

            <div className="mt-6">
                {/* TAB: LOGO */}
                {activeTab === 'logo' && (
                    <div className="space-y-6">
                        <Card>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                    <ImageIcon size={15} className="text-[#1e3a5f]" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">上传 Logo</h3>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs text-slate-500 font-medium mb-1.5">Logo 名称</label>
                                    <input type="text" value={layoutUploadName} onChange={e => setLayoutUploadName(e.target.value)} placeholder="可选" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="block text-xs text-slate-500 font-medium mb-1.5">Logo URL</label>
                                    <input type="text" value={layoutUploadUrl} onChange={e => setLayoutUploadUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleLayoutUpload()} disabled={layoutUploading || !layoutUploadUrl} className="px-5 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white rounded-lg text-sm font-medium hover:from-[#163050] hover:to-[#1e3a5f] active:scale-[0.98] shadow-sm disabled:opacity-50 flex items-center gap-2">
                                        <Plus size={15} /> 保存 URL
                                    </button>
                                    <div className="relative">
                                        <input ref={layoutFileInput} type="file" accept="image/*" className="hidden" onChange={handleLayoutFileChange} />
                                        <button onClick={() => layoutFileInput.current?.click()} disabled={layoutUploading} className="px-5 py-2.5 border border-dashed border-gray-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                                            <Upload size={15} /> 本地上传
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <Card>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                        <LinkIcon size={15} className="text-[#1e3a5f]" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-slate-800">开奖信息图标绑定</h3>
                                        <p className="text-xs text-slate-400 mt-0.5">从素材库选择图标，绑定到指定彩种的开奖信息卡片</p>
                                    </div>
                                </div>
                                <button onClick={handleSaveDrawLogos} disabled={savingDrawLogoMap} className="px-4 py-2 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white rounded-lg text-sm font-medium hover:from-[#163050] hover:to-[#1e3a5f] active:scale-[0.98] shadow-sm disabled:opacity-60">
                                    {savingDrawLogoMap ? '保存中...' : '保存绑定'}
                                </button>
                            </div>
                            <div className="mb-4 bg-slate-50 border border-gray-100 rounded-lg p-3 flex items-center gap-3">
                                <span className="text-xs text-slate-500 font-medium">背景颜色强度</span>
                                <input type="range" min="0" max="1" step="0.05" value={drawLogoOpacity} onChange={e => setDrawLogoOpacity(Number(e.target.value))} className="flex-1" />
                                <span className="text-xs font-medium text-slate-600 w-10 text-right">{drawLogoOpacity.toFixed(2)}</span>
                            </div>
                            {layoutLibrary.length === 0 ? (
                                <div className="text-xs text-slate-400 bg-slate-50 rounded-lg p-4">暂无 Logo 数据，请先上传。</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {DRAW_LOGO_TARGETS.map(target => {
                                        const selectedId = drawLogoMap?.[target.key] || '';
                                        const selectedAsset = layoutLibrary.find(item => item.id === selectedId || item.url === selectedId);
                                        return (
                                            <div key={target.key} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg bg-slate-50">
                                                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center overflow-hidden">
                                                    {selectedAsset?.url ? <img src={selectedAsset.url} alt={target.label} className="w-full h-full object-contain" /> : <div className="w-2 h-2 rounded-full bg-gray-300" />}
                                                </div>
                                                <span className="text-sm font-medium text-slate-700 flex-1">{target.label}</span>
                                                <select value={selectedId} onChange={e => handleDrawLogoChange(target.key, e.target.value)} className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-slate-700 outline-none">
                                                    <option value="">不绑定</option>
                                                    {layoutLibrary.map(asset => <option key={asset.id} value={asset.id}>{asset.name || asset.id}</option>)}
                                                </select>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </Card>

                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {layoutLibrary.map(asset => {
                                const isExternal = typeof asset.url === 'string' && asset.url.startsWith('http');
                                return (
                                    <div key={asset.id} className="group flex flex-col bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-md transition-all overflow-hidden">
                                        <div className="relative aspect-square bg-slate-50 rounded-xl overflow-hidden border-2 flex items-center justify-center">
                                            <img src={asset.url} alt={asset.name} className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button onClick={() => handleEditClick(asset, 'layout')} className="p-2 bg-white text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => handleLayoutDelete(asset.id)} className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <div className="font-medium text-slate-800 text-xs truncate mb-1">{asset.name}</div>
                                            <span className="text-[10px] bg-blue-50 text-blue-500 px-1.5 py-0.5 rounded">{isExternal ? '外链' : '本地'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB: CAROUSEL */}
                {activeTab === 'carousel' && (
                    <div className="space-y-6">
                        <Card>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                    <Presentation size={15} className="text-[#1e3a5f]" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">上传轮播海报</h3>
                            </div>
                            <div className="space-y-4">
                                {/* Row 1: name + URL */}
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-500 font-medium mb-1.5">海报名称</label>
                                        <input type="text" value={carouselUploadName} onChange={e => setCarouselUploadName(e.target.value)} placeholder="可选" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-500 font-medium mb-1.5">海报 URL</label>
                                        <input type="text" value={carouselUploadUrl} onChange={e => setCarouselUploadUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                    </div>
                                </div>
                                {/* Row 2: level + cities + duration */}
                                <div className="flex flex-col md:flex-row gap-4 items-end">
                                    <div className="w-36">
                                        <label className="block text-xs text-slate-500 font-medium mb-1.5">播放级别</label>
                                        <div className="flex rounded-xl overflow-hidden border border-slate-200">
                                            <button onClick={() => setCarouselUploadLevel('province')} className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-all ${carouselUploadLevel === 'province' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>省级</button>
                                            <button onClick={() => setCarouselUploadLevel('city')} className={`flex-1 px-3 py-2.5 text-xs font-semibold transition-all ${carouselUploadLevel === 'city' ? 'bg-blue-500 text-white' : 'bg-white text-slate-400 hover:bg-slate-50'}`}>市级</button>
                                        </div>
                                    </div>
                                    {carouselUploadLevel === 'city' && (
                                        <div className="flex-1">
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">播放城市（可多选）</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {FUJIAN_CITIES.map(city => (
                                                    <button key={city} onClick={() => setCarouselUploadCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city])}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${carouselUploadCities.includes(city) ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-blue-300'}`}>
                                                        {city}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="w-28">
                                        <label className="block text-xs text-slate-500 font-medium mb-1.5">停留时间（秒）</label>
                                        <input type="number" min="1" max="60" value={carouselUploadDuration} onChange={e => setCarouselUploadDuration(Number(e.target.value) || 8)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                    </div>
                                    <div className="w-28">
                                        <label className="block text-xs text-slate-500 font-medium mb-1.5">优先级</label>
                                        <input type="number" min="0" max="999" value={carouselUploadPriority} onChange={e => setCarouselUploadPriority(Number(e.target.value) || 0)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                        <span className="text-[10px] text-slate-400 mt-0.5 block">数值越大越靠前</span>
                                    </div>
                                </div>
                                {/* Row 3: badge + title + sub */}
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="w-28">
                                        <label className="block text-xs text-slate-500 font-medium mb-1.5">角标文字</label>
                                        <input type="text" value={carouselUploadBadge} onChange={e => setCarouselUploadBadge(e.target.value)} placeholder="进行中" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-500 font-medium mb-1.5">主标题</label>
                                        <input type="text" value={carouselUploadTitle} onChange={e => setCarouselUploadTitle(e.target.value)} placeholder="大乐透玩法更新" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                    </div>
                                    <div className="flex-1">
                                        <label className="block text-xs text-slate-500 font-medium mb-1.5">副标题</label>
                                        <input type="text" value={carouselUploadSub} onChange={e => setCarouselUploadSub(e.target.value)} placeholder="本周奖池稳定增长" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                    </div>
                                </div>
                                {/* Row 4: buttons */}
                                <div className="flex gap-2 pt-1">
                                    <button onClick={() => handleCarouselUpload()} disabled={carouselUploading || !carouselUploadUrl} className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                                        <Plus size={15} /> 保存 URL
                                    </button>
                                    <div className="relative">
                                        <input ref={carouselFileInput} type="file" accept="image/*" className="hidden" onChange={handleCarouselFileChange} />
                                        <button onClick={() => carouselFileInput.current?.click()} disabled={carouselUploading} className="px-5 py-2.5 border border-dashed border-gray-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                                            <Upload size={15} /> 本地上传
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {carouselLibrary.map(asset => {
                                const isExternal = typeof asset.url === 'string' && asset.url.startsWith('http');
                                const isProvince = !asset.level || asset.level === 'province';
                                return (
                                    <div key={asset.id} className="group flex flex-col bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-md transition-all overflow-hidden">
                                        <div className="relative aspect-[21/9] bg-slate-50 rounded-xl overflow-hidden border-2 flex items-center justify-center">
                                            <img src={asset.url} alt={asset.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                <button onClick={() => copyToClipboard(asset.url)} className="p-2 bg-white text-slate-800 rounded-lg hover:bg-blue-500 hover:text-white transition-colors"><LinkIcon size={16} /></button>
                                                <button onClick={() => handleEditClick(asset, 'carousel')} className="p-2 bg-white text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"><Edit2 size={16} /></button>
                                                <button onClick={() => handleCarouselDelete(asset.id)} className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16} /></button>
                                            </div>
                                        </div>
                                        <div className="p-3 flex items-center justify-between">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-medium text-slate-800 text-sm truncate">{asset.name}</span>
                                                {asset.enabled === false && <span className="text-[9px] bg-red-50 text-red-500 px-1 py-0.5 rounded shrink-0">已禁用</span>}
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${isProvince ? 'bg-[#1e3a5f]/10 text-[#1e3a5f]' : 'bg-orange-50 text-orange-500'}`}>
                                                    {isProvince ? '省级' : (asset.cities || []).join('、') || '市级'}
                                                </span>
                                                <span className="text-[10px] text-slate-400">{Math.round((asset.duration || 8000) / 1000)}s</span>
                                                {asset.priority > 0 && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 font-medium">P{asset.priority}</span>}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* TAB: SCRATCH */}
                {activeTab === 'scratch' && (
                    <div className="space-y-6">
                        <Card>
                            <div className="flex items-center gap-3 mb-5">
                                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center">
                                    <Ticket size={15} className="text-[#1e3a5f]" />
                                </div>
                                <h3 className="text-sm font-bold text-slate-800">顶呱刮票面管理</h3>
                            </div>
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="w-[160px]">
                                    <label className="block text-xs text-slate-500 font-medium mb-1.5">面值档位</label>
                                    <select value={scratchUploadTier} onChange={e => setScratchUploadTier(parseInt(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                        <option value={10}>10元</option><option value={20}>20元</option>
                                        <option value={30}>30元</option><option value={50}>50元</option>
                                    </select>
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="block text-xs text-slate-500 font-medium mb-1.5">票面名称</label>
                                    <input type="text" value={scratchUploadName} onChange={e => setScratchUploadName(e.target.value)} placeholder="可选" className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                </div>
                                <div className="flex-1 w-full">
                                    <label className="block text-xs text-slate-500 font-medium mb-1.5">远程图片 URL</label>
                                    <input type="text" value={scratchUploadUrl} onChange={e => setScratchUploadUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none" />
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={handleScratchCrawl} disabled={scratchCrawling || scratchUploading} className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                                        {scratchCrawling ? <Loader2 size={15} className="animate-spin" /> : <Globe size={15} />}
                                        {scratchCrawling ? '爬取中...' : '抓取官方'}
                                    </button>
                                    <button onClick={() => handleScratchUpload()} disabled={scratchUploading || scratchCrawling || !scratchUploadUrl} className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-lg text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 active:scale-[0.98] shadow-sm disabled:opacity-50 flex items-center gap-2">
                                        <Plus size={15} /> 保存
                                    </button>
                                    <div className="relative">
                                        <input ref={scratchFileInput} type="file" accept="image/*" className="hidden" onChange={handleScratchFileChange} />
                                        <button onClick={() => scratchFileInput.current?.click()} disabled={scratchUploading || scratchCrawling} className="px-4 py-2.5 border border-dashed border-gray-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2">
                                            <Upload size={15} /> 本地
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </Card>

                        {/* Batch toolbar */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <button onClick={() => { setScratchSelectMode(m => !m); setSelectedScratch(new Set()); }}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${scratchSelectMode ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'}`}>
                                    {scratchSelectMode ? '退出多选' : '多选操作'}
                                </button>
                                {scratchSelectMode && (
                                    <>
                                        <button onClick={() => handleScratchSelectAll(scratchLibrary)} className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100">
                                            {selectedScratch.size === scratchLibrary.length ? '取消全选' : `全选 (${scratchLibrary.length})`}
                                        </button>
                                        {selectedScratch.size > 0 && (
                                            <>
                                                <button onClick={() => handleScratchBatchUpdate(true)} className="px-3 py-2 rounded-lg text-sm font-medium bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center gap-1">
                                                    <ToggleRight size={14} /> 上架 ({selectedScratch.size})
                                                </button>
                                                <button onClick={() => handleScratchBatchUpdate(false)} className="px-3 py-2 rounded-lg text-sm font-medium bg-orange-50 text-orange-600 border border-orange-200 flex items-center gap-1">
                                                    <ToggleLeft size={14} /> 下架 ({selectedScratch.size})
                                                </button>
                                                <button onClick={handleScratchBatchDelete} disabled={scratchDeleting} className="px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white flex items-center gap-1 disabled:opacity-50">
                                                    {scratchDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                    删除 ({selectedScratch.size})
                                                </button>
                                            </>
                                        )}
                                    </>
                                )}
                            </div>
                            {scratchSelectMode && selectedScratch.size > 0 && <span className="text-xs text-slate-400">已选 {selectedScratch.size} 项</span>}
                        </div>

                        {/* Tier grids */}
                        {[10, 20, 30, 50].map(tier => {
                            const tierImages = scratchLibrary.filter(img => img.tier === tier);
                            const tierColors = { 10: '#22c55e', 20: '#3b82f6', 30: '#f59e0b', 50: '#ef4444' };
                            const tierLabels = { 10: '10元', 20: '20元', 30: '30元', 50: '50元' };
                            return (
                                <Card key={tier}>
                                    <h3 className="text-sm font-semibold mb-4 flex items-center gap-2" style={{ color: tierColors[tier] }}>
                                        <span className="w-2 h-2 rounded-full" style={{ background: tierColors[tier] }} />
                                        {tierLabels[tier]} 票面 <span className="text-xs text-slate-400 font-normal ml-1">{tierImages.length} 款</span>
                                    </h3>
                                    {tierImages.length === 0 ? (
                                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">
                                            暂无 {tierLabels[tier]} 面值票面
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3">
                                            {tierImages.map(img => {
                                                const isExternal = img.type === 'external' || (typeof img.url === 'string' && img.url.startsWith('http'));
                                                const isSelected = selectedScratch.has(img.id);
                                                return (
                                                    <div key={img.id} onClick={scratchSelectMode ? () => handleScratchSelectToggle(img.id) : undefined}
                                                        className={`group flex flex-col bg-white rounded-2xl shadow-[0_1px_3px_rgba(0,0,0,0.04),0_0_0_1px_rgba(0,0,0,0.03)] hover:shadow-md transition-all overflow-hidden ${scratchSelectMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-blue-200' : ''}`}>
                                                        <div className={`relative aspect-square bg-slate-50 rounded-xl overflow-hidden border-2 ${isSelected ? 'border-blue-500' : 'border-transparent'} flex items-center justify-center transition-all ${!img.enabled ? 'opacity-50 grayscale' : ''}`}>
                                                            <img src={img.url || img.scratchFaceUrl || img.stitchedUrl || img.frontUrl || img.imageDataUrl} alt={img.name} className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform" />
                                                            {scratchSelectMode && (
                                                                <div className={`absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                                                                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-white font-bold ${isSelected ? 'bg-blue-500 border-blue-500' : 'bg-white/50 border-white'}`}>
                                                                        {isSelected && '\u2713'}
                                                                    </div>
                                                                </div>
                                                            )}
                                                            {!scratchSelectMode && (
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                                                                    {isExternal && (
                                                                        <button onClick={() => handleDownloadExternal(img, 'scratch')} disabled={downloadingId === img.id} className="p-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors">
                                                                            {downloadingId === img.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => handleScratchToggle(img.id, img.enabled)} className={`p-2 bg-white rounded-lg transition-colors ${img.enabled ? 'text-emerald-500 hover:bg-emerald-600' : 'text-slate-400 hover:bg-slate-600'} hover:text-white`}>
                                                                        {img.enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                                                                    </button>
                                                                    <button onClick={() => handleEditClick(img, 'scratch')} className="p-2 bg-white text-blue-500 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"><Edit2 size={16} /></button>
                                                                    <button onClick={() => handleScratchDelete(img.id)} className="p-2 bg-white text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"><Trash2 size={16} /></button>
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="p-2.5">
                                                            <div className="font-medium text-slate-800 text-[11px] truncate mb-1">{img.name}</div>
                                                            <div className="flex items-center justify-between">
                                                                {(img.scratchFaceUrl || img.stitchedUrl || !isExternal) ? (
                                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600">本地</span>
                                                                ) : (
                                                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-50 text-orange-500">外链</span>
                                                                )}
                                                                {!img.enabled && <span className="text-[9px] text-red-500 bg-red-50 px-1 py-0.5 rounded">已禁用</span>}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {editingAsset && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditingAsset(null)}>
                    <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl border border-gray-200" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#1e3a5f] via-[#3b82f6] to-[#06b6d4] rounded-t-2xl" />
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                            <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                                <Edit2 size={18} className={editTargetLibrary === 'carousel' ? 'text-indigo-500' : editTargetLibrary === 'scratch' ? 'text-emerald-500' : 'text-blue-500'} />
                                修改{editTargetLibrary === 'carousel' ? '轮播海报' : editTargetLibrary === 'scratch' ? '顶呱刮票面' : '图标'}
                            </h3>
                            <button onClick={() => setEditingAsset(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"><X size={18} /></button>
                        </div>
                        <div className="p-5 space-y-4 bg-slate-50/50">
                            <div className="flex justify-center">
                                {editTargetLibrary === 'scratch' && (editFrontUrl || editBackUrl) ? (
                                    <div className="w-full">
                                        <label className="block text-[11px] font-medium text-slate-500 mb-2">选择展示图片</label>
                                        <div className="flex gap-3">
                                            {editFrontUrl && (
                                                <div onClick={() => setEditUrl(editFrontUrl)} className={`flex-1 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${editUrl === editFrontUrl ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-gray-400'}`}>
                                                    <img src={editFrontUrl} alt="A" className="w-full aspect-[3/4] object-contain bg-white p-2" />
                                                    <div className={`text-center text-[11px] font-medium py-1 ${editUrl === editFrontUrl ? 'bg-emerald-500 text-white' : 'bg-slate-50 text-slate-500'}`}>A {editUrl === editFrontUrl && '\u2713'}</div>
                                                </div>
                                            )}
                                            {editBackUrl && (
                                                <div onClick={() => setEditUrl(editBackUrl)} className={`flex-1 cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${editUrl === editBackUrl ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200 hover:border-gray-400'}`}>
                                                    <img src={editBackUrl} alt="B" className="w-full aspect-[3/4] object-contain bg-white p-2" />
                                                    <div className={`text-center text-[11px] font-medium py-1 ${editUrl === editBackUrl ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-500'}`}>B {editUrl === editBackUrl && '\u2713'}</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`w-full ${editTargetLibrary === 'carousel' ? 'aspect-[21/9]' : 'aspect-square max-w-[140px]'} bg-white rounded-lg overflow-hidden border border-gray-200 flex items-center justify-center p-2`}>
                                        <img src={editingAsset.url || editingAsset.imageDataUrl} alt="preview" className="w-full h-full object-contain" />
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-xs text-slate-500 font-medium mb-1.5">名称</label>
                                <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none text-sm" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 font-medium mb-1.5">URL (覆盖生效)</label>
                                <input type="text" value={editUrl} onChange={e => setEditUrl(e.target.value)} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none font-mono text-xs text-blue-600" />
                            </div>

                            {editTargetLibrary === 'scratch' && (
                                <div className="space-y-3 pt-3 border-t border-dashed border-gray-200">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">面值档位</label>
                                            <select value={editTier} onChange={e => setEditTier(Number(e.target.value))} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm">
                                                <option value={10}>10元</option><option value={20}>20元</option>
                                                <option value={30}>30元</option><option value={50}>50元</option>
                                            </select>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">最高奖金</label>
                                            <input type="text" value={editMaxPrize} onChange={e => setEditMaxPrize(e.target.value)} placeholder="如：25万元" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-500 font-medium mb-1.5">玩法介绍</label>
                                        <textarea value={editIntro} onChange={e => setEditIntro(e.target.value)} rows={2} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs resize-none" placeholder="输入玩法介绍..." />
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                        <span className="text-sm font-medium text-slate-700">上架状态</span>
                                        <div onClick={() => setEditEnabled(!editEnabled)} className={`w-11 h-6 rounded-full transition-all cursor-pointer relative ${editEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${editEnabled ? 'left-6' : 'left-1'}`} />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {editTargetLibrary === 'carousel' && (
                                <div className="space-y-3 pt-3 border-t border-dashed border-gray-200">
                                    <div className="flex gap-4">
                                        <div className="w-32">
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">播放级别</label>
                                            <div className="flex rounded-xl overflow-hidden border border-slate-200">
                                                <button onClick={() => setEditLevel('province')} className={`flex-1 px-2 py-2.5 text-xs font-semibold transition-all ${editLevel === 'province' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-400'}`}>省级</button>
                                                <button onClick={() => setEditLevel('city')} className={`flex-1 px-2 py-2.5 text-xs font-semibold transition-all ${editLevel === 'city' ? 'bg-blue-500 text-white' : 'bg-white text-slate-400'}`}>市级</button>
                                            </div>
                                        </div>
                                        <div className="w-28">
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">停留时间（秒）</label>
                                            <input type="number" min="1" max="60" value={editDuration} onChange={e => setEditDuration(Number(e.target.value) || 8)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" />
                                        </div>
                                        <div className="w-28">
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">优先级</label>
                                            <input type="number" min="0" max="999" value={editPriority} onChange={e => setEditPriority(Number(e.target.value) || 0)} className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" />
                                            <span className="text-[10px] text-slate-400 mt-0.5 block">数值越大越靠前</span>
                                        </div>
                                    </div>
                                    {editLevel === 'city' && (
                                        <div>
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">播放城市</label>
                                            <div className="flex flex-wrap gap-1.5">
                                                {FUJIAN_CITIES.map(city => (
                                                    <button key={city} onClick={() => setEditCities(prev => prev.includes(city) ? prev.filter(c => c !== city) : [...prev, city])}
                                                        className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${editCities.includes(city) ? 'bg-blue-500 text-white' : 'bg-slate-50 text-slate-400 border border-slate-200 hover:border-blue-300'}`}>
                                                        {city}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="flex gap-3">
                                        <div className="w-28">
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">角标文字</label>
                                            <input type="text" value={editBadge} onChange={e => setEditBadge(e.target.value)} placeholder="进行中" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">主标题</label>
                                            <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="大乐透玩法更新" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" />
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-xs text-slate-500 font-medium mb-1.5">副标题</label>
                                            <input type="text" value={editSub} onChange={e => setEditSub(e.target.value)} placeholder="本周奖池稳定增长" className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none text-sm" />
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                                        <span className="text-sm font-medium text-slate-700">启用状态</span>
                                        <div onClick={() => setEditEnabled(!editEnabled)} className={`w-11 h-6 rounded-full transition-all cursor-pointer relative ${editEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-sm ${editEnabled ? 'left-6' : 'left-1'}`} />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-gray-100 bg-white flex justify-between items-center">
                            <div className="relative">
                                <input ref={editFileInput} type="file" accept="image/*" className="hidden" onChange={handleEditFileChange} />
                                <button onClick={() => editFileInput.current?.click()} disabled={editUploading} className="px-3 py-2 border border-dashed border-gray-300 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1.5 disabled:opacity-50">
                                    <ImageIcon size={13} /> 上传替换
                                </button>
                            </div>
                            <button onClick={() => handleEditSave()} disabled={editUploading}
                                className={`px-5 py-2.5 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2 active:scale-[0.98] shadow-sm ${
                                    editTargetLibrary === 'carousel' ? 'bg-indigo-600 hover:bg-indigo-700' :
                                    editTargetLibrary === 'scratch' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700' :
                                    'bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] hover:from-[#163050] hover:to-[#1e3a5f]'}`}>
                                {editUploading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} 保存
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageContainer>
    );
}
