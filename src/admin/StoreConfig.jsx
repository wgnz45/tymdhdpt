import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Save, Lock, Trash2, Edit2, X, Ticket, CheckSquare, Settings, AlertCircle, CheckCircle, Globe, Phone, User, FileText, ToggleLeft, ToggleRight, Palette, Layers, Megaphone } from 'lucide-react';
import { DEFAULT_MANAGER_TITLES, sanitizeManagerTitles, splitManagerText } from '../utils/adminHelpers';
import PageContainer from './components/PageContainer';
import PageHeader from './components/PageHeader';
import Card from './components/Card';
import ConfirmDialog from './components/ConfirmDialog';

const SURNAME_PATTERN = /^[\u4e00-\u9fa5]{1,2}$/;
const PHONE_PATTERN = /^\d{11}$/;

function SectionHeader({ icon: Icon, title, description, children }) {
    return (
        <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/10 flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-[#1e3a5f]" />
                </div>
                <div>
                    <h3 className="text-sm font-bold text-slate-800">{title}</h3>
                    {description && <p className="text-xs text-slate-400 mt-0.5">{description}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

export default function StoreConfig({ storeId: propStoreId, initialKey, onClose, superKey, activeSection = null }) {
    const { storeId: routeStoreId } = useParams();
    const location = useLocation();

    const isMainAdmin = location.pathname.startsWith('/admin');
    const isStoreReadOnlySection = !isMainAdmin;
    const canSaveCurrentSection = isMainAdmin || activeSection === null || activeSection === 'basic';

    const storeId = propStoreId || (isMainAdmin ? 'default' : routeStoreId);
    const isEditingDefault = storeId === 'default';

    const [config, setConfig] = useState({
        name: '', address: '', manager: '', slogan: '', contact: '', phone: '',
        qrCode: '', watermarkText: '', theme: 'default', status: 'open',
        features: { regular: true, package: true },
        gameConfig: { regulars: [], packages: [] }, marquees: [], winnerReports: []
    });
    const [adminKey, setAdminKey] = useState(initialKey || '');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [managerTitles, setManagerTitles] = useState([...DEFAULT_MANAGER_TITLES]);
    const [managerSurname, setManagerSurname] = useState('');
    const [managerTitle, setManagerTitle] = useState(DEFAULT_MANAGER_TITLES[0]);
    const [managerError, setManagerError] = useState('');
    const [phoneError, setPhoneError] = useState('');

    const [scratchLibrary, setScratchLibrary] = useState([]);
    const [scratchSelected, setScratchSelected] = useState({});
    const [scratchTierDrawCounts, setScratchTierDrawCounts] = useState({});
    const [savingScratch, setSavingScratch] = useState(false);
    const [scratchMsg, setScratchMsg] = useState('');

    const [editingRegular, setEditingRegular] = useState(null);
    const [editingPackage, setEditingPackage] = useState(null);
    const [confirmState, setConfirmState] = useState({ open: false, title: '', message: '', onConfirm: null });

    const showConfirm = (title, message, onConfirm) => {
        setConfirmState({ open: true, title, message, onConfirm });
    };

    const addRegular = () => {
        if (!isMainAdmin) return;
        const newId = (config.gameConfig.regulars.length > 0 ? Math.max(...config.gameConfig.regulars.map(i => i.id)) : 0) + 1;
        setEditingRegular({ id: newId, isNew: true, label: '新玩法', sub: '', price: 2, action: 'regular', params: { r: 5, b: 2 }, color: 'orange' });
    };
    const saveRegular = (item) => {
        let newRegulars = [...config.gameConfig.regulars];
        if (item.isNew) { const { isNew, ...rest } = item; newRegulars.push(rest); }
        else { const idx = newRegulars.findIndex(i => i.id === item.id); if (idx !== -1) newRegulars[idx] = item; }
        setConfig(prev => ({ ...prev, gameConfig: { ...prev.gameConfig, regulars: newRegulars } }));
        setEditingRegular(null);
    };
    const removeRegular = (id) => {
        if (!isMainAdmin) return;
        showConfirm('确认删除', '确定删除此玩法吗？', () => {
            setConfirmState(prev => ({ ...prev, open: false }));
            setConfig(prev => ({ ...prev, gameConfig: { ...prev.gameConfig, regulars: prev.gameConfig.regulars.filter(i => i.id !== id) } }));
        });
    };

    const addPackage = () => {
        if (!isMainAdmin) return;
        const newId = (config.gameConfig.packages.length > 0 ? Math.max(...config.gameConfig.packages.map(i => i.id)) : 100) + 1;
        setEditingPackage({ id: newId, isNew: true, title: '超值套餐', price: 18, items: [] });
    };
    const savePackage = (pkg) => {
        let newPackages = [...config.gameConfig.packages];
        if (pkg.isNew) { const { isNew, ...rest } = pkg; newPackages.push(rest); }
        else { const idx = newPackages.findIndex(i => i.id === pkg.id); if (idx !== -1) newPackages[idx] = pkg; }
        setConfig(prev => ({ ...prev, gameConfig: { ...prev.gameConfig, packages: newPackages } }));
        setEditingPackage(null);
    };
    const removePackage = (id) => {
        if (!isMainAdmin) return;
        showConfirm('确认删除', '确定删除此套餐吗？', () => {
            setConfirmState(prev => ({ ...prev, open: false }));
            setConfig(prev => ({ ...prev, gameConfig: { ...prev.gameConfig, packages: prev.gameConfig.packages.filter(i => i.id !== id) } }));
        });
    };

    useEffect(() => {
        const loadAllData = async () => {
            const resolvedSuperKey = superKey || sessionStorage.getItem('superKey');
            setLoading(true);
            try {
                const storeUrl = `/api/store/${storeId}?adminKey=${initialKey || ''}&superKey=${resolvedSuperKey || ''}`;
                const scratchDataUrl = `/api/store/${storeId}/scratch`;
                const fullLibraryUrl = resolvedSuperKey ? `/api/super/scratch/library?superKey=${resolvedSuperKey}` : null;

                const [storeRes, scratchDataRes, fullLibRes] = await Promise.all([
                    fetch(storeUrl).then(r => r.json()),
                    fetch(scratchDataUrl).then(r => r.json()),
                    fullLibraryUrl ? fetch(fullLibraryUrl).then(r => r.json()) : Promise.resolve(null)
                ]);

                if (storeRes && (storeRes.name || storeRes.id)) {
                    const resolvedKey = storeRes.adminKey || initialKey || '';
                    const resolvedTitles = sanitizeManagerTitles(storeRes.managerTitleTemplates);
                    const resolvedPhone = String(storeRes.contact || storeRes.phone || '').replace(/\D/g, '').slice(0, 11);
                    const managerParts = splitManagerText(storeRes.manager, resolvedTitles);
                    const normalizedSurname = String(managerParts.surname || '').replace(/[^\u4e00-\u9fa5]/g, '').slice(0, 2);
                    const normalizedTitle = resolvedTitles.includes(managerParts.title) ? managerParts.title : resolvedTitles[0];

                    setManagerTitles(resolvedTitles);
                    setManagerSurname(normalizedSurname);
                    setManagerTitle(normalizedTitle);

                    setConfig(prev => ({
                        ...prev, ...storeRes, adminKey: resolvedKey,
                        manager: normalizedSurname ? `${normalizedSurname}${normalizedTitle}` : '',
                        contact: resolvedPhone, phone: resolvedPhone,
                        features: storeRes.features || { regular: true, package: true },
                        gameConfig: storeRes.gameConfig || { regulars: [], packages: [] },
                        marquees: storeRes.marquees || [], winnerReports: storeRes.winnerReports || []
                    }));
                }

                const finalLibrary = (fullLibRes && Array.isArray(fullLibRes)) ? fullLibRes : (scratchDataRes.library || []);
                setScratchLibrary(finalLibrary);
                const cfg = scratchDataRes.scratchConfig || {};
                const rawSelected = cfg.selected || {};
                const validIds = new Set(finalLibrary.map(img => img.id));
                const cleanedSelected = {};
                [10, 20, 30, 50].forEach(tier => {
                    cleanedSelected[tier] = Array.isArray(rawSelected[tier]) ? rawSelected[tier].filter(id => validIds.has(id)) : [];
                });
                setScratchSelected(cleanedSelected);
                setScratchTierDrawCounts(cfg.tierDrawCounts || {});
            } catch (err) { console.error('[StoreConfig] Load Error:', err); }
            finally { setLoading(false); }
        };
        loadAllData();
    }, [storeId, initialKey, superKey]);

    const updateManagerValue = (surname, title) => {
        const cleanSurname = String(surname || '').trim();
        const cleanTitle = sanitizeManagerTitles(managerTitles).includes(title) ? title : sanitizeManagerTitles(managerTitles)[0];
        setManagerSurname(cleanSurname);
        setManagerTitle(cleanTitle);
        setConfig(prev => ({ ...prev, manager: SURNAME_PATTERN.test(cleanSurname) ? `${cleanSurname}${cleanTitle}` : '' }));
        if (!cleanSurname) setManagerError('');
    };

    const handleManagerSurnameChange = (e) => {
        const raw = e.target.value || '';
        setManagerSurname(raw);
        const normalizedSurname = String(raw).trim();
        setConfig(prev => ({ ...prev, manager: SURNAME_PATTERN.test(normalizedSurname) ? `${normalizedSurname}${managerTitle}` : '' }));
        if (managerError) setManagerError('');
    };

    const handleManagerTitleChange = (e) => {
        const nextTitle = e.target.value;
        setManagerTitle(nextTitle);
        const normalizedSurname = String(managerSurname || '').trim();
        setConfig(prev => ({ ...prev, manager: SURNAME_PATTERN.test(normalizedSurname) ? `${normalizedSurname}${nextTitle}` : '' }));
    };

    const handlePhoneChange = (e) => {
        const digits = String(e.target.value || '').replace(/\D/g, '').slice(0, 11);
        setConfig(prev => ({ ...prev, contact: digits, phone: digits }));
        setPhoneError(!digits || PHONE_PATTERN.test(digits) ? '' : '联系电话只能输入11位数字');
    };

    const validateManagerAndPhone = () => {
        const normalizedSurname = String(managerSurname || '').trim();
        const hasManager = Boolean(normalizedSurname);
        const finalManager = hasManager ? `${normalizedSurname}${managerTitle}` : '';
        const managerValid = !hasManager || (SURNAME_PATTERN.test(normalizedSurname) && Boolean(managerTitle));
        if (!managerValid) { setManagerError('联系人需为X姓氏+称呼模板'); return { ok: false }; }
        setManagerError('');
        const finalPhone = String(config.contact || config.phone || '').trim();
        if (finalPhone && !PHONE_PATTERN.test(finalPhone)) { setPhoneError('联系电话只能输入11位数字'); return { ok: false }; }
        setPhoneError('');
        return { ok: true, manager: finalManager, phone: finalPhone };
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        if (name.startsWith('feature_')) {
            const featureName = name.replace('feature_', '');
            setConfig(prev => ({ ...prev, features: { ...prev.features, [featureName]: checked } }));
        } else {
            setConfig(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!canSaveCurrentSection) { setMessage({ type: 'error', text: '当前页由省中心统一配置' }); return; }
        const validated = validateManagerAndPhone();
        if (!validated.ok) return;
        const keyToUse = adminKey;
        setSaving(true);
        setMessage({ type: '', text: '' });
        const effectiveSuperKey = superKey || sessionStorage.getItem('superKey');
        let configToSave = { ...config, manager: validated.manager, contact: validated.phone, phone: validated.phone };
        if (!isMainAdmin) configToSave = { manager: validated.manager, contact: validated.phone, phone: validated.phone };

        fetch('/api/store/update', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: storeId, adminKey: keyToUse, superKey: effectiveSuperKey, config: configToSave })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) { setMessage({ type: 'success', text: '配置已成功保存' }); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
                else setMessage({ type: 'error', text: '保存失败：' + (data.error || '密钥错误') });
                setSaving(false);
            })
            .catch(() => { setMessage({ type: 'error', text: '网络错误' }); setSaving(false); });
    };

    if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">数据同步中...</div>;

    const inputCls = "w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";
    const inputClsError = "w-full px-4 py-2.5 bg-red-50/50 border border-red-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-400 transition-all";

    const inner = (
        <div className={`space-y-6`}>
            <ConfirmDialog open={confirmState.open} title={confirmState.title} message={confirmState.message}
                confirmLabel="确认" danger onConfirm={confirmState.onConfirm || (() => {})}
                onCancel={() => setConfirmState(prev => ({ ...prev, open: false }))} />

            {message.text && (
                <div className={`p-3.5 rounded-xl flex items-center gap-2.5 text-sm font-medium ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-blue-50 text-blue-700 border border-blue-100'
                }`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : message.type === 'error' ? <AlertCircle size={16} /> : null}
                    <span>{message.text}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6 pb-24">
                {/* Basic Info Section */}
                {(activeSection === null || activeSection === 'basic') && (
                    <Card>
                        <SectionHeader icon={Globe} title={isMainAdmin ? '基础信息与密钥' : '基础信息'} description={isMainAdmin ? '门店标识、名称与访问凭证' : '仅联系人与联系电话可编辑'}>
                            {isMainAdmin && (
                                <div className="flex items-center gap-2">
                                    <span className={`text-xs font-semibold ${config.status === 'closed' ? 'text-red-500' : 'text-emerald-500'}`}>
                                        {config.status === 'closed' ? '已关店' : '正常营业'}
                                    </span>
                                    <div onClick={() => setConfig({ ...config, status: config.status === 'closed' ? 'open' : 'closed' })}
                                        className={`w-11 h-6 rounded-full transition-all cursor-pointer relative ${config.status !== 'closed' ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                                        <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${config.status !== 'closed' ? 'left-5' : 'left-0.5'}`} />
                                    </div>
                                </div>
                            )}
                        </SectionHeader>

                        {isMainAdmin && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-xs text-slate-400 font-semibold mb-1.5">门店 ID</label>
                                    <input type="text" name="id" value={config.id || ''} onChange={handleChange}
                                        className={inputClsError} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 font-semibold mb-1.5">管理密钥</label>
                                    <input type="text" name="adminKey" value={config.adminKey || ''} onChange={handleChange}
                                        className="w-full px-4 py-2.5 bg-amber-50/50 border border-amber-200 rounded-xl text-amber-800 outline-none text-sm font-mono" />
                                </div>
                            </div>
                        )}

                        {isMainAdmin && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                                <div>
                                    <label className="block text-xs text-slate-400 font-semibold mb-1.5">店铺名称</label>
                                    <input type="text" name="name" value={config.name || ''} onChange={handleChange} className={inputCls} />
                                </div>
                                <div>
                                    <label className="block text-xs text-slate-400 font-semibold mb-1.5">门店地址</label>
                                    <input type="text" name="address" value={config.address || ''} onChange={handleChange} className={inputCls} />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="block text-xs text-slate-400 font-semibold mb-1.5">
                                    <span className="flex items-center gap-1"><User size={11} /> 联系人（姓氏 + 称呼）</span>
                                </label>
                                <div className="grid grid-cols-[120px_1fr] gap-2">
                                    <input type="text" value={managerSurname} onChange={handleManagerSurnameChange}
                                        onBlur={e => setManagerSurname(String(e.target.value || '').trim())}
                                        placeholder="如：王" maxLength={8}
                                        className={`w-full px-3 py-2.5 rounded-xl text-sm outline-none ${managerError ? 'bg-red-50/50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`} />
                                    <select value={managerTitle} onChange={handleManagerTitleChange}
                                        className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                        {managerTitles.map(title => <option key={title} value={title}>{title}</option>)}
                                    </select>
                                </div>
                                {managerError && <p className="text-xs text-red-500 mt-1">{managerError}</p>}
                                {managerSurname && <p className="text-[11px] text-blue-500 mt-1 font-medium">预览：{managerSurname}{managerTitle}</p>}
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 font-semibold mb-1.5">
                                    <span className="flex items-center gap-1"><Phone size={11} /> 联系电话</span>
                                </label>
                                <input type="text" inputMode="numeric" maxLength={11} value={config.contact || ''} onChange={handlePhoneChange}
                                    placeholder="11位手机号"
                                    className={`w-full px-4 py-2.5 rounded-xl text-sm outline-none ${phoneError ? 'bg-red-50/50 border border-red-200' : 'bg-slate-50 border border-slate-200'}`} />
                                {phoneError && <p className="text-xs text-red-500 mt-1">{phoneError}</p>}
                            </div>
                        </div>

                        {!isMainAdmin && (
                            <div className="text-xs text-blue-600 bg-blue-50/80 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-2">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                其余门店展示与宣发内容由省中心统一配置下发。
                            </div>
                        )}

                        {isMainAdmin && (
                            <div className="mt-5 pt-5 border-t border-slate-100">
                                <SectionHeader icon={Megaphone} title="公告内容（跑马灯）" description="添加多条滚动公告文本" >
                                    <button type="button" onClick={() => {
                                        setConfig(prev => ({ ...prev, marquees: [...(prev.marquees || []), { id: Date.now(), text: '' }] }));
                                    }} className="text-xs bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#163050] transition-colors">+ 添加</button>
                                </SectionHeader>
                                <div className="space-y-2">
                                    {config.marquees?.map((m, i) => (
                                        <div key={m.id || i} className="flex gap-2">
                                            <input value={m.text} onChange={e => {
                                                const newMs = [...config.marquees]; newMs[i].text = e.target.value;
                                                setConfig({ ...config, marquees: newMs });
                                            }} className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all" />
                                            <button type="button" onClick={() => setConfig({ ...config, marquees: config.marquees.filter((_, idx) => idx !== i) })}
                                                className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </Card>
                )}

                {/* Games & Features */}
                {(activeSection === null || activeSection === 'games') && (
                    <div className={`space-y-6 ${isStoreReadOnlySection ? 'relative' : ''}`}>
                        {isStoreReadOnlySection && (
                            <div className="text-xs text-amber-600 bg-amber-50/80 border border-amber-100 rounded-xl px-4 py-3 flex items-center gap-2">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                本页仅展示当前配置，门店端不可修改。
                            </div>
                        )}
                        <div className={isStoreReadOnlySection ? 'pointer-events-none opacity-70 select-none' : ''}>
                            <Card>
                                <SectionHeader icon={ToggleLeft} title="功能开关与防伪设置" description="控制前台显示模式与防伪参数" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[1.5px]">模式开关</h4>
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                                                <span className="text-sm font-medium text-slate-700">常规选号模式</span>
                                                <div onClick={() => setConfig(prev => ({ ...prev, features: { ...prev.features, regular: !prev.features?.regular } }))}
                                                    className={`w-11 h-6 rounded-full transition-all cursor-pointer relative ${config.features?.regular !== false ? 'bg-[#1e3a5f]' : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${config.features?.regular !== false ? 'left-5' : 'left-0.5'}`} />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between bg-slate-50/80 p-3.5 rounded-xl border border-slate-100">
                                                <span className="text-sm font-medium text-slate-700">套餐选号模式</span>
                                                <div onClick={() => setConfig(prev => ({ ...prev, features: { ...prev.features, package: !prev.features?.package } }))}
                                                    className={`w-11 h-6 rounded-full transition-all cursor-pointer relative ${config.features?.package !== false ? 'bg-[#1e3a5f]' : 'bg-slate-300'}`}>
                                                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${config.features?.package !== false ? 'left-5' : 'left-0.5'}`} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[1.5px]">防伪显示</h4>
                                        <input type="text" name="watermarkText" value={config.watermarkText} onChange={handleChange}
                                            className={inputCls} placeholder="底部防伪水印" />
                                        <input type="text" name="qrCode" value={config.qrCode} onChange={handleChange}
                                            className={inputCls} placeholder="二维码图标链接" />
                                    </div>
                                </div>
                            </Card>

                            <Card>
                                <SectionHeader icon={Layers} title="常规玩法" description="添加和管理自定义常规玩法">
                                    <button type="button" onClick={addRegular} className="text-xs bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg font-medium hover:bg-[#163050] transition-colors">+ 新增</button>
                                </SectionHeader>
                                <div className="grid grid-cols-2 md:grid-cols-5 xl:grid-cols-6 gap-2">
                                    {config.gameConfig.regulars.map(item => (
                                        <div key={item.id} className="relative group rounded-xl border border-slate-100 p-3 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-sm transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-bold text-sm text-slate-800">{item.label}</span>
                                                    <div className="text-[10px] text-orange-500 font-semibold mt-0.5">￥{item.price}</div>
                                                    <div className="text-[10px] text-slate-400 mt-0.5">
                                                        {item.action === 'batch' ? `单式 ${item.params?.count || 5} 注` : `复式 ${item.params?.r || 5}红+${item.params?.b || 2}蓝`}
                                                    </div>
                                                </div>
                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => setEditingRegular(item)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={11} /></button>
                                                    <button type="button" onClick={() => removeRegular(item.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={11} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>

                            <Card>
                                <SectionHeader icon={Ticket} title="套餐玩法" description="配置套餐类型与定价">
                                    <button type="button" onClick={addPackage} className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-emerald-700 transition-colors">+ 新增</button>
                                </SectionHeader>
                                <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3">
                                    {config.gameConfig.packages.map(pkg => (
                                        <div key={pkg.id} className="relative group rounded-xl border border-slate-100 p-3.5 bg-slate-50/50 hover:bg-white hover:border-emerald-200 hover:shadow-sm transition-all">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="font-bold text-sm text-slate-800">{pkg.title}</span>
                                                    <div className="text-[10px] text-emerald-500 font-semibold mt-0.5">￥{pkg.price}</div>
                                                    {(pkg.items && pkg.items.length > 0) && (
                                                        <div className="mt-1 space-y-0.5">
                                                            {pkg.items.map((it, i) => (
                                                                <div key={i} className="text-[10px] text-slate-400">
                                                                    {it.text || (it.type === 'batch' ? `单式${it.count}注` : `复式${it.r}+${it.b}`)}
                                                                    {it.count > 1 && it.type !== 'batch' ? ` ×${it.count}` : ''}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" onClick={() => setEditingPackage(pkg)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Edit2 size={11} /></button>
                                                    <button type="button" onClick={() => removePackage(pkg.id)} className="p-1 text-red-500 hover:bg-red-50 rounded"><Trash2 size={11} /></button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}

                {/* Scratch Card Section */}
                {(activeSection === null || activeSection === 'scratch') && (
                    <Card>
                        <SectionHeader icon={Palette} title="顶呱刮票面配置" description="选择各价位档次的票面展示" />
                        {isStoreReadOnlySection && (
                            <div className="text-xs text-amber-600 bg-amber-50/80 border border-amber-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
                                <AlertCircle size={14} className="flex-shrink-0" />
                                本页仅展示，门店端不可修改。
                            </div>
                        )}
                        <div className={isStoreReadOnlySection ? 'pointer-events-none opacity-70 select-none' : ''}>
                            {scratchLibrary.length === 0 ? (
                                <div className="text-center py-10 text-slate-300 text-sm">暂无票面图库</div>
                            ) : (
                                <div className="space-y-5">
                                    {[10, 20, 30, 50].map(tier => {
                                        const tierImgs = scratchLibrary.filter(img => img.tier === tier && img.enabled);
                                        const selectedIds = scratchSelected[tier] || [];
                                        const toggleImg = (id) => {
                                            setScratchSelected(prev => {
                                                const cur = prev[tier] || [];
                                                return { ...prev, [tier]: cur.includes(id) ? cur.filter(i => i !== id) : [...cur, id] };
                                            });
                                        };
                                        return (
                                            <div key={tier} className="pb-4 border-b border-slate-100 last:border-0">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="text-lg font-bold text-[#1e3a5f]">{tier}元</span>
                                                    <span className="text-xs text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md">已选 {selectedIds.length}</span>
                                                </div>
                                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                                    {tierImgs.map(img => {
                                                        const isSelected = selectedIds.includes(img.id);
                                                        return (
                                                            <button key={img.id} type="button" onClick={() => toggleImg(img.id)}
                                                                className={`relative flex flex-col rounded-xl overflow-hidden border-2 transition-all bg-white ${isSelected ? 'border-blue-500 shadow-md ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300'}`}>
                                                                <div className="aspect-[3/4] bg-slate-50 overflow-hidden">
                                                                    <img src={img.url || img.scratchFaceUrl || img.frontUrl || img.imageDataUrl} className="w-full h-full object-cover" alt="" />
                                                                </div>
                                                                <div className="px-1.5 py-1 text-[10px] text-slate-500 truncate text-center">{img.name}</div>
                                                                {isSelected && <div className="absolute top-0.5 right-0.5 bg-blue-500 text-white p-0.5 rounded-md"><CheckSquare size={10} /></div>}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            <button type="button" onClick={async () => {
                                setSavingScratch(true);
                                try {
                                    const res = await fetch('/api/store/scratch/update', {
                                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ id: storeId, adminKey: adminKey || initialKey, superKey: superKey || sessionStorage.getItem('superKey') || undefined, scratchConfig: { selected: scratchSelected, tierDrawCounts: scratchTierDrawCounts } })
                                    });
                                    const data = await res.json();
                                    if (data.success) { setScratchMsg('保存成功'); setTimeout(() => setScratchMsg(''), 2000); }
                                    else { setScratchMsg('保存失败: ' + (data.error || '未知错误')); setTimeout(() => setScratchMsg(''), 3000); }
                                } catch { setScratchMsg('保存失败'); }
                                finally { setSavingScratch(false); }
                            }} className="w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold text-sm mt-5 disabled:opacity-50 hover:from-emerald-600 hover:to-emerald-700 transition-all active:scale-[0.99] shadow-sm"
                                disabled={isStoreReadOnlySection}>
                                {savingScratch ? '保存中...' : '保存顶呱刮配置'}
                            </button>
                            {scratchMsg && <p className="text-center text-xs text-emerald-600 mt-2 font-medium">{scratchMsg}</p>}
                        </div>
                    </Card>
                )}

                {/* Bottom Auth Bar */}
                <div className="bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] px-6 py-3.5 rounded-2xl text-white shadow-lg shadow-blue-900/10 flex flex-col md:flex-row items-center justify-between gap-3 sticky bottom-0 z-10">
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <Lock size={16} className="text-blue-300" />
                        <input type="password" value={adminKey} onChange={e => setAdminKey(e.target.value)}
                            className="w-full md:w-64 px-4 py-2.5 bg-white/10 border border-white/10 rounded-xl text-white outline-none font-mono text-sm placeholder-blue-200/50 focus:bg-white/15 transition-all"
                            placeholder="输入管理密钥以保存" disabled={!canSaveCurrentSection} />
                    </div>
                    <button type="submit" disabled={saving || !canSaveCurrentSection}
                        className="w-full md:w-auto px-8 py-2.5 bg-white text-[#1e3a5f] rounded-xl font-semibold text-sm hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm active:scale-[0.98]">
                        {!canSaveCurrentSection ? '当前页只读' : (saving ? '保存中...' : '提交更改')}
                    </button>
                </div>
            </form>

            {/* Edit Regular Modal */}
            {editingRegular && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setEditingRegular(null)}>
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-200" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-slate-800 mb-4">编辑玩法</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 font-semibold mb-1">显示名称</label>
                                <input value={editingRegular.label} onChange={e => setEditingRegular({ ...editingRegular, label: e.target.value })} className={inputCls} placeholder="如 5+3、新玩法" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 font-semibold mb-1">价格（元）</label>
                                <input type="number" min={1} value={editingRegular.price} onChange={e => setEditingRegular({ ...editingRegular, price: Number(e.target.value) })} className={inputCls} />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 font-semibold mb-1">玩法类型</label>
                                <div className="flex gap-2">
                                    <button type="button" onClick={() => setEditingRegular({ ...editingRegular, action: 'regular', params: { r: editingRegular.params?.r || 5, b: editingRegular.params?.b || 2 } })}
                                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${editingRegular.action !== 'batch' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        复式（选红+蓝）
                                    </button>
                                    <button type="button" onClick={() => setEditingRegular({ ...editingRegular, action: 'batch', params: { count: editingRegular.params?.count || 5 } })}
                                        className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${editingRegular.action === 'batch' ? 'bg-[#1e3a5f] text-white' : 'bg-slate-100 text-slate-500'}`}>
                                        单式（批量N注）
                                    </button>
                                </div>
                            </div>
                            {editingRegular.action === 'batch' ? (
                                <div>
                                    <label className="block text-xs text-slate-400 font-semibold mb-1">每次生成注数</label>
                                    <input type="number" min={1} max={50} value={editingRegular.params?.count || 5} onChange={e => setEditingRegular({ ...editingRegular, params: { count: Number(e.target.value) } })} className={inputCls} />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-slate-400 font-semibold mb-1">红球数量</label>
                                        <input type="number" min={5} max={35} value={editingRegular.params?.r || 5} onChange={e => setEditingRegular({ ...editingRegular, params: { ...editingRegular.params, r: Number(e.target.value) } })} className={inputCls} />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-slate-400 font-semibold mb-1">蓝球数量</label>
                                        <input type="number" min={2} max={12} value={editingRegular.params?.b || 2} onChange={e => setEditingRegular({ ...editingRegular, params: { ...editingRegular.params, b: Number(e.target.value) } })} className={inputCls} />
                                    </div>
                                </div>
                            )}
                            <div>
                                <label className="block text-xs text-slate-400 font-semibold mb-1">按钮颜色</label>
                                <div className="flex gap-2">
                                    {['orange', 'blue'].map(c => (
                                        <button key={c} type="button" onClick={() => setEditingRegular({ ...editingRegular, color: c })}
                                            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${editingRegular.color === c ? (c === 'orange' ? 'bg-orange-500 text-white' : 'bg-blue-500 text-white') : 'bg-slate-100 text-slate-500'}`}>
                                            {c === 'orange' ? '橙色' : '蓝色'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setEditingRegular(null)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">取消</button>
                            <button onClick={() => saveRegular(editingRegular)} className="flex-1 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white rounded-xl text-sm font-semibold hover:from-[#163050] hover:to-[#1e3a5f] transition-all active:scale-[0.98]">确定</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Package Modal */}
            {editingPackage && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setEditingPackage(null)}>
                    <div className="bg-white w-full max-w-lg rounded-2xl p-6 shadow-xl border border-slate-200 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-slate-800 mb-4">编辑套餐</h3>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-slate-400 font-semibold mb-1">套餐名称</label>
                                <input value={editingPackage.title} onChange={e => setEditingPackage({ ...editingPackage, title: e.target.value })} className={inputCls} placeholder="如 超值套餐" />
                            </div>
                            <div>
                                <label className="block text-xs text-slate-400 font-semibold mb-1">总价（元）</label>
                                <input type="number" min={1} value={editingPackage.price} onChange={e => setEditingPackage({ ...editingPackage, price: Number(e.target.value) })} className={inputCls} />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="text-xs text-slate-400 font-semibold">套餐内容（注）</label>
                                    <button type="button" onClick={() => setEditingPackage({ ...editingPackage, items: [...(editingPackage.items || []), { type: 'batch', count: 1, text: '' }] })}
                                        className="text-[10px] bg-emerald-500 text-white px-2 py-1 rounded-lg font-medium hover:bg-emerald-600 transition-colors">+ 添加一项</button>
                                </div>
                                {(!editingPackage.items || editingPackage.items.length === 0) && (
                                    <div className="text-center py-4 text-slate-300 text-xs border-2 border-dashed border-slate-200 rounded-xl">暂无内容，点击上方按钮添加</div>
                                )}
                                <div className="space-y-2">
                                    {(editingPackage.items || []).map((item, idx) => {
                                        const updateItem = (key, val) => {
                                            const newItems = [...editingPackage.items];
                                            newItems[idx] = { ...newItems[idx], [key]: val };
                                            setEditingPackage({ ...editingPackage, items: newItems });
                                        };
                                        const removeItem = () => {
                                            const newItems = editingPackage.items.filter((_, i) => i !== idx);
                                            setEditingPackage({ ...editingPackage, items: newItems });
                                        };
                                        const switchType = (newType) => {
                                            const newItems = [...editingPackage.items];
                                            newItems[idx] = newType === 'batch'
                                                ? { type: 'batch', count: item.count || 1, text: item.text || '' }
                                                : { type: 'compound', r: item.r || 5, b: item.b || 2, count: item.count || 1, text: item.text || '' };
                                            setEditingPackage({ ...editingPackage, items: newItems });
                                        };
                                        return (
                                            <div key={idx} className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-bold text-slate-400">第 {idx + 1} 项</span>
                                                    <button type="button" onClick={removeItem} className="text-red-400 hover:text-red-600 transition-colors"><Trash2 size={13} /></button>
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="button" onClick={() => switchType('batch')}
                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${item.type === 'batch' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                                        单式（5+2）
                                                    </button>
                                                    <button type="button" onClick={() => switchType('compound')}
                                                        className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${item.type !== 'batch' ? 'bg-[#1e3a5f] text-white' : 'bg-white text-slate-500 border border-slate-200'}`}>
                                                        复式（自定义）
                                                    </button>
                                                </div>
                                                {item.type === 'batch' ? (
                                                    <div>
                                                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">注数</label>
                                                        <input type="number" min={1} max={50} value={item.count || 1} onChange={e => updateItem('count', Number(e.target.value))} className={inputCls} />
                                                    </div>
                                                ) : (
                                                    <div className="grid grid-cols-3 gap-2">
                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">红球</label>
                                                            <input type="number" min={5} max={35} value={item.r || 5} onChange={e => updateItem('r', Number(e.target.value))} className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">蓝球</label>
                                                            <input type="number" min={2} max={12} value={item.b || 2} onChange={e => updateItem('b', Number(e.target.value))} className={inputCls} />
                                                        </div>
                                                        <div>
                                                            <label className="block text-[10px] text-slate-400 font-semibold mb-1">注数</label>
                                                            <input type="number" min={1} max={10} value={item.count || 1} onChange={e => updateItem('count', Number(e.target.value))} className={inputCls} />
                                                        </div>
                                                    </div>
                                                )}
                                                <div>
                                                    <label className="block text-[10px] text-slate-400 font-semibold mb-1">按钮文字（留空自动生成）</label>
                                                    <input value={item.text || ''} onChange={e => updateItem('text', e.target.value)} className={inputCls}
                                                        placeholder={item.type === 'batch' ? `单式${item.count || 1}注` : `复式${item.r || 5}+${item.b || 2}`} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-6">
                            <button onClick={() => setEditingPackage(null)} className="flex-1 py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">取消</button>
                            <button onClick={() => savePackage(editingPackage)} className="flex-1 py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white rounded-xl text-sm font-semibold hover:from-[#163050] hover:to-[#1e3a5f] transition-all active:scale-[0.98]">确定</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (onClose || activeSection) return inner;

    return (
        <PageContainer>
            <PageHeader
                icon={Settings}
                title={isEditingDefault ? '总站内容配置' : '门店显示配置'}
                description={isEditingDefault ? '修改主站的展示文字与功能参数' : `编辑子站点 ID: ${storeId}`}
            />
            {inner}
        </PageContainer>
    );
}
