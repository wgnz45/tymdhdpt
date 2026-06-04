import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, Edit2, Loader2, X, Save, ImageIcon, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import PageContainer from './components/PageContainer';
import PageHeader from './components/PageHeader';
import Card from './components/Card';
import ConfirmDialog from './components/ConfirmDialog';

/**
 * 中奖大头贴边框管理页
 *  - 上传新边框 PNG（自动转 base64 上传到服务器）
 *  - 列出所有已上传边框
 *  - 重命名 / 删除
 *  - 内置「中奖款 / 体彩款」是 APK 兜底（无需在此管理）
 *
 * 路由：/admin/photo-frames
 * 权限：使用 sessionStorage 中的 superKey
 */
export default function PhotoFramesManager() {
    const [superKey, setSuperKey] = useState(() => sessionStorage.getItem('superKey') || '');
    const [isAuthed, setIsAuthed] = useState(() => !!sessionStorage.getItem('superKey'));
    const [frames, setFrames] = useState([]);
    const [loading, setLoading] = useState(false);
    const [uploadName, setUploadName] = useState('');
    const [uploadFile, setUploadFile] = useState(null);
    const [uploadPreview, setUploadPreview] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [editing, setEditing] = useState(null); // { id, label }
    const [toast, setToast] = useState({ type: '', text: '' });
    const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });
    const fileInputRef = useRef(null);

    const showToast = (type, text) => {
        setToast({ type, text });
        setTimeout(() => setToast({ type: '', text: '' }), 2500);
    };

    const showConfirm = (title, message, onConfirm) => {
        setConfirmState({ open: true, title, message, onConfirm });
    };

    // ── 拉取列表 ────────────────────────────────
    const fetchFrames = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/photo-frames', { cache: 'no-store' });
            const text = await res.text();
            // 服务未启动 / 接口不存在 时会被静态文件兜底返回 HTML，给友好提示
            if (text.trim().startsWith('<')) {
                throw new Error('后端服务未启动或未升级，请重启 Node 服务（npm run server）');
            }
            const data = JSON.parse(text);
            setFrames(Array.isArray(data.frames) ? data.frames : []);
        } catch (e) {
            console.error(e);
            showToast('error', '加载失败：' + e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isAuthed) fetchFrames();
    }, [isAuthed]);

    // ── 文件转 dataUrl ────────────────────────────
    const onFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) {
            showToast('error', '请选择图片文件');
            return;
        }
        if (file.size > 8 * 1024 * 1024) {
            showToast('error', '图片不能超过 8MB');
            return;
        }
        setUploadFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setUploadPreview(ev.target.result);
        reader.readAsDataURL(file);
        if (!uploadName) setUploadName(file.name.replace(/\.[^.]+$/, ''));
    };

    // ── 上传 ──────────────────────────────────
    const handleUpload = async () => {
        if (!uploadPreview) return showToast('error', '请先选择图片');
        if (!uploadName.trim()) return showToast('error', '请填写边框名称');
        setUploading(true);
        try {
            const res = await fetch('/api/photo-frames/upload', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    superKey,
                    label: uploadName.trim(),
                    imageDataUrl: uploadPreview,
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || '上传失败');
            showToast('success', '上传成功');
            setUploadName('');
            setUploadFile(null);
            setUploadPreview(null);
            if (fileInputRef.current) fileInputRef.current.value = '';
            fetchFrames();
        } catch (e) {
            showToast('error', e.message);
        } finally {
            setUploading(false);
        }
    };

    // ── 删除 ──────────────────────────────────
    const handleDelete = (frame) => {
        showConfirm('删除边框', `确定删除「${frame.label}」？`, async () => {
            setConfirmState((s) => ({ ...s, open: false }));
            try {
                const res = await fetch('/api/photo-frames/delete', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ superKey, id: frame.id })
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || '删除失败');
                showToast('success', '已删除');
                fetchFrames();
            } catch (e) {
                showToast('error', e.message);
            }
        });
    };

    // ── 换图 ──────────────────────────────
    const handleReplaceImage = (frame) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/png,image/jpeg,image/webp';
        input.onchange = async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (file.size > 8 * 1024 * 1024) return showToast('error', '图片不能超过 8MB');
            const dataUrl = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (ev) => resolve(ev.target.result);
                reader.readAsDataURL(file);
            });
            try {
                const res = await fetch('/api/photo-frames/update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ superKey, id: frame.id, imageDataUrl: dataUrl })
                });
                const data = await res.json();
                if (!res.ok || !data.success) throw new Error(data.error || '换图失败');
                showToast('success', '图片已替换');
                fetchFrames();
            } catch (err) {
                showToast('error', err.message);
            }
        };
        input.click();
    };

    // ── 重命名 ────────────────────────
    const handleSaveEdit = async () => {
        if (!editing?.label?.trim()) return showToast('error', '名称不能为空');
        try {
            const res = await fetch('/api/photo-frames/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, id: editing.id, label: editing.label.trim() })
            });
            const data = await res.json();
            if (!res.ok || !data.success) throw new Error(data.error || '保存失败');
            showToast('success', '已保存');
            setEditing(null);
            fetchFrames();
        } catch (e) {
            showToast('error', e.message);
        }
    };

    // ── 登录 ──────────────────────────────────
    const handleAuth = () => {
        if (!superKey) return showToast('error', '请输入 SuperKey');
        sessionStorage.setItem('superKey', superKey);
        setIsAuthed(true);
    };

    if (!isAuthed) {
        return (
            <PageContainer>
                <PageHeader icon={ImageIcon} title="中奖大头贴边框" description="管理拍照大头贴的可选边框（无需打包 APK 即时生效）" />
                <Card>
                    <div className="p-6 max-w-md">
                        <label className="text-sm text-slate-700 font-medium block mb-2">SuperKey</label>
                        <input
                            type="password"
                            value={superKey}
                            onChange={(e) => setSuperKey(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') handleAuth(); }}
                            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                            placeholder="输入超级管理密钥"
                        />
                        <button
                            onClick={handleAuth}
                            className="mt-4 px-6 py-2.5 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700 transition"
                        >
                            进入管理
                        </button>
                    </div>
                </Card>
            </PageContainer>
        );
    }

    return (
        <PageContainer>
            <ConfirmDialog
                open={confirmState.open}
                title={confirmState.title}
                message={confirmState.message}
                onConfirm={confirmState.onConfirm}
                onCancel={() => setConfirmState((s) => ({ ...s, open: false }))}
            />

            <PageHeader
                icon={ImageIcon}
                title="中奖大头贴边框"
                description="管理拍照大头贴的可选边框，无需打包 APK 即时生效。APK 启动时会自动拉取最新列表。"
            />

            {/* Toast */}
            {toast.text && (
                <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 text-sm font-medium ${
                    toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
                }`}>
                    {toast.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                    {toast.text}
                </div>
            )}

            {/* 上传区 */}
            <Card>
                <div className="p-5 border-b border-slate-100 flex items-center gap-2">
                    <Upload size={18} className="text-blue-500" />
                    <h3 className="text-base font-semibold text-slate-800">上传新边框</h3>
                </div>
                <div className="p-5 grid md:grid-cols-3 gap-4 items-start">
                    <div className="space-y-3">
                        <label className="text-xs font-medium text-slate-600 block">边框名称</label>
                        <input
                            type="text"
                            value={uploadName}
                            onChange={(e) => setUploadName(e.target.value)}
                            placeholder="如：兔年中奖款"
                            className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 text-sm"
                        />

                        <label className="text-xs font-medium text-slate-600 block mt-3">边框图片（PNG，建议 4:3，中央透明）</label>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp"
                            onChange={onFileChange}
                            className="block w-full text-sm text-slate-600 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100 cursor-pointer"
                        />

                        <button
                            onClick={handleUpload}
                            disabled={uploading || !uploadPreview}
                            className="w-full px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold disabled:opacity-50 hover:opacity-90 active:scale-[0.98] transition flex items-center justify-center gap-2"
                        >
                            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                            {uploading ? '上传中…' : '上传'}
                        </button>
                    </div>

                    <div className="md:col-span-2">
                        <label className="text-xs font-medium text-slate-600 block mb-2">预览</label>
                        <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden">
                            {uploadPreview ? (
                                <img src={uploadPreview} alt="预览" className="max-w-full max-h-full" />
                            ) : (
                                <div className="text-slate-400 text-sm">选择图片后此处显示预览</div>
                            )}
                        </div>
                    </div>
                </div>
            </Card>

            {/* 边框列表 */}
            <Card className="mt-5">
                <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                    <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                        <ImageIcon size={18} className="text-emerald-500" />
                        全部边框（{frames.length}）
                    </h3>
                    <button
                        onClick={fetchFrames}
                        className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium transition"
                    >
                        刷新
                    </button>
                </div>

                <div className="p-5">
                    {loading ? (
                        <div className="text-center py-12 text-slate-400 flex items-center justify-center gap-2">
                            <Loader2 size={18} className="animate-spin" /> 加载中…
                        </div>
                    ) : frames.length === 0 ? (
                        <div className="text-center py-12 text-slate-400 text-sm">
                            暂无边框，请上传或重启后端服务以初始化内置边框
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {frames.map((f) => (
                                <div key={f.id} className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm hover:shadow-md transition">
                                    <div className="aspect-[4/3] bg-slate-50">
                                        <img src={f.url} alt={f.label} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="p-3">
                                        {editing?.id === f.id ? (
                                            <div className="flex items-center gap-2">
                                                <input
                                                    value={editing.label}
                                                    onChange={(e) => setEditing({ ...editing, label: e.target.value })}
                                                    className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                                                    autoFocus
                                                />
                                                <button onClick={handleSaveEdit} className="p-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600">
                                                    <Save size={14} />
                                                </button>
                                                <button onClick={() => setEditing(null)} className="p-1.5 rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300">
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-sm font-semibold text-slate-800 truncate flex-1" title={f.label}>{f.label}</div>
                                                    {f.builtin && <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium flex-shrink-0">内置</span>}
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-0.5">
                                                    {f.createdAt ? new Date(f.createdAt).toLocaleString('zh-CN') : ''}
                                                </div>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <button
                                                        onClick={() => setEditing({ id: f.id, label: f.label })}
                                                        className="flex-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium flex items-center justify-center gap-1"
                                                    >
                                                        <Edit2 size={12} /> 改名
                                                    </button>
                                                    <button
                                                        onClick={() => handleReplaceImage(f)}
                                                        className="flex-1 px-2 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 text-xs font-medium flex items-center justify-center gap-1"
                                                    >
                                                        <RefreshCw size={12} /> 换图
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(f)}
                                                        className="flex-1 px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium flex items-center justify-center gap-1"
                                                    >
                                                        <Trash2 size={12} /> 删除
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </Card>
        </PageContainer>
    );
}
