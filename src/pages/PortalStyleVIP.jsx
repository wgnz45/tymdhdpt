import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Calendar, Sparkles, TrendingUp, ChevronRight, Newspaper, Trophy, PlayCircle, MapPin, Volume2 } from 'lucide-react';

const MOCK_STORE = {
    name: '福州东街口VIP旗舰店',
    marquees: ['热烈祝贺本站彩民喜中大乐透二等奖！', '顶呱刮新票“十倍幸运”火热开售中！']
};
const MOCK_CAROUSEL = [{ id: 1, url: 'https://images.unsplash.com/photo-1540747913346-19e32fc3e6ed?w=800&q=80', title: '体彩大乐透 10亿大派奖正在进行' }];
const MOCK_NEWS = [{ id: 101, title: '【重要】体彩大乐透第26028期开奖公告：头奖爆出5注千万大奖', date: '2026-03-10', views: 1250 }];
const MOCK_WINNERS = [{ id: 201, playerName: '王先生', prize: '大乐透 10,000元', time: '2小时前', img: 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=400&q=80', desc: '王大哥昨晚机选的号码，神准命中！' }];

export default function PortalStyleVIP() {
    const { storeId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#110a0a] text-amber-50 font-sans pb-24 relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-red-950/80 to-transparent pointer-events-none z-0"></div>
            <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-red-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>

            <div className="relative z-10 max-w-md mx-auto sm:max-w-4xl px-4 pt-8 space-y-8">
                {/* Header */}
                <div className="flex justify-between items-center text-amber-200">
                    <div className="flex items-center gap-2">
                        <MapPin size={24} className="text-red-500" />
                        <h1 className="text-2xl font-serif italic tracking-widest font-bold bg-clip-text text-transparent bg-gradient-to-r from-amber-200 to-yellow-500">{MOCK_STORE.name}</h1>
                    </div>
                </div>

                {/* Hero / Marquee */}
                <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-3xl p-4 flex items-center gap-3 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                    <div className="bg-red-950 p-2 rounded-xl">
                        <Volume2 size={20} className="text-amber-400" />
                    </div>
                    <div className="overflow-hidden whitespace-nowrap w-full text-amber-100/80 text-sm">
                        <span>{MOCK_STORE.marquees[0]}</span>
                    </div>
                </div>

                {/* Grid Widgets */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gradient-to-b from-neutral-900 to-black border border-white/5 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 shadow-xl">
                        <Calendar className="text-red-500" size={28} />
                        <div className="text-xs text-neutral-400">今日生肖</div>
                        <div className="text-2xl font-bold text-amber-300">龙</div>
                    </div>
                    <div className="bg-gradient-to-b from-neutral-900 to-black border border-white/5 rounded-3xl p-5 flex flex-col items-center justify-center gap-2 shadow-xl">
                        <Sparkles className="text-amber-500" size={28} />
                        <div className="text-xs text-neutral-400">幸运数字</div>
                        <div className="text-2xl font-bold text-amber-300 font-mono tracking-widest">08, 16</div>
                    </div>
                </div>

                {/* Carousel */}
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative aspect-[21/9] bg-neutral-900 group cursor-pointer">
                    <img src={MOCK_CAROUSEL[0].url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-6 pt-16">
                        <h3 className="text-amber-50 text-xl font-bold tracking-wide">{MOCK_CAROUSEL[0].title}</h3>
                    </div>
                </div>

                {/* Winners */}
                <div>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-1 h-6 bg-red-500 rounded-full"></div>
                        <h2 className="text-xl font-bold text-amber-100 tracking-wider">喜报长廊</h2>
                    </div>
                    {MOCK_WINNERS.map(w => (
                        <div key={w.id} className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 flex gap-4 items-center mb-4">
                            <img src={w.img} className="w-16 h-16 rounded-xl object-cover border border-white/20" />
                            <div className="flex-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-amber-50">{w.playerName}</span>
                                    <span className="text-xs text-red-950 bg-gradient-to-r from-amber-400 to-yellow-600 px-3 py-1 rounded-full font-bold">{w.prize}</span>
                                </div>
                                <p className="text-sm text-neutral-400">{w.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Games */}
                <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => navigate(`/s/${storeId}/lotto`)} className="relative overflow-hidden bg-gradient-to-br from-red-900 to-red-950 border border-red-500/30 rounded-3xl p-6 text-left group hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <PlayCircle size={64} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1 relative z-10">超级大乐透</h3>
                        <p className="text-xs text-red-200/60 relative z-10">智能选号辅助</p>
                    </button>
                    <button onClick={() => navigate(`/s/${storeId}/scratch`)} className="relative overflow-hidden bg-gradient-to-br from-amber-700 to-amber-900 border border-amber-500/30 rounded-3xl p-6 text-left group hover:scale-[1.02] transition-transform">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Sparkles size={64} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-1 relative z-10">体彩顶呱刮</h3>
                        <p className="text-xs text-amber-200/60 relative z-10">在线抽幸运号</p>
                    </button>
                </div>
            </div>
        </div>
    );
}
