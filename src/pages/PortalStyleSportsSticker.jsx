import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Globe, MapPin, Phone, Radio, Sparkles, Trophy, Volume2, Zap } from 'lucide-react';
import {
  MOCK_CAROUSEL,
  MOCK_CULTURE_NEWS,
  MOCK_INDUSTRY_NEWS,
  MOCK_LIVE_DRAWS,
  MOCK_LOCAL_NEWS,
  MOCK_STORE,
  MOCK_WELFARE,
  MOCK_WINNERS,
  getDailyFortune,
  useFitBox,
} from './portalSportsShared';

const StickerCarousel = ({ items }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(s => (s + 1) % items.length), 5500);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="relative w-full h-full overflow-hidden sticker-card sticker-tilt">
      {items.map((item, i) => (
        <div key={item.id} className="absolute inset-0 transition-opacity duration-700 ease-in-out" style={{ opacity: i === active ? 1 : 0 }}>
          <img src={item.url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${item.c1}cc 0%, ${item.c1}66 45%, ${item.c2}33 80%, transparent 100%)` }} />
          <div className="absolute left-5 bottom-5 text-white">
            <div className="text-[11px] font-black px-3 py-1 rounded-full inline-block mb-2 tracking-[0.3em]"
              style={{ background: 'rgba(0,0,0,0.45)', border: '2px solid #fff' }}>
              {item.badge}
            </div>
            <div className="text-3xl font-black leading-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)] sticker-head">
              {item.title}
            </div>
            <div className="text-sm font-semibold text-white/85 mt-2">{item.sub}</div>
          </div>
        </div>
      ))}
      <div className="absolute top-4 right-4 flex gap-1.5 z-10">
        {items.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            style={{ width: i === active ? 18 : 7, height: 7, borderRadius: 6, background: i === active ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s', border: '1px solid #111', padding: 0 }} />
        ))}
      </div>
    </div>
  );
};

const StickerCard = ({ title, icon, accent, children, className = '' }) => (
  <div className={`sticker-card ${className}`} style={{ borderColor: accent }}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <div className="text-[12px] font-black text-gray-900 sticker-head">{title}</div>
      <div className="ml-auto w-2.5 h-2.5 rounded-full" style={{ background: accent }} />
    </div>
    {children}
  </div>
);

const NewsSticker = ({ title, icon, accent, items }) => (
  <div className="sticker-card sticker-tilt-alt" style={{ borderColor: accent }}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <div className="text-[12px] font-black text-gray-900 sticker-head">{title}</div>
    </div>
    <div className="space-y-2">
      {items.slice(0, 3).map(n => (
        <div key={n.id} className="flex items-start gap-2">
          <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ color: n.tagColor, background: n.tagBg, border: '1px solid #111' }}>{n.tag}</span>
          <div className="text-[11px] text-gray-700 leading-tight line-clamp-2">{n.title}</div>
        </div>
      ))}
    </div>
  </div>
);

const StickerButton = ({ title, sub, colorFrom, colorTo, onClick }) => (
  <button
    onClick={onClick}
    className="sticker-card sticker-btn"
    style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})`, color: '#111', borderColor: '#111' }}
  >
    <div>
      <div className="text-sm font-black sticker-head">{title}</div>
      <div className="text-[10px] font-bold">{sub}</div>
    </div>
    <ArrowRight size={16} className="ml-auto" />
  </button>
);

const LandscapeLayout = ({ storeId, navigate, fortune, timeStr, dateStr, sources }) => {
  const today = new Date().getDay();
  const heroItems = sources.carousel || MOCK_CAROUSEL;
  const allDraws = [...(sources.draws || []), ...(sources.fujianDraws || [])];
  const todayDraws = allDraws.filter(d => d.days && d.days.includes(today));

  return (
    <div className="relative w-full h-full overflow-hidden sticker-bg">
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
        <div className="px-4 py-2 rounded-full sticker-label">
              <span className="text-sm font-black sticker-head">{MOCK_STORE.name}</span>
            </div>
            <div className="text-[11px] font-bold text-gray-700">SPORTS LOTTERY · 潮流拼贴</div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-gray-900 sticker-head">{timeStr}</div>
            <div className="text-[10px] text-gray-600">{dateStr}</div>
          </div>
        </div>

        {/* Ticker */}
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2 text-[11px] font-bold text-gray-800 overflow-hidden sticker-banner">
            <Volume2 size={12} className="text-[#111]" />
            <span className="whitespace-nowrap" style={{ display: 'inline-block', animation: 'marquee 18s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-5 pb-4 grid grid-cols-12 grid-rows-12 gap-3">
          {/* Left rail */}
          <div className="col-span-3 row-span-8 flex flex-col gap-3">
            <StickerCard title="今日好运" accent="#FF6A00" icon={<Sparkles size={13} className="text-[#FF6A00]" />}>
              <div className="flex items-center gap-2">
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #FFB703)`, border: '1px solid #111' }}>
                  {fortune.zodiac}
                </div>
                <div>
                  <div className="text-[12px] font-black text-gray-900">{fortune.constellation}座</div>
                  <div className="text-[10px] text-gray-600">幸运色：{fortune.luckyColor}</div>
                </div>
              </div>
              <div className="text-[10px] text-gray-700 mt-2">{fortune.message}</div>
              <div className="flex gap-2 mt-2">
                {fortune.luckyBalls.slice(0, 5).map((ball, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: ball.c, border: '1px solid #111' }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </StickerCard>

            <StickerCard title="公益进度" accent="#2A9D8F" icon={<Zap size={13} className="text-[#2A9D8F]" />}>
              <div className="space-y-2">
                {sources.welfare.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/80 border border-[#111]">
                    <div className="text-[10px] text-gray-700">{item.title}</div>
                    <div className="text-[12px] font-black text-gray-900">
                      {item.value}<span className="text-[9px] text-gray-500 ml-0.5">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </StickerCard>
          </div>

          {/* Hero */}
          <div className="col-span-6 row-span-8">
            <StickerCarousel items={heroItems} />
          </div>

          {/* Right rail */}
          <div className="col-span-3 row-span-8 flex flex-col gap-3">
            <StickerCard title="今日开奖" accent="#F94144" icon={<Radio size={13} className="text-[#F94144]" />}>
              <div className="space-y-2">
                {todayDraws.slice(0, 4).map(draw => (
                  <div key={draw.id} className="rounded-xl px-3 py-2 border border-[#111] bg-white/85">
                    <div className="text-[11px] font-black text-gray-900">{draw.name}</div>
                    <div className="text-[9px] text-gray-600">{draw.time}</div>
                    <div className="mt-2 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${draw.colors?.[0] || '#FF6A00'}, ${draw.colors?.[1] || '#FFB703'})` }} />
                  </div>
                ))}
                {todayDraws.length === 0 && <div className="text-[10px] text-gray-600">今日暂无直播开奖</div>}
              </div>
            </StickerCard>

            <StickerCard title="本店喜报" accent="#00B4D8" icon={<Trophy size={13} className="text-[#00B4D8]" />}>
              <div className="space-y-2">
                {MOCK_WINNERS.slice(0, 3).map(w => (
                  <div key={w.id} className="rounded-xl px-3 py-2 bg-white/85 border border-[#111]">
                    <div className="text-[10px] text-gray-800">{w.text}</div>
                  </div>
                ))}
              </div>
            </StickerCard>
          </div>

          {/* Bottom collage */}
          <div className="col-span-8 row-span-4 grid grid-cols-3 gap-3">
            <NewsSticker title="行业资讯" accent="#FF6A00" icon={<Globe size={12} className="text-[#FF6A00]" />} items={sources.industry} />
            <NewsSticker title="地方资讯" accent="#00B4D8" icon={<MapPin size={12} className="text-[#00B4D8]" />} items={sources.local} />
            <NewsSticker title="公益文化" accent="#2A9D8F" icon={<Sparkles size={12} className="text-[#2A9D8F]" />} items={sources.culture} />
          </div>

          <div className="col-span-4 row-span-4 flex flex-col gap-3">
            <StickerCard title="门店信息" accent="#111827" icon={<MapPin size={12} className="text-[#111827]" />}>
              <div className="text-[10px] text-gray-700">{MOCK_STORE.address}</div>
              <div className="text-[10px] text-gray-700 mt-1">{MOCK_STORE.phone}</div>
            </StickerCard>
            <StickerButton
              title="超级大乐透"
              sub="活力选号"
              colorFrom="#FF6A00"
              colorTo="#FFB703"
              onClick={() => navigate(`/s/${storeId}/lotto`)}
            />
            <StickerButton
              title="体彩顶呱刮"
              sub="幸运即刻"
              colorFrom="#00B4D8"
              colorTo="#00F5D4"
              onClick={() => navigate(`/s/${storeId}/scratch`)}
            />
          </div>
        </div>

        <div className="pb-2 text-center text-[10px] text-gray-700 tracking-widest">
          理性购彩 · 适度娱乐 · 未成年人禁止购彩
        </div>
      </div>
    </div>
  );
};

const PortraitLayout = ({ storeId, navigate, fortune, timeStr, dateStr, sources }) => {
  const today = new Date().getDay();
  const heroItems = sources.carousel || MOCK_CAROUSEL;
  const allDraws = [...(sources.draws || []), ...(sources.fujianDraws || [])];
  const todayDraws = allDraws.filter(d => d.days && d.days.includes(today));

  return (
    <div className="relative w-full h-full overflow-hidden sticker-bg">
      <div className="relative z-10 flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="px-3 py-1 rounded-full sticker-label">
            <span className="text-sm font-black sticker-head">{MOCK_STORE.name}</span>
          </div>
          <div className="text-right">
            <div className="text-base font-black text-gray-900 sticker-head">{timeStr}</div>
            <div className="text-[10px] text-gray-600">{dateStr}</div>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-800 overflow-hidden sticker-banner">
            <Volume2 size={11} className="text-[#111]" />
            <span className="whitespace-nowrap" style={{ display: 'inline-block', animation: 'marquee 16s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
        </div>

        <div className="px-4 flex-1 min-h-0 flex flex-col gap-3 pb-3">
          <div className="rounded-[26px] overflow-hidden" style={{ height: '28%' }}>
            <StickerCarousel items={heroItems} />
          </div>

          <StickerCard title="今日好运" accent="#FF6A00" icon={<Sparkles size={12} className="text-[#FF6A00]" />}>
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black text-white"
                style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #FFB703)`, border: '1px solid #111' }}>
                {fortune.zodiac}
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-black text-gray-900">{fortune.constellation}座</div>
                <div className="text-[10px] text-gray-600">幸运色：{fortune.luckyColor}</div>
              </div>
              <div className="flex gap-1.5">
                {fortune.luckyBalls.slice(0, 3).map((ball, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: ball.c, border: '1px solid #111' }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-gray-700 mt-2">{fortune.message}</div>
          </StickerCard>

          <StickerCard title="今日开奖" accent="#F94144" icon={<Radio size={12} className="text-[#F94144]" />}>
            <div className="space-y-2">
              {todayDraws.slice(0, 3).map(draw => (
                <div key={draw.id} className="rounded-xl px-3 py-2 border border-[#111] bg-white/85">
                  <div className="text-[11px] font-black text-gray-900">{draw.name}</div>
                  <div className="text-[9px] text-gray-600">{draw.time}</div>
                  <div className="mt-2 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${draw.colors?.[0] || '#FF6A00'}, ${draw.colors?.[1] || '#FFB703'})` }} />
                </div>
              ))}
              {todayDraws.length === 0 && <div className="text-[10px] text-gray-600">今日暂无直播开奖</div>}
            </div>
          </StickerCard>

          <StickerCard title="本店喜报" accent="#00B4D8" icon={<Trophy size={12} className="text-[#00B4D8]" />}>
            <div className="space-y-2">
              {MOCK_WINNERS.slice(0, 3).map(w => (
                <div key={w.id} className="rounded-xl px-3 py-2 bg-white/85 border border-[#111]">
                  <div className="text-[10px] text-gray-800">{w.text}</div>
                </div>
              ))}
            </div>
          </StickerCard>

          <NewsSticker title="行业资讯" accent="#FF6A00" icon={<Globe size={11} className="text-[#FF6A00]" />} items={sources.industry} />
          <NewsSticker title="地方资讯" accent="#00B4D8" icon={<MapPin size={11} className="text-[#00B4D8]" />} items={sources.local} />
          <NewsSticker title="公益文化" accent="#2A9D8F" icon={<Sparkles size={11} className="text-[#2A9D8F]" />} items={sources.culture} />

          <StickerCard title="门店信息" accent="#111827" icon={<MapPin size={11} className="text-[#111827]" />}>
            <div className="text-[10px] text-gray-700">{MOCK_STORE.address}</div>
              <div className="text-[10px] text-gray-700 mt-1">{MOCK_STORE.phone}</div>
          </StickerCard>

          <div className="grid grid-cols-2 gap-3">
            <StickerButton
              title="超级大乐透"
              sub="活力选号"
              colorFrom="#FF6A00"
              colorTo="#FFB703"
              onClick={() => navigate(`/s/${storeId}/lotto`)}
            />
            <StickerButton
              title="体彩顶呱刮"
              sub="幸运即刻"
              colorFrom="#00B4D8"
              colorTo="#00F5D4"
              onClick={() => navigate(`/s/${storeId}/scratch`)}
            />
          </div>

          <StickerCard title="公益进度" accent="#2A9D8F" icon={<Zap size={12} className="text-[#2A9D8F]" />}>
            <div className="space-y-2">
              {sources.welfare.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/80 border border-[#111]">
                  <div className="text-[10px] text-gray-700">{item.title}</div>
                  <div className="text-[12px] font-black text-gray-900">
                    {item.value}<span className="text-[9px] text-gray-500 ml-0.5">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </StickerCard>
        </div>

        <div className="pb-2 text-center text-[9px] text-gray-700 tracking-widest">
          理性购彩 · 适度娱乐 · 未成年人禁止购彩
        </div>
      </div>
    </div>
  );
};

export default function PortalStyleSportsSticker() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [sourcesData, setSourcesData] = useState(null);
  const { boxW, boxH, isLandscape } = useFitBox();

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    fetch('/api/system/sources')
      .then(r => r.json())
      .then(res => {
        const payload = res?.data || res;
        if (payload && (payload.industry || payload.local || payload.culture || payload.draws || payload.welfare)) {
          setSourcesData(payload);
        }
      })
      .catch(() => { });
    return () => clearInterval(t);
  }, []);

  const fortune = useMemo(() => getDailyFortune(currentTime), [currentTime]);
  const timeStr = currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });

  const sources = {
    industry: sourcesData?.industry || MOCK_INDUSTRY_NEWS,
    local: sourcesData?.local || MOCK_LOCAL_NEWS,
    culture: sourcesData?.culture || MOCK_CULTURE_NEWS,
    welfare: sourcesData?.welfare || MOCK_WELFARE,
    carousel: sourcesData?.carousel || MOCK_CAROUSEL,
    draws: sourcesData?.draws || MOCK_LIVE_DRAWS,
    fujianDraws: sourcesData?.fujianDraws || [],
  };

  const props = { storeId, navigate, fortune, timeStr, dateStr, sources };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5', fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div style={{ width: boxW, height: boxH, overflow: 'hidden', borderRadius: 18, boxShadow: '0 22px 80px rgba(0,0,0,0.22)' }}>
        {isLandscape ? <LandscapeLayout {...props} /> : <PortraitLayout {...props} />}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;800&family=Bebas+Neue&display=swap');
        .sticker-head { font-family: 'Bebas Neue', sans-serif; letter-spacing: 0.03em; }
        .sticker-bg {
          background:
            radial-gradient(circle at 18% 18%, rgba(255,214,102,0.22), transparent 45%),
            radial-gradient(circle at 82% 12%, rgba(0,180,216,0.22), transparent 45%),
            radial-gradient(circle at 20% 80%, rgba(255,99,72,0.18), transparent 45%),
            radial-gradient(circle at 80% 80%, rgba(0,245,212,0.18), transparent 45%),
            #fff9ef;
        }
        .sticker-card {
          background: #fff;
          border: 2px solid #111;
          border-radius: 18px;
          padding: 12px;
          box-shadow: 0 12px 22px rgba(17,17,17,0.12);
        }
        .sticker-tilt { transform: rotate(-0.4deg); }
        .sticker-tilt-alt { transform: rotate(0.4deg); }
        .sticker-label {
          background: #fff;
          border: 2px solid #111;
          box-shadow: 0 6px 14px rgba(17,17,17,0.12);
        }
        .sticker-banner {
          background: linear-gradient(90deg, #ffe08a, #bff3ff);
          border: 2px solid #111;
          border-radius: 14px;
          padding: 4px 10px;
          box-shadow: 0 6px 14px rgba(17,17,17,0.12);
          line-height: 1;
        }
        .sticker-btn {
          border: 2px solid #111;
          box-shadow: 0 10px 20px rgba(17,17,17,0.14);
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}
