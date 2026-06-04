import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Globe, MapPin, Phone, Radio, Sparkles, Trophy, TrendingUp, Volume2, Zap } from 'lucide-react';
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

const HeroCarousel = ({ items }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(s => (s + 1) % items.length), 6000);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="relative w-full h-full overflow-hidden guochao-hero">
      {items.map((item, i) => (
        <div key={item.id} className="absolute inset-0 transition-opacity duration-700 ease-in-out" style={{ opacity: i === active ? 1 : 0 }}>
          <img src={item.url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${item.c1}cc 0%, ${item.c1}55 45%, ${item.c2}22 85%, transparent 100%)` }} />
          <div className="absolute left-6 bottom-6 text-white">
            <div className="text-[11px] font-black px-3 py-1 rounded-full inline-block mb-2 tracking-[0.3em]"
              style={{ background: 'rgba(0,0,0,0.35)', border: '1px solid rgba(255,255,255,0.45)' }}>
              {item.badge}
            </div>
            <div className="text-3xl font-black leading-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)] guochao-title">
              {item.title}
            </div>
            <div className="text-sm font-semibold text-white/85 mt-2">{item.sub}</div>
          </div>
        </div>
      ))}
      <div className="absolute bottom-4 right-5 flex gap-1.5">
        {items.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            style={{ width: i === active ? 18 : 6, height: 6, borderRadius: 6, background: i === active ? '#fff' : 'rgba(255,255,255,0.55)', transition: 'all 0.3s', border: 'none', padding: 0 }} />
        ))}
      </div>
    </div>
  );
};

const GuochaoCard = ({ title, icon, accent, children }) => (
  <div className="rounded-2xl p-4 guochao-card">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <div className="text-[13px] font-black text-[#3a2c23] guochao-title">{title}</div>
      <div className="ml-auto w-2 h-2 rounded-full" style={{ background: accent }} />
    </div>
    {children}
  </div>
);

const NewsColumn = ({ title, accent, icon, items }) => (
  <div className="rounded-2xl p-4 guochao-card">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <div className="text-[12px] font-black text-[#3a2c23] guochao-title">{title}</div>
      <div className="ml-auto w-2 h-2 rounded-full" style={{ background: accent }} />
    </div>
    <div className="space-y-2">
      {items.slice(0, 3).map(n => (
        <div key={n.id} className="flex items-start gap-2">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: n.tagColor, background: n.tagBg, border: '1px solid rgba(0,0,0,0.15)' }}>{n.tag}</span>
          <div className="text-[11px] text-[#5c4b3a] leading-tight line-clamp-2">{n.title}</div>
        </div>
      ))}
    </div>
  </div>
);

const QuickButton = ({ title, sub, onClick }) => (
  <button
    onClick={onClick}
    className="rounded-2xl px-4 py-3 text-left bg-[#3a2c23] text-white flex items-center gap-3 active:scale-95 transition-transform"
    style={{ boxShadow: '0 10px 24px rgba(58,44,35,0.3)' }}
  >
    <div>
      <div className="text-sm font-black">{title}</div>
      <div className="text-[10px] text-white/70">{sub}</div>
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
    <div className="relative w-full h-full overflow-hidden guochao-bg">
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="px-6 pt-4 pb-3 flex items-center justify-between border-b border-[#e8ddcf]">
          <div className="flex items-end gap-4">
            <div className="px-4 py-2 rounded-full guochao-seal">
              <span className="text-sm font-black text-white guochao-title">{MOCK_STORE.name}</span>
            </div>
            <div>
              <div className="text-[11px] text-[#8b6d52] tracking-[0.35em]">国潮门店 · 公益能量</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-[#3a2c23] guochao-title">{timeStr}</div>
            <div className="text-[10px] text-[#8b6d52]">{dateStr}</div>
          </div>
        </div>

        {/* Ticker */}
        <div className="px-6 py-2 border-b border-[#eadfce]">
          <div className="flex items-center gap-2 text-[11px] text-[#6f5a46] overflow-hidden">
            <Volume2 size={12} className="text-[#c1121f]" />
            <span style={{ display: 'inline-block', animation: 'marquee 22s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-6 py-4 grid grid-cols-12 grid-rows-12 gap-3">
          <div className="col-span-4 row-span-8 flex flex-col gap-3">
            <GuochaoCard title="今日好运" accent="#c1121f" icon={<Sparkles size={14} className="text-[#c1121f]" />}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #ffb703)` }}>
                  {fortune.zodiac}
                </div>
                <div>
                  <div className="text-[12px] font-black text-[#3a2c23]">{fortune.constellation}座</div>
                  <div className="text-[10px] text-[#8b6d52]">幸运色：{fortune.luckyColor}</div>
                </div>
              </div>
              <div className="text-[11px] text-[#5c4b3a] mt-2">{fortune.message}</div>
              <div className="flex gap-2 mt-3">
                {fortune.luckyBalls.slice(0, 5).map((ball, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: ball.c }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </GuochaoCard>

            <GuochaoCard title="公益进度" accent="#2a9d8f" icon={<Zap size={14} className="text-[#2a9d8f]" />}>
              <div className="space-y-2">
                {sources.welfare.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/70 border border-[#e8ddcf]">
                    <div className="text-[10px] text-[#6f5a46]">{item.title}</div>
                    <div className="text-[12px] font-black text-[#3a2c23]">
                      {item.value}<span className="text-[9px] text-[#8b6d52] ml-0.5">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GuochaoCard>
          </div>

          <div className="col-span-5 row-span-8">
            <HeroCarousel items={heroItems} />
          </div>

          <div className="col-span-3 row-span-8 flex flex-col gap-3">
            <GuochaoCard title="今日开奖" accent="#f94144" icon={<Radio size={13} className="text-[#f94144]" />}>
              <div className="space-y-2">
                {todayDraws.slice(0, 4).map(draw => (
                  <div key={draw.id} className="rounded-xl px-3 py-2 border border-[#eadfce] bg-white/80">
                    <div className="text-[11px] font-black text-[#3a2c23]">{draw.name}</div>
                    <div className="text-[9px] text-[#8b6d52]">{draw.time}</div>
                    <div className="mt-2 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${draw.colors?.[0] || '#c1121f'}, ${draw.colors?.[1] || '#ffb703'})` }} />
                  </div>
                ))}
                {todayDraws.length === 0 && <div className="text-[10px] text-[#8b6d52]">今日暂无直播开奖</div>}
              </div>
            </GuochaoCard>

            <GuochaoCard title="本店喜报" accent="#00b4d8" icon={<Trophy size={13} className="text-[#00b4d8]" />}>
              <div className="space-y-2">
                {MOCK_WINNERS.slice(0, 3).map(w => (
                  <div key={w.id} className="text-[11px] text-[#5c4b3a]">{w.text}</div>
                ))}
              </div>
            </GuochaoCard>
          </div>

          <div className="col-span-9 row-span-4 grid grid-cols-3 gap-3">
            <NewsColumn title="行业资讯" accent="#c1121f" icon={<Globe size={12} className="text-[#c1121f]" />} items={sources.industry} />
            <NewsColumn title="地方资讯" accent="#00b4d8" icon={<MapPin size={12} className="text-[#00b4d8]" />} items={sources.local} />
            <NewsColumn title="公益文化" accent="#2a9d8f" icon={<Sparkles size={12} className="text-[#2a9d8f]" />} items={sources.culture} />
          </div>

          <div className="col-span-3 row-span-4 flex flex-col gap-3">
            <GuochaoCard title="门店信息" accent="#3a2c23" icon={<MapPin size={12} className="text-[#3a2c23]" />}>
              <div className="text-[10px] text-[#5c4b3a]">{MOCK_STORE.address}</div>
              <div className="text-[10px] text-[#5c4b3a] mt-1">{MOCK_STORE.phone}</div>
            </GuochaoCard>
            <div className="grid grid-cols-1 gap-2">
              <QuickButton title="超级大乐透" sub="活力选号" onClick={() => navigate(`/s/${storeId}/lotto`)} />
              <QuickButton title="体彩顶呱刮" sub="幸运即刻" onClick={() => navigate(`/s/${storeId}/scratch`)} />
            </div>
          </div>
        </div>

        <div className="pb-2 text-center text-[10px] text-[#8b6d52] tracking-widest">
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
    <div className="relative w-full h-full overflow-hidden guochao-bg">
      <div className="relative z-10 flex flex-col h-full">
        <div className="px-5 pt-4 pb-3 border-b border-[#e8ddcf]">
          <div className="flex items-center justify-between">
            <div className="px-3 py-1 rounded-full guochao-seal">
              <span className="text-sm font-black text-white guochao-title">{MOCK_STORE.name}</span>
            </div>
            <div className="text-right">
              <div className="text-[14px] font-black text-[#3a2c23] guochao-title">{timeStr}</div>
              <div className="text-[10px] text-[#8b6d52]">{dateStr}</div>
            </div>
          </div>
          <div className="text-[10px] text-[#8b6d52] tracking-[0.3em] mt-2">国潮门店 · 公益能量</div>
        </div>

        <div className="px-5 py-2 border-b border-[#eadfce]">
          <div className="flex items-center gap-2 text-[10px] text-[#6f5a46] overflow-hidden">
            <Volume2 size={11} className="text-[#c1121f]" />
            <span style={{ display: 'inline-block', animation: 'marquee 20s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
        </div>

        <div className="px-5 flex-1 min-h-0 flex flex-col gap-3 py-3">
          <div className="rounded-3xl overflow-hidden shadow-[0_16px_35px_rgba(0,0,0,0.12)]" style={{ height: '26%' }}>
            <HeroCarousel items={heroItems} />
          </div>

          <GuochaoCard title="今日好运" accent="#c1121f" icon={<Sparkles size={12} className="text-[#c1121f]" />}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black text-white"
                style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #ffb703)` }}>
                {fortune.zodiac}
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-black text-[#3a2c23]">{fortune.constellation}座</div>
                <div className="text-[10px] text-[#8b6d52]">幸运色：{fortune.luckyColor}</div>
              </div>
              <div className="flex gap-1.5">
                {fortune.luckyBalls.slice(0, 3).map((ball, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: ball.c }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-[#5c4b3a] mt-2">{fortune.message}</div>
          </GuochaoCard>

          <GuochaoCard title="今日开奖" accent="#f94144" icon={<Radio size={12} className="text-[#f94144]" />}>
            <div className="space-y-2">
              {todayDraws.slice(0, 3).map(draw => (
                <div key={draw.id} className="rounded-xl px-3 py-2 border border-[#eadfce] bg-white/80">
                  <div className="text-[11px] font-black text-[#3a2c23]">{draw.name}</div>
                  <div className="text-[9px] text-[#8b6d52]">{draw.time}</div>
                  <div className="mt-2 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${draw.colors?.[0] || '#c1121f'}, ${draw.colors?.[1] || '#ffb703'})` }} />
                </div>
              ))}
              {todayDraws.length === 0 && <div className="text-[10px] text-[#8b6d52]">今日暂无直播开奖</div>}
            </div>
          </GuochaoCard>

          <GuochaoCard title="本店喜报" accent="#00b4d8" icon={<Trophy size={12} className="text-[#00b4d8]" />}>
            <div className="space-y-2">
              {MOCK_WINNERS.slice(0, 3).map(w => (
                <div key={w.id} className="text-[10px] text-[#5c4b3a]">{w.text}</div>
              ))}
            </div>
          </GuochaoCard>

          <NewsColumn title="行业资讯" accent="#c1121f" icon={<Globe size={11} className="text-[#c1121f]" />} items={sources.industry} />
          <NewsColumn title="地方资讯" accent="#00b4d8" icon={<MapPin size={11} className="text-[#00b4d8]" />} items={sources.local} />
          <NewsColumn title="公益文化" accent="#2a9d8f" icon={<Sparkles size={11} className="text-[#2a9d8f]" />} items={sources.culture} />

          <GuochaoCard title="公益进度" accent="#2a9d8f" icon={<Zap size={12} className="text-[#2a9d8f]" />}>
            <div className="space-y-2">
              {sources.welfare.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-white/70 border border-[#e8ddcf]">
                  <div className="text-[10px] text-[#6f5a46]">{item.title}</div>
                  <div className="text-[12px] font-black text-[#3a2c23]">
                    {item.value}<span className="text-[9px] text-[#8b6d52] ml-0.5">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </GuochaoCard>

          <GuochaoCard title="门店信息" accent="#3a2c23" icon={<MapPin size={12} className="text-[#3a2c23]" />}>
            <div className="text-[10px] text-[#5c4b3a]">{MOCK_STORE.address}</div>
            <div className="text-[10px] text-[#5c4b3a] mt-1">{MOCK_STORE.phone}</div>
          </GuochaoCard>

          <div className="grid grid-cols-2 gap-3">
            <QuickButton title="超级大乐透" sub="活力选号" onClick={() => navigate(`/s/${storeId}/lotto`)} />
            <QuickButton title="体彩顶呱刮" sub="幸运即刻" onClick={() => navigate(`/s/${storeId}/scratch`)} />
          </div>
        </div>

        <div className="pb-2 text-center text-[9px] text-[#8b6d52] tracking-widest">
          理性购彩 · 适度娱乐 · 未成年人禁止购彩
        </div>
      </div>
    </div>
  );
};

export default function PortalStyleSportsGuochao() {
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
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f4efe6', fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div style={{ width: boxW, height: boxH, overflow: 'hidden', borderRadius: 18, boxShadow: '0 22px 80px rgba(0,0,0,0.22)' }}>
        {isLandscape ? <LandscapeLayout {...props} /> : <PortraitLayout {...props} />}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;800&family=ZCOOL+XiaoWei&family=Ma+Shan+Zheng&display=swap');
        .guochao-title { font-family: 'ZCOOL XiaoWei', serif; }
        .guochao-bg {
          background:
            linear-gradient(180deg, rgba(255,255,255,0.8), rgba(255,255,255,0.8)),
            repeating-linear-gradient(90deg, rgba(0,0,0,0.035) 0, rgba(0,0,0,0.035) 1px, transparent 1px, transparent 70px),
            repeating-linear-gradient(180deg, rgba(0,0,0,0.035) 0, rgba(0,0,0,0.035) 1px, transparent 1px, transparent 70px);
        }
        .guochao-card {
          background: rgba(255,255,255,0.85);
          border: 1px solid #eadfce;
          box-shadow: 0 10px 22px rgba(100,80,60,0.12);
        }
        .guochao-seal {
          background: #c1121f;
          box-shadow: 0 6px 14px rgba(193,18,31,0.35);
        }
        .guochao-hero {
          border-radius: 22px;
          box-shadow: 0 14px 28px rgba(60,45,30,0.2);
        }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}
