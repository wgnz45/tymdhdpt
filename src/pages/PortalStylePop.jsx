import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, Zap, Ticket, ArrowUpRight, Megaphone, Flame } from 'lucide-react';

const MOCK_STORE = {
    name: '街角好运体彩站',
    marquees: ['李哥刚刚刮出大奖啦！', '今晚大乐透开奖，别忘了买！']
};
const MOCK_CAROUSEL = [{ id: 1, url: 'https://images.unsplash.com/photo-1540747913346-19e32fc3e6ed?w=800&q=80', title: '周四周六大派发' }];
const MOCK_NEWS = [{ id: 101, title: '【火热爆出】头奖千万！', date: '03/10', views: 1250 }];
const MOCK_WINNERS = [
    { id: 201, playerName: '王先生', prize: '10,000元', time: '2小时前', img: 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=400&q=80', desc: '机选的神！' }
];

export default function PortalStylePop() {
    const { storeId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#FFE400] text-black font-sans pb-24 border-8 border-black">
            {/* Header */}
            <div className="bg-white border-b-8 border-black flex items-center justify-between p-4 sticky top-0 z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-[#FF0055] p-2 border-4 border-black box-shadow-brutal">
                        <Flame size={24} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black italic uppercase tracking-tighter leading-none">{MOCK_STORE.name}</h1>
                        <p className="text-xs font-bold font-mono">LUCKY STATION</p>
                    </div>
                </div>
            </div>

            <div className="p-4 space-y-6">
                {/* Marquee Banner */}
                <div className="bg-[#00D2FF] border-4 border-black p-3 box-shadow-brutal flex items-center gap-3">
                    <Megaphone size={20} className="text-black fill-current animate-pulse" />
                    <div className="font-bold whitespace-nowrap overflow-hidden w-full uppercase">
                        {MOCK_STORE.marquees.join(' /// ')}
                    </div>
                </div>

                {/* Main Hero */}
                <div className="bg-white border-4 border-black box-shadow-brutal overflow-hidden relative">
                    <div className="absolute top-4 left-4 z-10 bg-[#FF0055] text-white px-3 py-1 font-black transform -rotate-3 border-2 border-black">
                        HOT EVENT
                    </div>
                    <img src={MOCK_CAROUSEL[0].url} className="w-full h-48 object-cover grayscale contrast-125" />
                    <div className="p-4 bg-white border-t-4 border-black">
                        <h2 className="text-3xl font-black uppercase italic">{MOCK_CAROUSEL[0].title}</h2>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#FF94E0] border-4 border-black p-4 box-shadow-brutal flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <span className="font-black text-sm border-2 border-black px-2 py-0.5 bg-white">LUCKY NUM</span>
                            <Star size={24} className="fill-white" />
                        </div>
                        <div className="text-4xl font-black tracking-tighter">08,16</div>
                    </div>
                    <div className="bg-[#00FFA3] border-4 border-black p-4 box-shadow-brutal flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <span className="font-black text-sm border-2 border-black px-2 py-0.5 bg-white">ZODIAC</span>
                            <Zap size={24} className="fill-white" />
                        </div>
                        <div className="text-4xl font-black">龙</div>
                    </div>
                </div>

                {/* Big Action Buttons */}
                <div className="space-y-4 pt-4 border-t-8 border-black border-dashed">
                    <h3 className="font-black text-2xl uppercase italic">PLAY NOW ///</h3>

                    <button onClick={() => navigate(`/s/${storeId}/lotto`)} className="w-full bg-white border-4 border-black p-4 box-shadow-brutal flex justify-between items-center group active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#FF0055] text-white w-12 h-12 flex items-center justify-center border-2 border-black font-black text-xl transform group-hover:-rotate-12 transition-transform">
                                大
                            </div>
                            <div className="text-left">
                                <h4 className="font-black text-xl uppercase">超级大乐透</h4>
                                <p className="font-bold text-sm">MAGIC LOTTERY PICKER</p>
                            </div>
                        </div>
                        <ArrowUpRight size={32} />
                    </button>

                    <button onClick={() => navigate(`/s/${storeId}/scratch`)} className="w-full bg-white border-4 border-black p-4 box-shadow-brutal flex justify-between items-center group active:translate-x-1 active:translate-y-1 active:shadow-none transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-[#00D2FF] text-black w-12 h-12 flex items-center justify-center border-2 border-black font-black text-xl transform group-hover:rotate-12 transition-transform">
                                刮
                            </div>
                            <div className="text-left">
                                <h4 className="font-black text-xl uppercase">体彩顶呱刮</h4>
                                <p className="font-bold text-sm">SCRATCH THE CARDS</p>
                            </div>
                        </div>
                        <ArrowUpRight size={32} />
                    </button>
                </div>

                {/* Social Proof */}
                <div className="bg-white border-4 border-black p-4 box-shadow-brutal mt-8 relative">
                    <div className="absolute -top-4 -right-2 bg-[#FFE400] border-2 border-black font-black text-2xl px-4 py-1 transform rotate-6 z-10">
                        WINNERS!
                    </div>
                    {MOCK_WINNERS.map(w => (
                        <div key={w.id} className="flex gap-4 items-center">
                            <img src={w.img} className="w-16 h-16 border-2 border-black object-cover grayscale" />
                            <div>
                                <div className="font-black text-lg bg-black text-white px-2 inline-block mb-1">{w.playerName}</div>
                                <div className="font-bold text-[#FF0055]">{w.prize}</div>
                                <div className="text-xs font-bold opacity-50">{w.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <style>{`
                .box-shadow-brutal {
                    box-shadow: 6px 6px 0px #000;
                }
            `}</style>
        </div>
    );
}
