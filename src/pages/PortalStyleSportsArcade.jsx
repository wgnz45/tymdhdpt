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

const PixelCarousel = ({ items }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(s => (s + 1) % items.length), 5500);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="relative w-full h-full overflow-hidden pixel-frame">
      {items.map((item, i) => (
        <div key={item.id} className="absolute inset-0 transition-opacity duration-700 ease-in-out" style={{ opacity: i === active ? 1 : 0 }}>
          <img src={item.url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${item.c1}cc 0%, ${item.c1}55 45%, ${item.c2}22 85%, transparent 100%)` }} />
          <div className="absolute left-5 bottom-5 text-white">
            <div className="text-[10px] font-black px-3 py-1 inline-block mb-2 pixel-tag">
              {item.badge}
            </div>
            <div className="text-2xl font-black leading-tight drop-shadow-[0_8px_20px_rgba(0,0,0,0.35)] pixel-head">
              {item.title}
            </div>
            <div className="text-[11px] font-semibold text-white/80 mt-2">{item.sub}</div>
          </div>
        </div>
      ))}
      <div className="absolute top-4 right-4 flex gap-1.5">
        {items.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            style={{ width: i === active ? 18 : 6, height: 6, borderRadius: 2, background: i === active ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s', border: '2px solid #0a0a0a', padding: 0 }} />
        ))}
      </div>
    </div>
  );
};

const PixelCard = ({ title, icon, accent, children }) => (
  <div className="pixel-card" style={{ borderColor: accent }}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <div className="text-[11px] font-black text-[#e2e8f0] pixel-head">{title}</div>
      <div className="ml-auto w-2 h-2" style={{ background: accent }} />
    </div>
    {children}
  </div>
);

const PixelNews = ({ title, icon, accent, items }) => (
  <div className="pixel-card" style={{ borderColor: accent }}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <div className="text-[11px] font-black text-[#e2e8f0] pixel-head">{title}</div>
    </div>
    <div className="space-y-2">
      {items.slice(0, 3).map(n => (
        <div key={n.id} className="flex items-start gap-2">
          <span className="text-[9px] font-black px-2 py-0.5 pixel-tag" style={{ color: n.tagColor, background: n.tagBg }}>{n.tag}</span>
          <div className="text-[10px] text-[#cbd5f5] leading-tight line-clamp-2">{n.title}</div>
        </div>
      ))}
    </div>
  </div>
);

const PixelButton = ({ title, sub, colorFrom, colorTo, onClick }) => (
  <button
    onClick={onClick}
    className="pixel-card pixel-btn"
    style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})`, borderColor: '#0a0a0a', color: '#0a0a0a' }}
  >
    <div>
      <div className="text-[11px] font-black pixel-head">{title}</div>
      <div className="text-[9px] font-bold">{sub}</div>
    </div>
    <ArrowRight size={14} className="ml-auto" />
  </button>
);

const LandscapeLayout = ({ storeId, navigate, fortune, timeStr, dateStr, sources }) => {
  const today = new Date().getDay();
  const heroItems = sources.carousel || MOCK_CAROUSEL;
  const allDraws = [...(sources.draws || []), ...(sources.fujianDraws || [])];
  const todayDraws = allDraws.filter(d => d.days && d.days.includes(today));

  return (
    <div className="relative w-full h-full overflow-hidden arcade-bg">
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 pixel-badge">
              <span className="text-[12px] font-black text-[#0a0a0a] pixel-head">{MOCK_STORE.name}</span>
            </div>
            <div className="text-[10px] font-bold text-[#9ad7ff] pixel-head">ARCADE MODE</div>
          </div>
          <div className="text-right">
            <div className="text-[14px] font-black text-[#e2e8f0] pixel-head">{timeStr}</div>
            <div className="text-[10px] text-[#9ad7ff]">{dateStr}</div>
          </div>
        </div>

        {/* Ticker */}
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2 text-[10px] font-bold text-[#e2e8f0] overflow-hidden pixel-banner">
            <Volume2 size={11} className="text-[#0a0a0a]" />
            <span style={{ display: 'inline-block', animation: 'marquee 18s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-5 pb-4 grid grid-cols-12 grid-rows-12 gap-3">
          <div className="col-span-3 row-span-8 flex flex-col gap-3">
            <PixelCard title="今日好运" accent="#f97316" icon={<Sparkles size={12} className="text-[#f97316]" />}>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 flex items-center justify-center text-lg font-black text-white pixel-orb"
                  style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #facc15)` }}>
                  {fortune.zodiac}
                </div>
                <div>
                  <div className="text-[10px] font-black text-[#e2e8f0]">{fortune.constellation}座</div>
                  <div className="text-[9px] text-[#9ad7ff]">幸运色：{fortune.luckyColor}</div>
                </div>
              </div>
              <div className="text-[9px] text-[#cbd5f5] mt-2">{fortune.message}</div>
              <div className="flex gap-1.5 mt-2">
                {fortune.luckyBalls.slice(0, 5).map((ball, i) => (
                  <div key={i} className="w-6 h-6 flex items-center justify-center text-[9px] font-black text-white pixel-orb" style={{ background: ball.c }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </PixelCard>

            <PixelCard title="公益进度" accent="#34d399" icon={<Zap size={12} className="text-[#34d399]" />}>
              <div className="space-y-2">
                {sources.welfare.slice(0, 3).map(item => (
                  <div key={item.id} className="flex items-center justify-between rounded px-2 py-1 bg-[#0b1225] border border-[#1f2a44]">
                    <div className="text-[9px] text-[#9ad7ff]">{item.title}</div>
                    <div className="text-[10px] font-black text-[#e2e8f0]">
                      {item.value}<span className="text-[8px] text-[#9ad7ff] ml-0.5">{item.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </PixelCard>
          </div>

          <div className="col-span-6 row-span-8">
            <PixelCarousel items={heroItems} />
          </div>

          <div className="col-span-3 row-span-8 flex flex-col gap-3">
            <PixelCard title="今日开奖" accent="#f43f5e" icon={<Radio size={12} className="text-[#f43f5e]" />}>
              <div className="space-y-2">
                {todayDraws.slice(0, 4).map(draw => (
                  <div key={draw.id} className="rounded px-2 py-1 bg-[#0b1225] border border-[#1f2a44]">
                    <div className="text-[10px] font-black text-[#e2e8f0]">{draw.name}</div>
                    <div className="text-[9px] text-[#9ad7ff]">{draw.time}</div>
                    <div className="mt-2 h-1" style={{ background: `linear-gradient(90deg, ${draw.colors?.[0] || '#f97316'}, ${draw.colors?.[1] || '#facc15'})` }} />
                  </div>
                ))}
                {todayDraws.length === 0 && <div className="text-[9px] text-[#9ad7ff]">今日暂无直播开奖</div>}
              </div>
            </PixelCard>

            <PixelCard title="本店喜报" accent="#38bdf8" icon={<Trophy size={12} className="text-[#38bdf8]" />}>
              <div className="space-y-2">
                {MOCK_WINNERS.slice(0, 3).map(w => (
                  <div key={w.id} className="text-[9px] text-[#cbd5f5]">{w.text}</div>
                ))}
              </div>
            </PixelCard>
          </div>

          <div className="col-span-8 row-span-4 grid grid-cols-3 gap-3">
            <PixelNews title="行业资讯" accent="#f97316" icon={<Globe size={11} className="text-[#f97316]" />} items={sources.industry} />
            <PixelNews title="地方资讯" accent="#38bdf8" icon={<MapPin size={11} className="text-[#38bdf8]" />} items={sources.local} />
            <PixelNews title="公益文化" accent="#34d399" icon={<Sparkles size={11} className="text-[#34d399]" />} items={sources.culture} />
          </div>

          <div className="col-span-4 row-span-4 flex flex-col gap-3">
            <PixelCard title="门店信息" accent="#facc15" icon={<MapPin size={11} className="text-[#facc15]" />}>
              <div className="text-[9px] text-[#9ad7ff]">{MOCK_STORE.address}</div>
              <div className="text-[9px] text-[#9ad7ff] mt-1">{MOCK_STORE.phone}</div>
            </PixelCard>
            <PixelButton
              title="超级大乐透"
              sub="活力选号"
              colorFrom="#f97316"
              colorTo="#facc15"
              onClick={() => navigate(`/s/${storeId}/lotto`)}
            />
            <PixelButton
              title="体彩顶呱刮"
              sub="幸运即刻"
              colorFrom="#38bdf8"
              colorTo="#22d3ee"
              onClick={() => navigate(`/s/${storeId}/scratch`)}
            />
          </div>
        </div>

        <div className="pb-2 text-center text-[9px] text-[#9ad7ff] tracking-widest">
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
    <div className="relative w-full h-full overflow-hidden arcade-bg">
      <div className="relative z-10 flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="px-3 py-1 pixel-badge">
            <span className="text-[11px] font-black text-[#0a0a0a] pixel-head">{MOCK_STORE.name}</span>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-black text-[#e2e8f0] pixel-head">{timeStr}</div>
            <div className="text-[9px] text-[#9ad7ff]">{dateStr}</div>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-[9px] font-bold text-[#e2e8f0] overflow-hidden pixel-banner">
            <Volume2 size={10} className="text-[#0a0a0a]" />
            <span style={{ display: 'inline-block', animation: 'marquee 16s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
        </div>

        <div className="px-4 flex-1 min-h-0 flex flex-col gap-3 pb-3">
          <div className="rounded-2xl overflow-hidden" style={{ height: '26%' }}>
            <PixelCarousel items={heroItems} />
          </div>

          <PixelCard title="今日好运" accent="#f97316" icon={<Sparkles size={11} className="text-[#f97316]" />}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 flex items-center justify-center text-lg font-black text-white pixel-orb"
                style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #facc15)` }}>
                {fortune.zodiac}
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-black text-[#e2e8f0]">{fortune.constellation}座</div>
                <div className="text-[9px] text-[#9ad7ff]">幸运色：{fortune.luckyColor}</div>
              </div>
              <div className="flex gap-1.5">
                {fortune.luckyBalls.slice(0, 3).map((ball, i) => (
                  <div key={i} className="w-6 h-6 flex items-center justify-center text-[9px] font-black text-white pixel-orb" style={{ background: ball.c }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[9px] text-[#cbd5f5] mt-2">{fortune.message}</div>
          </PixelCard>

          <PixelCard title="今日开奖" accent="#f43f5e" icon={<Radio size={11} className="text-[#f43f5e]" />}>
            <div className="space-y-2">
              {todayDraws.slice(0, 3).map(draw => (
                <div key={draw.id} className="rounded px-2 py-1 bg-[#0b1225] border border-[#1f2a44]">
                  <div className="text-[10px] font-black text-[#e2e8f0]">{draw.name}</div>
                  <div className="text-[9px] text-[#9ad7ff]">{draw.time}</div>
                  <div className="mt-2 h-1" style={{ background: `linear-gradient(90deg, ${draw.colors?.[0] || '#f97316'}, ${draw.colors?.[1] || '#facc15'})` }} />
                </div>
              ))}
              {todayDraws.length === 0 && <div className="text-[9px] text-[#9ad7ff]">今日暂无直播开奖</div>}
            </div>
          </PixelCard>

          <PixelCard title="本店喜报" accent="#38bdf8" icon={<Trophy size={11} className="text-[#38bdf8]" />}>
            <div className="space-y-2">
              {MOCK_WINNERS.slice(0, 3).map(w => (
                <div key={w.id} className="text-[9px] text-[#cbd5f5]">{w.text}</div>
              ))}
            </div>
          </PixelCard>

          <PixelNews title="行业资讯" accent="#f97316" icon={<Globe size={10} className="text-[#f97316]" />} items={sources.industry} />
          <PixelNews title="地方资讯" accent="#38bdf8" icon={<MapPin size={10} className="text-[#38bdf8]" />} items={sources.local} />
          <PixelNews title="公益文化" accent="#34d399" icon={<Sparkles size={10} className="text-[#34d399]" />} items={sources.culture} />

          <PixelCard title="公益进度" accent="#34d399" icon={<Zap size={11} className="text-[#34d399]" />}>
            <div className="space-y-2">
              {sources.welfare.slice(0, 3).map(item => (
                <div key={item.id} className="flex items-center justify-between rounded px-2 py-1 bg-[#0b1225] border border-[#1f2a44]">
                  <div className="text-[9px] text-[#9ad7ff]">{item.title}</div>
                  <div className="text-[10px] font-black text-[#e2e8f0]">
                    {item.value}<span className="text-[8px] text-[#9ad7ff] ml-0.5">{item.unit}</span>
                  </div>
                </div>
              ))}
            </div>
          </PixelCard>

          <PixelCard title="门店信息" accent="#facc15" icon={<MapPin size={10} className="text-[#facc15]" />}>
            <div className="text-[9px] text-[#9ad7ff]">{MOCK_STORE.address}</div>
            <div className="text-[9px] text-[#9ad7ff] mt-1">{MOCK_STORE.phone}</div>
          </PixelCard>

          <div className="grid grid-cols-2 gap-3">
            <PixelButton
              title="超级大乐透"
              sub="活力选号"
              colorFrom="#f97316"
              colorTo="#facc15"
              onClick={() => navigate(`/s/${storeId}/lotto`)}
            />
            <PixelButton
              title="体彩顶呱刮"
              sub="幸运即刻"
              colorFrom="#38bdf8"
              colorTo="#22d3ee"
              onClick={() => navigate(`/s/${storeId}/scratch`)}
            />
          </div>
        </div>

        <div className="pb-2 text-center text-[9px] text-[#9ad7ff] tracking-widest">
          理性购彩 · 适度娱乐 · 未成年人禁止购彩
        </div>
      </div>
    </div>
  );
};

export default function PortalStyleSportsArcade() {
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
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#070b17', fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div style={{ width: boxW, height: boxH, overflow: 'hidden', borderRadius: 18, boxShadow: '0 22px 80px rgba(0,0,0,0.35)' }}>
        {isLandscape ? <LandscapeLayout {...props} /> : <PortraitLayout {...props} />}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;800&family=Press+Start+2P&display=swap');
        .arcade-bg {
          background:
            radial-gradient(circle at 20% 20%, rgba(56,189,248,0.18), transparent 40%),
            radial-gradient(circle at 80% 20%, rgba(250,204,21,0.18), transparent 40%),
            radial-gradient(circle at 20% 80%, rgba(52,211,153,0.18), transparent 40%),
            radial-gradient(circle at 80% 80%, rgba(244,63,94,0.18), transparent 40%),
            linear-gradient(180deg, #0b1225 0%, #070b17 100%);
        }
        .pixel-head { font-family: 'Press Start 2P', 'Noto Sans SC', sans-serif; letter-spacing: 0.04em; }
        .pixel-card {
          background: #0f172a;
          border: 2px solid #1f2a44;
          border-radius: 10px;
          padding: 12px;
          box-shadow: 0 0 0 2px #0a0a0a, 0 10px 20px rgba(0,0,0,0.35);
        }
        .pixel-frame {
          border: 3px solid #0a0a0a;
          border-radius: 12px;
          box-shadow: 0 0 0 3px #38bdf8, 0 18px 28px rgba(0,0,0,0.35);
        }
        .pixel-badge {
          background: linear-gradient(90deg, #f97316, #facc15);
          border: 2px solid #0a0a0a;
          box-shadow: 0 6px 0 rgba(0,0,0,0.35);
        }
        .pixel-banner {
          background: linear-gradient(90deg, #38bdf8, #22d3ee);
          border: 2px solid #0a0a0a;
          border-radius: 10px;
          padding: 6px 8px;
          box-shadow: 0 6px 0 rgba(0,0,0,0.35);
        }
        .pixel-tag {
          background: #0a0a0a;
          border: 2px solid #fff;
        }
        .pixel-orb {
          border: 2px solid #0a0a0a;
        }
        .pixel-btn {
          border: 2px solid #0a0a0a;
          box-shadow: 0 8px 0 rgba(0,0,0,0.35);
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}
