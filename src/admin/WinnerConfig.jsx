import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { Plus, Trash2, Save, Trophy, CheckCircle, AlertCircle } from 'lucide-react';
import PageContainer from './components/PageContainer';
import PageHeader from './components/PageHeader';
import Card from './components/Card';

const extractVariablesFromPattern = (pattern) => {
    const vars = [];
    const re = /\{([a-zA-Z0-9_]+)\}/g;
    let m = null;
    while ((m = re.exec(String(pattern || ''))) !== null) {
        if (m[1] && !vars.includes(m[1])) vars.push(m[1]);
    }
    return vars;
};

const buildReportText = (template, values) => {
    if (!template?.pattern) return '';
    return template.pattern.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) => String(values?.[key] || ''));
};

export default function WinnerConfig({ storeId: propStoreId, onClose, isModal = false, adminKey: propAdminKey }) {
    const { storeId: routeStoreId } = useParams();
    const location = useLocation();

    const isMainAdmin = !isModal && location.pathname.startsWith('/admin');
    const storeId = propStoreId || (isMainAdmin ? 'default' : routeStoreId);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [storeCount, setStoreCount] = useState(0);

    const [winnerCenter, setWinnerCenter] = useState({
        maxReports: 10, templates: [], variableOptions: {}, sensitiveWords: []
    });
    const [winnerOptionTexts, setWinnerOptionTexts] = useState({});
    const [winnerReports, setWinnerReports] = useState([]);
    const [storeName, setStoreName] = useState('');

    const winnerTemplates = useMemo(
        () => (winnerCenter.templates || []).filter(t => t && t.enabled !== false),
        [winnerCenter.templates]
    );
    const winnerVarOptions = winnerCenter.variableOptions || {};
    const dotColors = ['#FF416C', '#11998e', '#f09819', '#4776E6', '#AF52DE', '#FF6A00'];

    useEffect(() => {
        const load = async () => {
            setLoading(true);
            setMessage({ type: '', text: '' });
            try {
                const superKey = sessionStorage.getItem('superKey') || '';
                const tasks = [
                    fetch('/api/system/winner-config').then(r => r.json()),
                    fetch('/api/system/sources').then(r => r.ok ? r.json() : null).catch(() => null)
                ];

                if (isMainAdmin) {
                    tasks.push(fetch('/api/store/default').then(r => r.json()).catch(() => null));
                    if (superKey) {
                        tasks.push(fetch(`/api/super/stores?superKey=${encodeURIComponent(superKey)}`).then(r => r.ok ? r.json() : []).catch(() => []));
                    } else {
                        tasks.push(Promise.resolve([]));
                    }
                } else {
                    tasks.push(fetch(`/api/store/${storeId}`).then(r => r.json()).catch(() => null));
                }

                const [winnerRes, sourcesRes, storeRes, storesRes] = await Promise.all(tasks);
                const sourceWinnerLines = Array.isArray(sourcesRes?.data?.winners)
                    ? sourcesRes.data.winners.map(item => String(item?.text || '').trim()).filter(Boolean)
                    : [];

                const center = winnerRes?.data || winnerRes || {};
                const mergedPresetLineOptions = Array.from(new Set([
                    ...(Array.isArray(center.variableOptions?.preset_line) ? center.variableOptions.preset_line : []),
                    ...sourceWinnerLines
                ].map(v => String(v || '').trim()).filter(Boolean)));

                const mergedVariableOptions = {
                    ...(center.variableOptions && typeof center.variableOptions === 'object' ? center.variableOptions : {}),
                    preset_line: mergedPresetLineOptions
                };

                setWinnerCenter(prev => ({
                    ...prev, ...center,
                    templates: Array.isArray(center.templates) ? center.templates : [],
                    variableOptions: mergedVariableOptions,
                    sensitiveWords: Array.isArray(center.sensitiveWords) ? center.sensitiveWords : []
                }));

                const optionTextMap = {};
                Object.entries(mergedVariableOptions).forEach(([key, arr]) => {
                    optionTextMap[key] = Array.isArray(arr) ? arr.join('，') : '';
                });
                setWinnerOptionTexts(optionTextMap);

                const storeCfg = storeRes || null;
                if (storeCfg) {
                    setStoreName(storeCfg.name || storeId);
                    const existingReports = Array.isArray(storeCfg.winnerReports) ? storeCfg.winnerReports : [];
                    if (isMainAdmin && existingReports.length === 0) {
                        const presetLines = mergedPresetLineOptions;
                        if (presetLines.length > 0) {
                            setWinnerReports(presetLines.slice(0, 6).map((line, idx) => ({
                                id: `preset-${idx + 1}`, templateId: 'preset_line',
                                values: { preset_line: String(line) }, enabled: true
                            })));
                        } else setWinnerReports([]);
                    } else setWinnerReports(existingReports);
                }

                if (isMainAdmin && Array.isArray(storesRes)) setStoreCount(storesRes.length);
            } catch {
                setMessage({ type: 'error', text: '加载失败，请刷新重试' });
            } finally { setLoading(false); }
        };
        load();
    }, [isMainAdmin, storeId]);

    const addTemplate = () => {
        setWinnerCenter(prev => ({
            ...prev,
            templates: [...(prev.templates || []), {
                id: `tpl-${Date.now()}`, label: '新模板',
                pattern: '恭喜本站彩民中{lottery_game}{prize_level}{bet_count}，奖金{amount}',
                variables: ['lottery_game', 'prize_level', 'bet_count', 'amount'], enabled: true
            }]
        }));
    };

    const updateTemplate = (idx, patch) => {
        setWinnerCenter(prev => {
            const next = [...(prev.templates || [])];
            const old = next[idx] || {};
            const merged = { ...old, ...patch };
            if (Object.prototype.hasOwnProperty.call(patch, 'pattern')) {
                merged.variables = extractVariablesFromPattern(merged.pattern);
            }
            next[idx] = merged;
            return { ...prev, templates: next };
        });
    };

    const deleteTemplate = (idx) => {
        setWinnerCenter(prev => ({ ...prev, templates: (prev.templates || []).filter((_, i) => i !== idx) }));
    };

    const saveWinnerCenter = async () => {
        const superKey = sessionStorage.getItem('superKey') || '';
        if (!superKey) { setMessage({ type: 'error', text: '需要超级管理员权限' }); return; }

        const nextOptions = {};
        Object.entries(winnerOptionTexts || {}).forEach(([key, raw]) => {
            const cleanKey = String(key || '').trim();
            if (!cleanKey) return;
            nextOptions[cleanKey] = Array.from(new Set(String(raw || '').split(/[\n,，]/g).map(v => v.trim()).filter(Boolean)));
        });

        const payloadCenter = {
            ...winnerCenter,
            templates: (winnerCenter.templates || []).map(t => ({ ...t, variables: extractVariablesFromPattern(t.pattern) })),
            variableOptions: nextOptions
        };

        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            const res = await fetch('/api/super/winner-config/update', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ superKey, winnerCenter: payloadCenter, sensitiveWords: winnerCenter.sensitiveWords || [] })
            });
            const data = await res.json();
            if (!res.ok || !data.success) { setMessage({ type: 'error', text: `保存失败：${data.error || '未知错误'}` }); return; }
            setMessage({ type: 'success', text: '全局模板配置已更新' });
        } catch { setMessage({ type: 'error', text: '网络错误' }); }
        finally { setSaving(false); setTimeout(() => setMessage({ type: '', text: '' }), 3000); }
    };

    const createReportByTemplate = (templateId) => {
        const tpl = winnerTemplates.find(t => t.id === templateId);
        const values = {};
        (tpl?.variables || []).forEach(key => { values[key] = (winnerVarOptions[key] || [])[0] || ''; });
        return { id: `wr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, templateId, values, enabled: true };
    };

    const addWinnerReport = () => {
        if (!winnerTemplates.length) return;
        setWinnerReports(prev => [...prev, createReportByTemplate(winnerTemplates[0].id)]);
    };

    const removeWinnerReport = (idx) => {
        setWinnerReports(prev => prev.filter((_, i) => i !== idx));
    };

    const updateWinnerReportTemplate = (idx, templateId) => {
        const replacement = createReportByTemplate(templateId);
        setWinnerReports(prev => {
            const next = [...prev];
            next[idx] = { ...next[idx], ...replacement, id: next[idx]?.id || replacement.id };
            return next;
        });
    };

    const updateWinnerReportValue = (idx, key, value) => {
        setWinnerReports(prev => {
            const next = [...prev];
            const item = next[idx] || {};
            next[idx] = { ...item, values: { ...(item.values || {}), [key]: value } };
            return next;
        });
    };

    const saveStoreWinnerReports = async () => {
        setSaving(true);
        setMessage({ type: '', text: '' });
        try {
            if (isMainAdmin) {
                // 主管理后台用 superKey 通过 winner-broadcast 接口保存
                const superKey = sessionStorage.getItem('superKey') || '';
                if (!superKey) { setMessage({ type: 'error', text: '未检测到超级管理密钥，请重新登录' }); return; }
                const res = await fetch('/api/super/winner-broadcast', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ superKey, winnerReports, targetStoreIds: [storeId] })
                });
                const data = await res.json();
                if (!res.ok || !data.success) { setMessage({ type: 'error', text: `保存失败：${data.error || '密钥错误'}` }); return; }
                setMessage({ type: 'success', text: `喜报配置已推送到 ${data.updatedStores || 1} 个门店` });
            } else {
                // 门店管理端用 adminKey
                const adminKey = propAdminKey || sessionStorage.getItem(`storeKey_${storeId}`) || '';
                if (!adminKey) { setMessage({ type: 'error', text: '未检测到管理密钥' }); return; }
                const res = await fetch('/api/store/update', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: storeId, adminKey, config: { winnerReports } })
                });
                const data = await res.json();
                if (!res.ok || !data.success) { setMessage({ type: 'error', text: `保存失败：${data.error || '密钥错误'}` }); return; }
                setMessage({ type: 'success', text: '本店喜报配置已保存' });
            }
            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch { setMessage({ type: 'error', text: '网络错误' }); }
        finally { setSaving(false); }
    };

    if (loading) return <div className="p-10 text-center text-slate-400 animate-pulse">同步数据中...</div>;

    const content = (
        <div className={`space-y-6 ${isModal ? '' : ''}`}>
            {message.text && (
                <div className={`p-3 rounded-lg flex items-center gap-2 text-sm ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
                }`}>
                    {message.type === 'success' ? <CheckCircle size={16} /> : message.type === 'error' ? <AlertCircle size={16} /> : null}
                    <span>{message.text}</span>
                </div>
            )}

            {isMainAdmin && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800">
                    <AlertCircle size={16} className="shrink-0 text-amber-500 mt-0.5" />
                    <p className="text-xs"><b>提示：</b>您当前位于全局管理中心。如需修改具体门店喜报，请通过门店隐藏入口进入。</p>
                </div>
            )}

            <Card>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                            <Trophy size={15} className="text-amber-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-semibold text-slate-700">
                                {isModal ? '喜报展示列表' : `喜报展示列表 — ${storeName || storeId}`}
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">选择模板与变量填充内容</p>
                        </div>
                    </div>
                    <button onClick={addWinnerReport} disabled={!winnerTemplates.length}
                        className="flex items-center gap-1.5 text-xs font-medium bg-[#1e3a5f] text-white px-3 py-1.5 rounded-lg hover:opacity-90 disabled:opacity-50 transition-all">
                        <Plus size={14} /> 添加喜报
                    </button>
                </div>

                {winnerReports.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                        {winnerReports.map((item, idx) => {
                            const template = winnerTemplates.find(t => t.id === item.templateId);
                            const variables = template?.variables || [];
                            const preview = buildReportText(template, item.values || {}) || item.text || '';
                            return (
                                <div key={item.id || idx} className="rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50/80 to-white p-3 space-y-2 relative group hover:shadow-md hover:-translate-y-0.5 transition-all" style={{ borderLeftWidth: '4px', borderLeftColor: dotColors[idx % dotColors.length] }}>
                                    <button onClick={() => removeWinnerReport(idx)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                    <select value={item.templateId || ''} onChange={e => updateWinnerReportTemplate(idx, e.target.value)}
                                        className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400">
                                        {winnerTemplates.map(t => <option key={t.id} value={t.id}>{t.label || t.id}</option>)}
                                    </select>
                                    {variables.length > 0 && (
                                        <div className="space-y-1.5">
                                            {variables.map(key => (
                                                <div key={key} className="flex items-center gap-2">
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider w-16 truncate">{key}</span>
                                                    <select value={item.values?.[key] || ''} onChange={e => updateWinnerReportValue(idx, key, e.target.value)}
                                                        className="flex-1 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs outline-none">
                                                        {(winnerVarOptions[key] || []).map(opt => <option key={`${key}-${opt}`} value={opt}>{opt}</option>)}
                                                    </select>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <div className="pt-2 border-t border-dashed border-gray-200 flex items-start gap-2 text-sm">
                                        <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: dotColors[idx % dotColors.length] }} />
                                        <span className="font-medium text-slate-700 leading-relaxed">{preview || '变量不全'}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                        <Trophy size={28} className="text-slate-300 mb-2" />
                        <span className="text-sm">暂无喜报内容</span>
                    </div>
                )}

                <div className="pt-4">
                    <button onClick={saveStoreWinnerReports} disabled={saving}
                        className="w-full py-2.5 bg-gradient-to-r from-[#1e3a5f] to-[#2a5a8f] text-white rounded-xl font-semibold hover:from-[#163050] hover:to-[#1e3a5f] disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.99] shadow-sm">
                        <Save size={15} />
                        {saving ? '正在保存...' : '提交本店喜报配置'}
                    </button>
                </div>
            </Card>
        </div>
    );

    if (isModal) return content;

    return (
        <PageContainer>
            <PageHeader icon={Trophy} title="喜报中心" description={`配置门店「${storeName || storeId}」的滚动喜报`} />
            {content}
        </PageContainer>
    );
}
