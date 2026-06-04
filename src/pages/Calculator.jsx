import React, { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

// --- Helper: Combinatorics ---
const combination = (n, k) => {
    if (k < 0 || k > n) return 0;
    if (k === 0 || k === n) return 1;
    if (k > n / 2) k = n - k;
    let res = 1;
    for (let i = 1; i <= k; i++) res = res * (n - i + 1) / i;
    return res;
};

// --- Constants ---
const PRIZES = [
    // Standard Prizes (match conditions are key identifiers)
    { level: 1, label: "一等奖", match: "5+2", fix: 10000000 },
    { level: 2, label: "二等奖", match: "5+1", fix: 238000 },
    { level: 3, label: "三等奖", match: "5+0", fix: 10000 },
    { level: 4, label: "四等奖", match: "4+2", fix: 3000 },
    { level: 5, label: "五等奖", match: "4+1", fix: 300 },
    { level: 6, label: "六等奖", match: "3+2", fix: 200 },
    { level: 7, label: "七等奖", match: "4+0", fix: 100 },
    { level: 8, label: "八等奖", match: "3+1, 2+2", fix: 15 },
    { level: 9, label: "九等奖", match: "3+0, 1+2, 2+1, 0+2", fix: 5 },
];

export default function Calculator() {
    const { storeId } = useParams();
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (storeId) {
            fetch(`/api/store/${storeId}`)
                .then(res => {
                    if (res.status === 404) setNotFound(true);
                })
                .catch(() => { });
        }
    }, [storeId]);



    // --- Global Data ---
    const [history, setHistory] = useState([]);
    const [selectedPeriod, setSelectedPeriod] = useState('');
    const [drawResult, setDrawResult] = useState(null); // { reds: [], blues: [] }

    // --- User Tickets State ---
    const [tickets, setTickets] = useState([]); // Array of { id, reds:[], blues:[], isAdditional, count, price }

    // --- Editor/Drawer State ---
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingId, setEditingId] = useState(null); // If editing existing ticket

    // Temporary Editor Data
    const [editorReds, setEditorReds] = useState(Array(35).fill(false));
    const [editorBlues, setEditorBlues] = useState(Array(12).fill(false));
    const [editorAdditional, setEditorAdditional] = useState(false);

    // --- Calc Results (Aggregated) ---
    const [totalStat, setTotalStat] = useState({ count: 0, price: 0 });
    const [totalPrize, setTotalPrize] = useState({
        isWin: false,
        totalWin: 0,
        details: [] // { level: 1, count: 0, money: 0, label }
    });
    const [ticketsWinInfo, setTicketsWinInfo] = useState({}); // { [id]: { isWin, text, money } }

    // --- Initialization ---
    useEffect(() => {
        fetch('/data.json')
            .then(res => res.json())
            .then(data => {
                const list = data.history || [];
                if (data.latest && data.latest.period) {
                    list.unshift({
                        period: data.latest.period.replace(/[^\d]/g, ''),
                        reds: data.latest.reds,
                        blues: data.latest.blues
                    });
                }
                setHistory(list);
                if (list.length > 0) {
                    setSelectedPeriod(list[0].period);
                    setDrawResult({ reds: list[0].reds, blues: list[0].blues });
                }
            })
            .catch(err => console.error(err));
    }, []);

    // --- Handlers ---

    // 1. Period Switch
    const handlePeriodChange = (e) => {
        const p = e.target.value;
        setSelectedPeriod(p);
        const found = history.find(h => h.period === p);
        if (found) {
            setDrawResult({ reds: found.reds, blues: found.blues });
        }
    };

    // 2. Open Editor (New or Edit)
    const openEditor = (ticket = null) => {
        if (ticket) {
            setEditingId(ticket.id);
            // Hydrate state
            const rState = Array(35).fill(false);
            ticket.reds.forEach(n => rState[parseInt(n) - 1] = true);
            setEditorReds(rState);

            const bState = Array(12).fill(false);
            ticket.blues.forEach(n => bState[parseInt(n) - 1] = true);
            setEditorBlues(bState);

            setEditorAdditional(ticket.isAdditional);
        } else {
            setEditingId(null);
            setEditorReds(Array(35).fill(false));
            setEditorBlues(Array(12).fill(false));
            setEditorAdditional(false);
        }
        setIsEditorOpen(true);
    };

    // 3. Editor Toggles
    const toggleRed = (i) => {
        const next = [...editorReds];
        next[i] = !next[i];
        setEditorReds(next);
    };
    const toggleBlue = (i) => {
        const next = [...editorBlues];
        next[i] = !next[i];
        setEditorBlues(next);
    };

    // 4. Save Ticket
    const saveTicket = () => {
        const rCount = editorReds.filter(Boolean).length;
        const bCount = editorBlues.filter(Boolean).length;

        if (rCount < 5 || bCount < 2) {
            alert("至少选择5个红球和2个蓝球");
            return;
        }

        const count = combination(rCount, 5) * combination(bCount, 2);
        const price = count * (editorAdditional ? 3 : 2);

        const reds = editorReds.map((v, i) => v ? String(i + 1).padStart(2, '0') : null).filter(Boolean);
        const blues = editorBlues.map((v, i) => v ? String(i + 1).padStart(2, '0') : null).filter(Boolean);

        const newTicket = {
            id: editingId || Date.now(),
            reds,
            blues,
            isAdditional: editorAdditional,
            count,
            price
        };

        if (editingId) {
            setTickets(prev => prev.map(t => t.id === editingId ? newTicket : t));
        } else {
            setTickets(prev => [...prev, newTicket]);
        }

        setIsEditorOpen(false);
    };

    // 5. Delete Ticket
    const deleteTicket = (id) => {
        setTickets(prev => prev.filter(t => t.id !== id));
    };

    // --- Calculation Engine ---
    useEffect(() => {
        // 1. Total Cost
        const totalC = tickets.reduce((acc, t) => acc + t.count, 0);
        const totalP = tickets.reduce((acc, t) => acc + t.price, 0);
        setTotalStat({ count: totalC, price: totalP });

        // 2. Prize Calculation
        if (!drawResult || tickets.length === 0) {
            setTotalPrize({ isWin: false, totalWin: 0, details: [] });
            setTicketsWinInfo({});
            return;
        }

        const drawReds = drawResult.reds;
        const drawBlues = drawResult.blues;

        let grandTotalWin = 0;
        let grandBreakdown = {}; // level -> count
        const newWinInfo = {};

        // Helper: Generate combinations
        const getCombs = (arr, k) => {
            const res = [];
            const backtrack = (start, curr) => {
                if (curr.length === k) return res.push([...curr]);
                for (let i = start; i < arr.length; i++) {
                    curr.push(arr[i]);
                    backtrack(i + 1, curr);
                    curr.pop();
                }
            };
            backtrack(0, []);
            return res;
        };

        // Iterate ALL Tickets
        tickets.forEach(ticket => {
            const rCombs = getCombs(ticket.reds, 5);
            const bCombs = getCombs(ticket.blues, 2);

            let tWin = 0;
            let tCounts = {};

            for (const r of rCombs) {
                for (const b of bCombs) {
                    const rHit = r.filter(x => drawReds.includes(x)).length;
                    const bHit = b.filter(x => drawBlues.includes(x)).length;

                    let level = 0;
                    if (rHit === 5 && bHit === 2) level = 1;
                    else if (rHit === 5 && bHit === 1) level = 2;
                    else if (rHit === 5 && bHit === 0) level = 3;
                    else if (rHit === 4 && bHit === 2) level = 4;
                    else if (rHit === 4 && bHit === 1) level = 5;
                    else if (rHit === 3 && bHit === 2) level = 6;
                    else if (rHit === 4 && bHit === 0) level = 7;
                    else if ((rHit === 3 && bHit === 1) || (rHit === 2 && bHit === 2)) level = 8;
                    else if ((rHit === 3 && bHit === 0) || (rHit === 1 && bHit === 2) || (rHit === 2 && bHit === 1) || (rHit === 0 && bHit === 2)) level = 9;

                    if (level > 0) {
                        grandBreakdown[level] = (grandBreakdown[level] || 0) + 1;
                        tCounts[level] = (tCounts[level] || 0) + 1;

                        // Calculate Money for this single hit
                        const rule = PRIZES.find(p => p.level == level);
                        const unit = rule ? rule.fix : 0;
                        const finalUnit = ticket.isAdditional ? (unit * 1.5) : unit; // Simplified additional rule (1.5x)

                        grandTotalWin += finalUnit;
                        tWin += finalUnit;
                    }
                }
            }

            // Record per-ticket result
            if (tWin > 0) {
                const levels = Object.keys(tCounts).map(Number).sort((a, b) => a - b);
                let text = '';
                // If only one prize level won (matches specific prize name)
                if (levels.length === 1) {
                    const lvl = levels[0];
                    const rule = PRIZES.find(p => p.level == lvl);
                    text = `${rule ? rule.label : lvl + '等奖'} ${tWin.toLocaleString()}元`;
                } else {
                    // Start Mixed
                    text = `中奖 ${tWin.toLocaleString()}元`;
                }
                newWinInfo[ticket.id] = { isWin: true, text, money: tWin };
            } else {
                newWinInfo[ticket.id] = { isWin: false, text: '未中奖', money: 0 };
            }
        });

        // Format Details
        const detailArr = [];
        Object.keys(grandBreakdown).forEach(lvl => {
            const count = grandBreakdown[lvl];
            const rule = PRIZES.find(p => p.level == lvl);
            // Re-calculate total money for this level is hard if mixed additional/non-additional.
            // But grandTotalWin is exact.
            // For detail label, we just show count.
            detailArr.push({ level: lvl, count, label: rule ? rule.label : `Level ${lvl}` });
        });

        setTicketsWinInfo(newWinInfo);
        setTotalPrize({
            isWin: grandTotalWin > 0,
            totalWin: grandTotalWin,
            details: detailArr
        });

    }, [tickets, drawResult]);



    // --- UI Render ---
    if (notFound) {
        return (
            <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <i className="fa-solid fa-store-slash text-4xl text-gray-400"></i>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">站点不存在</h2>
                    <p className="text-gray-500 mb-6">该门店站可能已被管理员删除或暂停运营。</p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors"
                    >
                        返回主站
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm flex-none">
                <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white text-sm shadow transform -rotate-3">
                            <i className="fa-solid fa-calculator"></i>
                        </div>
                        <h1 className="text-lg font-black text-blue-900 tracking-tight">大乐透计算器</h1>
                    </div>
                </div>
            </div>

            <div className="flex-1 max-w-3xl mx-auto w-full p-4 pb-32 space-y-4">

                {/* 1. Period & Draw Display */}
                <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10 text-orange-500 text-6xl">
                        <i className="fa-solid fa-trophy"></i>
                    </div>
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center relative z-10">
                        <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-lg border border-orange-200">
                            <span className="text-sm font-bold text-orange-800">第</span>
                            <select
                                value={selectedPeriod}
                                onChange={handlePeriodChange}
                                className="bg-transparent font-mono font-bold text-lg text-orange-600 outline-none border-b border-orange-300 focus:border-orange-500"
                            >
                                {history.map(h => (
                                    <option key={h.period} value={h.period}>{h.period}</option>
                                ))}
                            </select>
                            <span className="text-sm font-bold text-orange-800">期开奖</span>
                        </div>

                        {drawResult && (
                            <div className="flex gap-1.5">
                                {drawResult.reds.map((n, i) => (
                                    <div key={i} className="w-8 h-8 bg-red-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">{n}</div>
                                ))}
                                {drawResult.blues.map((n, i) => (
                                    <div key={i} className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-sm">{n}</div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Total Prize Banner (Sticky if Win?) */}
                {totalPrize.isWin && (
                    <div className="bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl p-5 text-white shadow-lg animate-in zoom-in slide-in-from-top-4 duration-300 relative overflow-hidden">
                        <div className="absolute inset-0 bg-white/10 opacity-50 backdrop-blur-3xl"></div>
                        <div className="relative z-10 flex flex-col items-center">
                            <div className="text-sm font-bold opacity-90 uppercase tracking-widest mb-1">本期中奖总金额</div>
                            <div className="text-5xl font-black drop-shadow-md tracking-tight">
                                <span className="text-2xl align-top mr-1">¥</span>
                                {totalPrize.totalWin.toLocaleString()}
                            </div>
                            {/* Breakdown Chips */}
                            <div className="flex flex-wrap justify-center gap-2 mt-4">
                                {totalPrize.details.map((d, i) => (
                                    <span key={i} className="bg-white/20 hover:bg-white/30 transition backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold border border-white/20">
                                        {d.label} {d.count}注
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. Ticket List */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">我的注单列表 ({tickets.length})</h2>
                        {tickets.length > 0 && (
                            <button onClick={() => setTickets([])} className="text-xs text-red-400 hover:text-red-600">清空</button>
                        )}
                    </div>

                    {tickets.length === 0 ? (
                        <div
                            onClick={() => openEditor()}
                            className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-blue-400 hover:text-blue-500 transition-all bg-white"
                        >
                            <i className="fa-solid fa-plus-circle text-4xl mb-2 opacity-50"></i>
                            <span className="font-bold">点击添加第一张彩票</span>
                        </div>
                    ) : (
                        tickets.map((t) => {
                            const winInfo = ticketsWinInfo[t.id];
                            return (
                                <div key={t.id} className={`bg-white rounded-xl p-4 shadow-sm border relative group overflow-hidden ${winInfo?.isWin ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}>
                                    {t.isAdditional && (
                                        <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                                            追加
                                        </div>
                                    )}
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="flex flex-col">
                                            <div className="text-xs text-gray-400 font-mono mb-1">
                                                {t.reds.length}+{t.blues.length} {t.count > 1 ? '复式' : '单式'}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <div className="text-lg font-bold text-gray-800">
                                                    {t.count}注 <span className="text-gray-300 mx-1">|</span> ¥{t.price}
                                                </div>
                                                {/* Pre-Ticket Result */}
                                                {drawResult && winInfo && (
                                                    <div className={`text-sm font-bold flex items-center ${winInfo.isWin ? 'text-red-600' : 'text-gray-400 opacity-60'}`}>
                                                        {winInfo.isWin && <i className="fa-solid fa-gift mr-1 animate-bounce"></i>}
                                                        {winInfo.text}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button onClick={() => openEditor(t)} className="w-8 h-8 rounded-full bg-gray-50 text-blue-500 hover:bg-blue-50 flex items-center justify-center transition-colors">
                                                <i className="fa-solid fa-pen text-xs"></i>
                                            </button>
                                            <button onClick={() => deleteTicket(t.id)} className="w-8 h-8 rounded-full bg-gray-50 text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors">
                                                <i className="fa-solid fa-trash text-xs"></i>
                                            </button>
                                        </div>
                                    </div>
                                    {/* Balls Mini View - Bubbles */}
                                    <div className="flex flex-wrap gap-1.5 items-center">
                                        {t.reds.map(r => (
                                            <div key={'r' + r} className="w-6 h-6 rounded-full bg-red-50 text-red-600 border border-red-100 flex items-center justify-center text-xs font-bold font-mono shadow-sm">
                                                {r}
                                            </div>
                                        ))}
                                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                                        {t.blues.map(b => (
                                            <div key={'b' + b} className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center text-xs font-bold font-mono shadow-sm">
                                                {b}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Bottom Floating Bar */}
            <div className={`fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] p-4 safe-area-bottom transition-transform duration-300 z-40 ${isEditorOpen ? 'translate-y-full' : 'translate-y-0'}`}>
                <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <div className="text-xs text-gray-400">当前合计</div>
                        <div className="text-xl font-black text-gray-800">
                            {totalStat.count}注 <span className="text-red-600">¥{totalStat.price}</span>
                        </div>
                    </div>
                    <button
                        onClick={() => openEditor()}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-blue-200 active:scale-95 transition-all flex items-center gap-2"
                    >
                        <i className="fa-solid fa-plus"></i> 添加注单
                    </button>
                </div>
            </div>

            {/* --- EDITOR DRAWER / OVERLAY --- */}
            {isEditorOpen && (
                <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-full duration-300">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                        <button
                            onClick={() => setIsEditorOpen(false)}
                            className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center font-bold text-xl"
                        >
                            <i className="fa-solid fa-times"></i>
                        </button>
                        <div className="text-lg font-bold">
                            {editingId ? '修改注单' : '添加新注单'}
                        </div>
                        <button
                            onClick={() => {
                                setEditorReds(Array(35).fill(false));
                                setEditorBlues(Array(12).fill(false));
                            }}
                            className="text-sm text-blue-600 font-bold"
                        >
                            清空
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
                        {/* Reds */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-red-600 w-1.5 h-4 rounded-full"></div>
                                <span className="font-bold text-gray-800">前区 (至少选5个)</span>
                            </div>
                            <div className="grid grid-cols-7 gap-3 justify-items-center">
                                {Array.from({ length: 35 }, (_, i) => i + 1).map(n => (
                                    <button
                                        key={n}
                                        onClick={() => toggleRed(n - 1)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all ${editorReds[n - 1]
                                            ? 'bg-red-600 text-white shadow-md ring-2 ring-red-100 scale-105'
                                            : 'bg-gray-50 text-gray-500 border border-gray-200'
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Blues */}
                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="bg-blue-600 w-1.5 h-4 rounded-full"></div>
                                <span className="font-bold text-gray-800">后区 (至少选2个)</span>
                            </div>
                            <div className="grid grid-cols-6 gap-3 justify-items-center">
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(n => (
                                    <button
                                        key={n}
                                        onClick={() => toggleBlue(n - 1)}
                                        className={`w-10 h-10 rounded-full flex items-center justify-center text-base font-bold transition-all ${editorBlues[n - 1]
                                            ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-100 scale-105'
                                            : 'bg-gray-50 text-gray-500 border border-gray-200'
                                            }`}
                                    >
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Additional Toggle */}
                        <div
                            onClick={() => setEditorAdditional(!editorAdditional)}
                            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${editorAdditional
                                ? 'border-orange-500 bg-orange-50'
                                : 'border-gray-200 bg-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-5 h-5 rounded flex items-center justify-center border ${editorAdditional ? 'bg-orange-500 border-orange-500 text-white' : 'border-gray-300 bg-white'
                                    }`}>
                                    {editorAdditional && <i className="fa-solid fa-check text-xs"></i>}
                                </div>
                                <div className="flex flex-col">
                                    <span className={`font-bold ${editorAdditional ? 'text-orange-700' : 'text-gray-700'}`}>追加投注</span>
                                    <span className="text-xs text-gray-400">单注奖金增加，每注多1元</span>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Drawer Footer */}
                    <div className="bg-white border-t border-gray-200 p-4 safe-area-bottom">
                        <div className="flex items-center justify-between mb-2">
                            <div className="text-sm text-gray-500">
                                已选 <span className="text-red-600 font-bold">{editorReds.filter(Boolean).length}</span> + <span className="text-blue-600 font-bold">{editorBlues.filter(Boolean).length}</span>
                            </div>
                            <div className="text-sm font-bold">
                                {(() => {
                                    const rc = editorReds.filter(Boolean).length;
                                    const bc = editorBlues.filter(Boolean).length;
                                    const c = (rc >= 5 && bc >= 2) ? combination(rc, 5) * combination(bc, 2) : 0;
                                    return `${c}注 ${c * (editorAdditional ? 3 : 2)}元`;
                                })()}
                            </div>
                        </div>
                        <button
                            onClick={saveTicket}
                            className="w-full py-3.5 bg-gray-900 text-white rounded-xl font-bold text-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                        >
                            <i className="fa-solid fa-check"></i> 确认{editingId ? '修改' : '添加'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
