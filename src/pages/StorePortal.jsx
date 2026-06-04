import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    Calendar, Clock, Sparkles, TrendingUp, ChevronRight,
    Newspaper, Trophy, PlayCircle, MapPin, Volume2, LayoutTemplate
} from 'lucide-react';

// --- Mock Data ---
const MOCK_STORE = {
    name: '福州东街口体彩旗舰店 (测试中)',
    phone: '13800138000',
    address: '福建省福州市鼓楼区东街口88号',
    marquees: ['热烈祝贺本站彩民喜中大乐透二等奖！', '顶呱刮新票“十倍幸运”火热开售中！']
};

const MOCK_CAROUSEL = [
    { id: 1, type: 'image', url: 'https://images.unsplash.com/photo-1540747913346-19e32fc3e6ed?w=800&q=80', title: '体彩大乐透 10亿大派奖正在进行' },
    { id: 2, type: 'image', url: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=800&q=80', title: '恭贺本站喜爆顶呱刮头奖10万元' }
];

const MOCK_NEWS = [
    { id: 101, title: '【重要】体彩大乐透第26028期开奖公告：头奖爆出5注千万大奖', date: '2026-03-10', views: 1250 },
    { id: 102, title: '顶呱刮新票发布：中国龙震撼上市，最高奖金100万！', date: '2026-03-09', views: 892 },
    { id: 103, title: '体彩公益金：用爱心点亮希望，助力全民健身事业发展', date: '2026-03-08', views: 456 }
];

const MOCK_WINNERS = [
    { id: 201, text: '热烈祝贺3303131510站点喜中25269期排列五15注，共150万元', time: '2小时前', img: 'https://images.unsplash.com/photo-1621252179027-94459d278660?w=400&q=80', desc: '王大哥昨晚机选的号码，神准命中！' },
    { id: 202, text: '热烈庆祝4402026948店中出超级大乐透一等奖1注1000万元', time: '5小时前', img: 'https://images.unsplash.com/photo-1580508174046-170816f65662?w=400&q=80', desc: '下班顺手买了一本十倍幸运，直接刮出5000大奖！' },
    { id: 203, text: '恭喜本店喜中大乐透一等奖10注追加，奖金1.13亿元!', time: '昨天', img: 'https://images.unsplash.com/photo-1534643960519-11ad79bc19df?w=400&q=80', desc: '守号三年终于抱得大奖归。' }
];

const MOCK_LIVE_DRAWS = [
    { id: 1, name: '超级大乐透', issue: '第26028期', numbers: ['05', '07', '18', '21', '30', '03', '11'], pool: '1,059,233,450', highlight: true },
    { id: 2, name: '排列3', issue: '第26065期', numbers: ['8', '5', '3'], pool: '23,450', highlight: false },
    { id: 3, name: '排列5', issue: '第26065期', numbers: ['8', '5', '3', '0', '9'], pool: '390,000,000', highlight: false },
    { id: 4, name: '7星彩', issue: '第26027期', numbers: ['2', '8', '6', '1', '9', '4', '12'], pool: '23,400,000', highlight: false }
];

const ZODIAC_LIST = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];

export default function StorePortal() {
    const { storeId } = useParams();
    const navigate = useNavigate();

    // Time & Luck States
    const [currentTime, setCurrentTime] = useState(new Date());
    const [luckyInfo, setLuckyInfo] = useState({ zodiac: '龙', nums: '08, 16', game: '超级大乐透' });
    const [activeSlide, setActiveSlide] = useState(0);
    const [layout, setLayout] = useState('classic'); // 'classic', 'billboard', 'bento'
    const [showLayoutMenu, setShowLayoutMenu] = useState(false);
    const [storeData, setStoreData] = useState(null);

    const loadStoreData = async () => {
        try {
            const { data } = await axios.get('/api/system/sources');
            if (data.success) {
                setStoreData({ crawler: data.data });
            }
        } catch (e) {
            console.error('Error loading store data:', e);
        }
    };

    useEffect(() => {
        loadStoreData();

        // Clock
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);

        // Random daily luck (mocked based on day)
        const day = currentTime.getDate();
        setLuckyInfo({
            zodiac: ZODIAC_LIST[(day + 4) % 12],
            nums: `${(day % 30 + 1).toString().padStart(2, '0')}, ${((day * 3) % 35 + 1).toString().padStart(2, '0')}`,
            game: day % 2 === 0 ? '超级大乐透' : '体彩顶呱刮'
        });

        // Auto-refresh layout data silently
        const dataTimer = setInterval(() => loadStoreData(), 600000); // 10 minutes

        return () => {
            clearInterval(timer);
            clearInterval(dataTimer);
        };
    }, []);

    // Carousel auto-play
    useEffect(() => {
        const slideTimer = setInterval(() => {
            setActiveSlide(s => (s + 1) % MOCK_CAROUSEL.length);
        }, 4000);
        return () => clearInterval(slideTimer);
    }, []);

    const formatTime = (date) => {
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };

    const formatDate = (date) => {
        return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
    };

    // --- RENDER HELPERS ---

    const renderTimeWidget = () => (
        <div className="flex items-center gap-4 pr-6 md:border-r border-gray-200 w-full md:w-auto shrink-0">
            <div className="bg-red-50 p-3 rounded-2xl text-red-600">
                <Clock size={28} />
            </div>
            <div>
                <div className="text-2xl font-mono font-bold text-gray-800 tracking-wider">
                    {formatTime(currentTime)}
                </div>
                <div className="text-sm text-gray-500">{formatDate(currentTime)}</div>
            </div>
        </div>
    );

    const renderLuckWidget = () => (
        <div className="flex-1 flex flex-wrap gap-3 items-center w-full">
            <div className="flex items-center gap-2 bg-gradient-to-r from-orange-100 to-amber-50 px-4 py-2 rounded-xl text-amber-700">
                <Calendar size={18} />
                <span className="text-sm">今日吉肖: <span className="font-bold text-lg">{luckyInfo.zodiac}</span></span>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-red-100 to-red-50 px-4 py-2 rounded-xl text-red-700">
                <Sparkles size={18} />
                <span className="text-sm">幸运靓号: <span className="font-bold text-lg tracking-widest">{luckyInfo.nums}</span></span>
            </div>
            <div className="flex items-center gap-2 bg-gradient-to-r from-blue-100 to-cyan-50 px-4 py-2 rounded-xl text-blue-700">
                <TrendingUp size={18} />
                <span className="text-sm">主打推荐: <span className="font-bold">{luckyInfo.game}</span></span>
            </div>
        </div>
    );

    const renderCarousel = (aspectRatioStr) => {
        const slides = storeData?.crawler?.carousel || MOCK_CAROUSEL;
        return (
            <div className={`rounded-2xl overflow-hidden shadow-lg border-4 border-white relative ${aspectRatioStr} bg-gray-100`}>
                <div className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
                    style={{ transform: `translateX(-${activeSlide * 100}%)` }}>
                    {slides.map(slide => (
                        <div key={slide.id} className="min-w-full h-full relative" onClick={() => window.open(slide.href)}>
                            <img src={slide.url} alt={slide.title} className="w-full h-full object-cover cursor-pointer" />
                            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 pt-12 pointer-events-none">
                                <h3 className="text-white text-xl md:text-2xl font-bold">{slide.title}</h3>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="absolute bottom-4 right-6 flex gap-2 z-10 pointer-events-none">
                    {slides.map((_, i) => (
                        <div key={i} className={`h-2 rounded-full transition-all ${activeSlide === i ? 'w-6 bg-white' : 'w-2 bg-white/50'}`} />
                    ))}
                </div>
            </div>
        );
    };

    const renderNews = () => {
        const latestNews = storeData?.crawler?.industry || MOCK_NEWS;
        return (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-5 h-full flex flex-col">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2 text-red-600">
                        <Newspaper size={20} />
                        <h2 className="text-lg font-bold">体彩资讯</h2>
                    </div>
                </div>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                    {latestNews.map(news => (
                        <div key={news.id} onClick={() => window.open(news.url)} className="group cursor-pointer border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: news.tagBg, color: news.tagColor }}>{news.tag}</span>
                                <h4 className="text-gray-800 font-medium leading-normal group-hover:text-red-600 transition-colors line-clamp-1 flex-1">
                                    {news.title}
                                </h4>
                            </div>
                            <div className="flex justify-between items-center mt-1 text-[11px] text-gray-400">
                                <span>{news.date}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderWinners = () => (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl shadow-sm border border-red-100 p-5 relative overflow-hidden h-full flex flex-col">
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Trophy size={120} />
            </div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-red-200/50 relative z-10 shrink-0">
                <div className="flex items-center gap-2 text-red-600">
                    <Trophy size={20} />
                    <h2 className="text-lg font-bold">本站喜报</h2>
                </div>
            </div>
            <div className="space-y-4 relative z-10 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {MOCK_WINNERS.map(winner => (
                    <div key={winner.id} className="bg-white/80 p-3 rounded-xl flex items-center gap-3 shadow-sm hover:shadow-md transition-shadow">
                        <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 border border-gray-100">
                            <img src={winner.img} alt="中奖单" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-red-600 text-sm leading-tight pr-2 line-clamp-2">{winner.text}</span>
                            </div>
                            <p className="text-xs text-gray-500 truncate">{winner.desc}</p>
                            <p className="text-[10px] text-gray-400 mt-1">{winner.time}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    const renderLiveDraws = () => {
        const liveDraws = storeData?.crawler?.draws || MOCK_LIVE_DRAWS;
        return (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-gray-100 p-5 shrink-0 flex flex-col mb-4">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100 shrink-0">
                    <div className="flex items-center gap-2 text-purple-600">
                        <PlayCircle size={20} />
                        <h2 className="text-lg font-bold">最新开奖</h2>
                    </div>
                </div>
                <div className="space-y-3">
                    {liveDraws.map(draw => (
                        <div key={draw.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col hover:border-purple-200 transition-colors">
                            <div className="flex justify-between items-center mb-2">
                                <span className="font-bold text-gray-800">{draw.name}</span>
                                <span className="text-xs text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-100">{draw.issue}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5 mb-2">
                                {(draw.numbers || []).map((n, i) => {
                                    const isBlue = (draw.name === '超级大乐透' && i >= 5) || (draw.name === '7星彩' && i === 6);
                                    return (
                                        <div key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-[13px] font-black shadow-sm ${isBlue ? 'bg-blue-600 text-white' : 'bg-red-600 text-white'}`}>
                                            {n}
                                        </div>
                                    )
                                })}
                            </div>
                            <div className="text-xs text-gray-500">
                                奖池: <span className="font-bold text-red-500">￥{draw.pool}</span> {draw.highlight ? '🔥' : ''}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderGames = () => (
        <div className="flex flex-col h-full justify-center w-full">
            <h3 className="text-gray-500 text-sm font-bold mb-4 flex items-center gap-2 uppercase tracking-widest">
                <PlayCircle size={16} /> 互动选注辅助
            </h3>
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => navigate(`/s/${storeId}/lotto`)}
                    className="bg-white hover:bg-red-50 transition-colors p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-left group"
                >
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 group-hover:scale-110 transition-transform flex-shrink-0">
                        <div className="font-black text-xl">大</div>
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-gray-800 truncate">超级大乐透</h4>
                        <p className="text-xs text-gray-400 mt-1 truncate">智能机选组合</p>
                    </div>
                </button>

                <button
                    onClick={() => navigate(`/s/${storeId}/scratch`)}
                    className="bg-white hover:bg-orange-50 transition-colors p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 text-left group"
                >
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform flex-shrink-0">
                        <div className="font-black text-xl">刮</div>
                    </div>
                    <div className="min-w-0">
                        <h4 className="font-bold text-gray-800 truncate">体彩顶呱刮</h4>
                        <p className="text-xs text-gray-400 mt-1 truncate">抽幸运选票编号</p>
                    </div>
                </button>
            </div>
        </div>
    );

    // --- LAYOUT DEFINITIONS ---

    // Layout 1: Classic (Vertical flow, great for standard screens & portrait)
    const renderClassicLayout = () => (
        <div className="max-w-4xl mx-auto px-4 mt-6 space-y-6">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-red-50 p-4 flex flex-col md:flex-row items-center gap-6">
                {renderTimeWidget()}
                {renderLuckWidget()}
            </div>
            {renderCarousel('aspect-[21/9] md:aspect-[24/9]')}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-1">{renderNews()}</div>
                <div className="lg:col-span-1">{renderLiveDraws()}</div>
                <div className="lg:col-span-1">{renderWinners()}</div>
            </div>
            <div className="pt-4 border-t border-gray-200/50">
                {renderGames()}
            </div>
        </div>
    );

    // Layout 2: Billboard (Split screen, great for horizontal TVs)
    const renderBillboardLayout = () => (
        <div className="max-w-screen-2xl mx-auto px-4 mt-6 h-[calc(100vh-140px)] min-h-[600px]">
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 h-full">
                {/* Left Side: Huge Carousel */}
                <div className="xl:col-span-7 h-full flex flex-col">
                    {renderCarousel('h-full w-full flex-1')}
                </div>
                {/* Right Side: Data */}
                <div className="xl:col-span-5 h-full flex flex-col space-y-4">
                    <div className="bg-white/70 backdrop-blur-md rounded-2xl shadow-sm border border-red-50 p-4 shrink-0">
                        <div className="flex flex-col gap-4">
                            {renderTimeWidget()}
                            {renderLuckWidget()}
                        </div>
                    </div>
                    <div className="flex-1 min-h-0 flex flex-col overflow-y-auto pr-2 custom-scrollbar">
                        {renderLiveDraws()}
                        {renderWinners()}
                    </div>
                    <div className="shrink-0 bg-white/70 backdrop-blur-md rounded-2xl p-4 shadow-sm border border-gray-100">
                        {renderGames()}
                    </div>
                </div>
            </div>
        </div>
    );

    // Layout 3: Bento Grid (Modern dashboard tiles)
    const renderBentoLayout = () => (
        <div className="max-w-6xl mx-auto px-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 auto-rows-[200px]">
                {/* Top wide info */}
                <div className="md:col-span-3 lg:col-span-4 bg-white/70 backdrop-blur-md rounded-3xl shadow-sm border border-amber-50 p-6 flex flex-col md:flex-row items-center gap-6 row-span-1">
                    {renderTimeWidget()}
                    {renderLuckWidget()}
                </div>

                {/* Main visual */}
                <div className="md:col-span-2 lg:col-span-2 row-span-2">
                    {renderCarousel('h-full w-full')}
                </div>

                {/* News tall block */}
                <div className="md:col-span-1 lg:col-span-1 row-span-2 relative">
                    {renderNews()}
                </div>

                {/* Winners tall block */}
                <div className="md:col-span-3 lg:col-span-1 lg:row-start-2 lg:col-start-4 row-span-2 flex flex-col gap-4">
                    {renderLiveDraws()}
                    {renderWinners()}
                </div>

                {/* Games block wide */}
                <div className="md:col-span-3 lg:col-span-4 row-span-1">
                    <div className="bg-white/80 rounded-3xl p-6 h-full shadow-sm border border-gray-100 flex items-center justify-center">
                        <div className="w-full xl:w-1/2">{renderGames()}</div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#fef5f0] font-sans pb-24 text-gray-800 overflow-x-hidden">
            {/* Header & Marquee */}
            <div className="bg-gradient-to-r from-red-600 to-red-500 text-white shadow-md rounded-b-[2rem] relative z-20">
                <div className="max-w-screen-2xl mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-2">
                        <MapPin size={22} className="text-red-200" />
                        <h1 className="text-xl font-bold tracking-wider">{MOCK_STORE.name}</h1>
                    </div>
                    <div className="bg-white/10 px-5 py-2 rounded-full flex flex-1 w-full max-w-3xl items-center gap-3 text-sm justify-between backdrop-blur-sm">
                        <div className="flex items-center gap-2 overflow-hidden flex-1">
                            <Volume2 size={18} className="text-red-200 flex-shrink-0" />
                            <div className="overflow-hidden whitespace-nowrap w-full relative">
                                <span className="animate-marquee inline-block text-base">{MOCK_STORE.marquees.join(' 🌟 ')}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Switcher UI (Floating) */}
            <div className="fixed bottom-6 right-6 z-50">
                <div className={`absolute bottom-16 right-0 bg-white/90 backdrop-blur-md shadow-2xl rounded-2xl border border-gray-100 p-2 flex-col gap-2 transition-all ${showLayoutMenu ? 'flex opacity-100 translate-y-0' : 'hidden opacity-0 translate-y-4'}`}>
                    <div className="text-xs font-bold text-gray-400 p-2 pb-0">门户布局切换</div>
                    <button onClick={() => { setLayout('classic'); setShowLayoutMenu(false); }} className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${layout === 'classic' ? 'bg-red-50 text-red-600' : 'hover:bg-gray-50'}`}>
                        <div className="w-4 h-4 rounded border border-current opacity-50 flex flex-col gap-0.5 p-0.5"><div className="bg-current h-1/3 rounded-[1px]"></div><div className="bg-current h-2/3 rounded-[1px]"></div></div>
                        经典流式 (兼容性最优)
                    </button>
                    <button onClick={() => { setLayout('billboard'); setShowLayoutMenu(false); }} className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${layout === 'billboard' ? 'bg-red-50 text-red-600' : 'hover:bg-gray-50'}`}>
                        <div className="w-5 h-4 rounded border border-current opacity-50 flex gap-0.5 p-0.5"><div className="bg-current w-2/3 rounded-[1px]"></div><div className="bg-current w-1/3 rounded-[1px]"></div></div>
                        左右宣传板 (横向分屏)
                    </button>
                    <button onClick={() => { setLayout('bento'); setShowLayoutMenu(false); }} className={`flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${layout === 'bento' ? 'bg-red-50 text-red-600' : 'hover:bg-gray-50'}`}>
                        <div className="w-4 h-4 rounded border border-current opacity-50 grid grid-cols-2 gap-0.5 p-0.5"><div className="bg-current rounded-[1px]"></div><div className="bg-current rounded-[1px]"></div><div className="bg-current rounded-[1px]"></div><div className="bg-current rounded-[1px]"></div></div>
                        Bento网格 (电视大屏)
                    </button>
                </div>
                <button
                    onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                    className="w-14 h-14 bg-red-600 text-white rounded-full shadow-xl hover:bg-red-700 flex items-center justify-center transition-all hover:scale-105 active:scale-95"
                >
                    <LayoutTemplate size={24} />
                </button>
            </div>

            {/* Layout Rendering */}
            <div className="relative z-10 transition-all duration-500">
                {layout === 'classic' && renderClassicLayout()}
                {layout === 'billboard' && renderBillboardLayout()}
                {layout === 'bento' && renderBentoLayout()}
            </div>

            {/* Styles for marquee & scrollbar */}
            <style>{`
                @keyframes marquee {
                    0% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
                .animate-marquee {
                    animation: marquee 20s linear infinite;
                    padding-left: 100%;
                }
                .custom-scrollbar::-webkit-scrollbar {
                    width: 6px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent; 
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(252, 165, 165, 0.5); 
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(239, 68, 68, 0.8); 
                }
            `}</style>
        </div>
    );
}
