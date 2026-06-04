import React, { useState, useEffect, useCallback } from 'react';
import { Gamepad2, Save, RotateCcw, Loader2, Check, AlertCircle, Music } from 'lucide-react';
import PageContainer from '../components/PageContainer';
import PageHeader from '../components/PageHeader';
import Card from '../components/Card';
import TabBar from '../components/TabBar';

const GAME_KEYS = ['xiaoxiaole', 'flappy-bird', 'lianliankan'];
const GAME_LABELS = { xiaoxiaole: '消消乐', 'flappy-bird': '小鸟快飞', lianliankan: '连连看' };
const GAME_ICONS = { xiaoxiaole: '🎮', 'flappy-bird': '🐦', lianliankan: '🔗' };

const CONFIG_SCHEMA = {
    xiaoxiaole: [
        { group: '难度设置', fields: [
            { key: 'STAR_TARGET', label: '收集目标', desc: '需收集几只乐小星获胜', min: 1, max: 30 },
            { key: 'MOVES', label: '总步数', desc: '游戏总步数上限', min: 10, max: 99 },
            { key: 'INITIAL_STARS', label: '初始星星数', desc: '开局投放几只乐小星', min: 0, max: 20 },
            { key: 'STAR_SPAWN_INTERVAL', label: '星星刷新间隔', desc: '每隔几步刷新一只乐小星', min: 1, max: 20 },
        ]},
        { group: '初始道具', fields: [
            { key: 'toolCounts_0', label: '锤子', desc: '开局锤子道具数量', min: 0, max: 99, isArray: true, arrIdx: 0 },
            { key: 'toolCounts_1', label: '交换', desc: '开局交换道具数量', min: 0, max: 99, isArray: true, arrIdx: 1 },
            { key: 'toolCounts_2', label: '魔法', desc: '开局魔法道具数量', min: 0, max: 99, isArray: true, arrIdx: 2 },
            { key: 'toolCounts_3', label: '刷新', desc: '开局刷新道具数量', min: 0, max: 99, isArray: true, arrIdx: 3 },
            { key: 'MAX_TOOLS', label: '道具持有上限', desc: '每种道具最大持有数量', min: 1, max: 999 },
        ]},
        { group: '消除分数', fields: [
            { key: 'matchScores_3', label: '3消得分', min: 0, max: 9999, isScore: true, scoreKey: '3' },
            { key: 'matchScores_4', label: '4消得分', min: 0, max: 9999, isScore: true, scoreKey: '4' },
            { key: 'matchScores_5', label: '5消得分', min: 0, max: 9999, isScore: true, scoreKey: '5' },
            { key: 'matchScores_L_T', label: 'L消/T消得分', min: 0, max: 9999, isScore: true, scoreKey: 'L_T' },
            { key: 'matchScores_cross4', label: '十字4消得分', min: 0, max: 9999, isScore: true, scoreKey: 'cross4' },
            { key: 'matchScores_cross5', label: '十字5消得分', min: 0, max: 9999, isScore: true, scoreKey: 'cross5' },
        ]},
        { group: '音频', fields: [
            { key: 'bgmVol', label: '背景音乐音量', desc: '0~1之间', min: 0, max: 1, step: 0.005, type: 'range' },
        ]},
    ],
    'flappy-bird': [
        { group: '物理参数', fields: [
            { key: 'GRAVITY', label: '重力', desc: '鸟下坠加速度', min: 0.1, max: 2, step: 0.05 },
            { key: 'FLAP_POWER', label: '跳跃力', desc: '点击时的上升力度（负值）', min: -15, max: -3, step: 0.5 },
            { key: 'BASE_SPEED', label: '初始速度', desc: '初始滚动速度', min: 1, max: 5, step: 0.1 },
            { key: 'MAX_SPEED', label: '最大速度', desc: '速度上限', min: 2, max: 8, step: 0.1 },
        ]},
        { group: '管道设置', fields: [
            { key: 'PIPE_INTERVAL', label: '管道间隔帧数', desc: '管道出现间隔', min: 80, max: 300 },
            { key: 'BASE_GAP', label: '初始管道间隙', desc: '越大越容易', min: 60, max: 200 },
            { key: 'MIN_GAP', label: '最小管道间隙', desc: '随难度增加最小值', min: 40, max: 150 },
        ]},
        { group: '奖牌分数', fields: [
            { key: 'medals_bronze', label: '铜牌分数', min: 1, max: 100, isMedal: true, medalKey: 'bronze' },
            { key: 'medals_silver', label: '银牌分数', min: 1, max: 100, isMedal: true, medalKey: 'silver' },
            { key: 'medals_gold', label: '金牌分数', min: 1, max: 200, isMedal: true, medalKey: 'gold' },
        ]},
    ],
    lianliankan: [
        { group: '难度设置', fields: [
            { key: 'TIME', label: '游戏时间（秒）', desc: '游戏限时', min: 30, max: 600 },
            { key: 'ROWS', label: '棋盘行数', desc: '行数×列数必须为偶数', min: 4, max: 12 },
            { key: 'COLS', label: '棋盘列数', desc: '行数×列数必须为偶数', min: 4, max: 14 },
        ]},
        { group: '分数设置', fields: [
            { key: 'BASE_SCORE', label: '基础分数', desc: '每次匹配基础得分', min: 1, max: 100 },
            { key: 'MAX_COMBO', label: '最大连击', desc: '连击倍率上限', min: 1, max: 20 },
            { key: 'COMBO_BONUS_MULTIPLIER', label: '连击加分', desc: '每级连击额外加分', min: 1, max: 50 },
        ]},
    ],
};

// 扁平化读取
function getFlatValue(config, field) {
    if (field.isArray) return (config.toolCounts || [])[field.arrIdx] ?? 0;
    if (field.isScore) return (config.matchScores || {})[field.scoreKey] ?? 0;
    if (field.isMedal) return (config.medals || {})[field.medalKey] ?? 0;
    return config[field.key] ?? 0;
}

// 扁平化写入
function setFlatValue(config, field, value) {
    const num = Number(value);
    if (field.isArray) {
        const arr = [...(config.toolCounts || [1,1,1,1])];
        arr[field.arrIdx] = num;
        return { ...config, toolCounts: arr };
    }
    if (field.isScore) {
        return { ...config, matchScores: { ...(config.matchScores || {}), [field.scoreKey]: num } };
    }
    if (field.isMedal) {
        return { ...config, medals: { ...(config.medals || {}), [field.medalKey]: num } };
    }
    return { ...config, [field.key]: num };
}

export default function GameConfig() {
    const [activeGame, setActiveGame] = useState('xiaoxiaole');
    const [configs, setConfigs] = useState({});
    const [defaults, setDefaults] = useState({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const loadConfig = useCallback(async () => {
        setLoading(true);
        try {
            const token = sessionStorage.getItem('adminToken');
            const res = await fetch('/api/super/game-config', {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            const data = await res.json();
            if (data.success) {
                setConfigs(data.config);
                setDefaults(data.defaults);
            }
        } catch {
            setMessage({ type: 'error', text: '加载配置失败' });
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadConfig(); }, [loadConfig]);

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const token = sessionStorage.getItem('adminToken');
            const superKey = sessionStorage.getItem('superKey');
            const res = await fetch('/api/super/game-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ superKey, game: activeGame, config: configs[activeGame] }),
            });
            const data = await res.json();
            if (data.success) {
                setMessage({ type: 'success', text: `${GAME_LABELS[activeGame]}配置已保存` });
            } else {
                setMessage({ type: 'error', text: data.error || '保存失败' });
            }
        } catch {
            setMessage({ type: 'error', text: '网络错误' });
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        setMessage(null);
        try {
            const token = sessionStorage.getItem('adminToken');
            const superKey = sessionStorage.getItem('superKey');
            const res = await fetch('/api/super/game-config/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ superKey, game: activeGame }),
            });
            const data = await res.json();
            if (data.success) {
                setConfigs(prev => ({ ...prev, [activeGame]: data.defaults }));
                setMessage({ type: 'success', text: `${GAME_LABELS[activeGame]}已恢复默认` });
            }
        } catch {
            setMessage({ type: 'error', text: '恢复失败' });
        }
    };

    const updateField = (field, value) => {
        setConfigs(prev => ({
            ...prev,
            [activeGame]: setFlatValue(prev[activeGame] || {}, field, value),
        }));
    };

    const config = configs[activeGame] || {};
    const schema = CONFIG_SCHEMA[activeGame] || [];
    const changed = JSON.stringify(configs[activeGame]) !== JSON.stringify(defaults[activeGame]);

    return (
        <PageContainer>
            <PageHeader icon={Gamepad2} title="游戏配置" description="管理三个小游戏的难度、道具、分数等参数">
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-slate-500 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <RotateCcw size={14} />
                        恢复默认
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className={`flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors ${
                            saving ? 'bg-slate-400' : changed ? 'bg-[#1e3a5f] hover:bg-[#163050]' : 'bg-slate-300'
                        }`}
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? '保存中...' : '保存配置'}
                    </button>
                </div>
            </PageHeader>

            {message && (
                <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm mb-4 ${
                    message.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                }`}>
                    {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                    {message.text}
                </div>
            )}

            <div className="mb-6">
                <TabBar
                    tabs={GAME_KEYS.map(k => ({ key: k, label: `${GAME_ICONS[k]} ${GAME_LABELS[k]}` }))}
                    activeKey={activeGame}
                    onChange={setActiveGame}
                />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20 text-slate-400">
                    <Loader2 className="animate-spin mr-2" size={20} /> 加载中...
                </div>
            ) : (
                <div className="space-y-5">
                    {schema.map(group => (
                        <Card key={group.group}>
                            <h3 className="text-sm font-semibold text-slate-700 mb-4 pb-3 border-b border-slate-100">
                                {group.group}
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
                                {group.fields.map(field => {
                                    const val = getFlatValue(config, field);
                                    const defVal = getFlatValue(defaults[activeGame] || {}, field);
                                    const isChanged = val !== defVal;
                                    return (
                                        <div key={field.key}>
                                            <label className="flex items-center justify-between mb-1.5">
                                                <span className={`text-sm font-medium ${isChanged ? 'text-[#1e3a5f]' : 'text-slate-600'}`}>
                                                    {field.label}
                                                    {isChanged && <span className="ml-1.5 text-[10px] text-amber-500 font-normal">已修改</span>}
                                                </span>
                                                {field.type === 'range' && (
                                                    <span className="text-xs text-slate-400 tabular-nums">{Number(val).toFixed(3)}</span>
                                                )}
                                            </label>
                                            {field.desc && (
                                                <p className="text-xs text-slate-400 mb-2">{field.desc}</p>
                                            )}
                                            {field.type === 'range' ? (
                                                <div className="flex items-center gap-3">
                                                    <input
                                                        type="range"
                                                        min={field.min}
                                                        max={field.max}
                                                        step={field.step || 0.005}
                                                        value={val}
                                                        onChange={e => updateField(field, e.target.value)}
                                                        className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-[#1e3a5f]"
                                                    />
                                                    <input
                                                        type="number"
                                                        min={field.min}
                                                        max={field.max}
                                                        step={field.step || 0.005}
                                                        value={val}
                                                        onChange={e => updateField(field, e.target.value)}
                                                        className="w-20 px-2 py-1.5 text-sm border border-slate-200 rounded-lg text-center tabular-nums"
                                                    />
                                                </div>
                                            ) : (
                                                <input
                                                    type="number"
                                                    min={field.min}
                                                    max={field.max}
                                                    step={field.step || 1}
                                                    value={val}
                                                    onChange={e => updateField(field, e.target.value)}
                                                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/20 focus:border-[#1e3a5f]"
                                                />
                                            )}
                                            <p className="text-[10px] text-slate-300 mt-1">默认: {defVal}</p>
                                        </div>
                                    );
                                })}
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </PageContainer>
    );
}
