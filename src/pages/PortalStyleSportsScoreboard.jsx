import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, BarChart3, Globe, MapPin, Phone, Radio, Sparkles, Trophy, TrendingUp, Volume2 } from 'lucide-react';
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

const ScoreCarousel = ({ items }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(s => (s + 1) % items.length), 5500);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="relative w-full h-full overflow-hidden score-frame">
      {items.map((item, i) => (
        <div key={item.id} className="absolute inset-0 transition-opacity duration-700 ease-in-out" style={{ opacity: i === active ? 1 : 0 }}>
          <img src={item.url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, rgba(2,6,23,0.6) 0%, ${item.c1}66 45%, ${item.c2}33 80%, transparent 100%)` }} />
          <div className="absolute left-6 bottom-6 text-white">
            <div className="text-[10px] font-black px-3 py-1 rounded-full inline-block mb-2 tracking-[0.3em]"
              style={{ background: 'rgba(0,0,0,0.45)', border: '1px solid rgba(255,255,255,0.45)' }}>
              {item.badge}
            </div>
            <div className="text-3xl font-black leading-tight drop-shadow-[0_10px_25px_rgba(0,0,0,0.35)] score-head">
              {item.title}
            </div>
            <div className="text-sm font-semibold text-white/85 mt-2">{item.sub}</div>
          </div>
        </div>
      ))}
      <div className="absolute top-4 right-4 flex gap-1.5">
        {items.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            style={{ width: i === active ? 18 : 6, height: 6, borderRadius: 6, background: i === active ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s', border: '1px solid #0b1220', padding: 0 }} />
        ))}
      </div>
    </div>
  );
};

const ScoreCard = ({ title, icon, accent, children }) => (
  <div className="score-card" style={{ borderColor: accent }}>
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <div className="text-[12px] font-black text-[#e2e8f0] score-head">{title}</div>
      <div className="ml-auto w-2 h-2 rounded-full" style={{ background: accent }} />
    </div>
    {children}
  </div>
);

const NewsStack = ({ title, icon, accent, items }) => (
  <div className="score-card" style={{ borderColor: accent }}>
    <div className="flex items-center gap-2 mb-2">
      {icon}
      <div className="text-[11px] font-black text-[#e2e8f0] score-head">{title}</div>
    </div>
    <div className="space-y-2">
      {items.slice(0, 3).map(n => (
        <div key={n.id} className="flex items-start gap-2">
          <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: n.tagColor, background: n.tagBg }}>{n.tag}</span>
          <div className="text-[10px] text-[#cbd5f5] leading-tight line-clamp-2">{n.title}</div>
        </div>
      ))}
    </div>
  </div>
);

const ScoreButton = ({ title, sub, colorFrom, colorTo, onClick }) => (
  <button
    onClick={onClick}
    className="score-btn"
    style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})` }}
  >
    <div>
      <div className="text-[12px] font-black score-head">{title}</div>
      <div className="text-[9px] font-semibold text-white/75">{sub}</div>
    </div>
    <ArrowRight size={14} className="ml-auto text-white" />
  </button>
);

const LandscapeLayout = ({ storeId, navigate, fortune, timeStr, dateStr, sources }) => {
  const today = new Date().getDay();
  const heroItems = sources.carousel || MOCK_CAROUSEL;
  const allDraws = [...(sources.draws || []), ...(sources.fujianDraws || [])];
  const todayDraws = allDraws.filter(d => d.days && d.days.includes(today));

  return (
    <div className="relative w-full h-full overflow-hidden scoreboard-bg">
      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between">
          <div>
            <div className="text-2xl font-black text-white score-head">{MOCK_STORE.name}</div>
            <div className="text-[10px] text-[#7dd3fc] tracking-[0.35em]">SPORTS SCOREBOARD</div>
          </div>
          <div className="text-right">
            <div className="text-[16px] font-black text-white score-head">{timeStr}</div>
            <div className="text-[10px] text-[#94a3b8]">{dateStr}</div>
          </div>
        </div>

        {/* Ticker */}
        <div className="px-5 pb-2">
          <div className="flex items-center gap-2 text-[10px] text-[#e2e8f0] overflow-hidden score-banner">
            <Volume2 size={11} className="text-[#38bdf8]" />
            <span style={{ display: 'inline-block', animation: 'marquee 18s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
        </div>

        <div className="flex-1 min-h-0 px-5 pb-4 grid grid-cols-12 grid-rows-12 gap-3">
          <div className="col-span-7 row-span-7">
            <ScoreCarousel items={heroItems} />
          </div>
          <div className="col-span-5 row-span-7 flex flex-col gap-3">
            <ScoreCard title="今日好运" accent="#f97316" icon={<Sparkles size={12} className="text-[#f97316]" />}>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #facc15)` }}>
                  {fortune.zodiac}
                </div>
                <div>
                  <div className="text-[12px] font-black text-[#e2e8f0]">{fortune.constellation}座</div>
                  <div className="text-[10px] text-[#94a3b8]">幸运色：{fortune.luckyColor}</div>
                </div>
              </div>
              <div className="text-[10px] text-[#cbd5f5] mt-2">{fortune.message}</div>
              <div className="flex gap-2 mt-2">
                {fortune.luckyBalls.slice(0, 5).map((ball, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: ball.c }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </ScoreCard>

            <ScoreCard title="今日开奖" accent="#38bdf8" icon={<Radio size={12} className="text-[#38bdf8]" />}>
              <div className="space-y-2">
                {todayDraws.slice(0, 4).map(draw => (
                  <div key={draw.id} className="rounded-xl px-3 py-2 bg-[#0f1b2d] border border-[#1f2a44]">
                    <div className="text-[11px] font-black text-[#e2e8f0]">{draw.name}</div>
                    <div className="text-[9px] text-[#94a3b8]">{draw.time}</div>
                    <div className="mt-2 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${draw.colors?.[0] || '#38bdf8'}, ${draw.colors?.[1] || '#22d3ee'})` }} />
                  </div>
                ))}
                {todayDraws.length === 0 && <div className="text-[9px] text-[#94a3b8]">今日暂无直播开奖</div>}
              </div>
            </ScoreCard>
          </div>

          <div className="col-span-7 row-span-5 grid grid-cols-3 gap-3">
            <NewsStack title="行业资讯" accent="#f97316" icon={<Globe size={11} className="text-[#f97316]" />} items={sources.industry} />
            <NewsStack title="地方资讯" accent="#38bdf8" icon={<MapPin size={11} className="text-[#38bdf8]" />} items={sources.local} />
            <NewsStack title="公益文化" accent="#34d399" icon={<TrendingUp size={11} className="text-[#34d399]" />} items={sources.culture} />
          </div>

          <div className="col-span-5 row-span-5 flex flex-col gap-3">
            <ScoreCard title="本店喜报" accent="#facc15" icon={<Trophy size={12} className="text-[#facc15]" />}>
              <div className="space-y-2">
                {MOCK_WINNERS.slice(0, 3).map(w => (
                  <div key={w.id} className="text-[10px] text-[#cbd5f5]">{w.text}</div>
                ))}
              </div>
            </ScoreCard>

            <ScoreCard title="门店指数" accent="#34d399" icon={<BarChart3 size={12} className="text-[#34d399]" />}>
              <div className="grid grid-cols-3 gap-2">
                {sources.welfare.slice(0, 3).map(item => (
                  <div key={item.id} className="rounded-xl px-2 py-2 bg-[#0f1b2d] border border-[#1f2a44] text-center">
                    <div className="text-[11px] font-black text-white">{item.value}</div>
                    <div className="text-[9px] text-[#94a3b8]">{item.title}</div>
                  </div>
                ))}
              </div>
            </ScoreCard>

            <ScoreCard title="门店信息" accent="#94a3b8" icon={<MapPin size={11} className="text-[#94a3b8]" />}>
              <div className="text-[10px] text-[#cbd5f5]">{MOCK_STORE.address}</div>
              <div className="text-[10px] text-[#cbd5f5] mt-1">{MOCK_STORE.phone}</div>
            </ScoreCard>

            <div className="grid grid-cols-2 gap-3">
              <ScoreButton
                title="超级大乐透"
                sub="活力选号"
                colorFrom="#f97316"
                colorTo="#facc15"
                onClick={() => navigate(`/s/${storeId}/lotto`)}
              />
              <ScoreButton
                title="体彩顶呱刮"
                sub="幸运即刻"
                colorFrom="#38bdf8"
                colorTo="#22d3ee"
                onClick={() => navigate(`/s/${storeId}/scratch`)}
              />
            </div>
          </div>
        </div>

        <div className="pb-2 text-center text-[9px] text-[#94a3b8] tracking-widest">
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
    <div className="relative w-full h-full overflow-hidden scoreboard-bg">
      <div className="relative z-10 flex flex-col h-full">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <div>
            <div className="text-lg font-black text-white score-head">{MOCK_STORE.name}</div>
            <div className="text-[9px] text-[#7dd3fc] tracking-[0.3em]">SCOREBOARD</div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-black text-white score-head">{timeStr}</div>
            <div className="text-[9px] text-[#94a3b8]">{dateStr}</div>
          </div>
        </div>

        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-[9px] text-[#e2e8f0] overflow-hidden score-banner">
            <Volume2 size={10} className="text-[#38bdf8]" />
            <span style={{ display: 'inline-block', animation: 'marquee 16s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
        </div>

        <div className="px-4 flex-1 min-h-0 flex flex-col gap-3 pb-3">
          <div className="rounded-2xl overflow-hidden" style={{ height: '26%' }}>
            <ScoreCarousel items={heroItems} />
          </div>

          <ScoreCard title="今日好运" accent="#f97316" icon={<Sparkles size={11} className="text-[#f97316]" />}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black text-white"
                style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #facc15)` }}>
                {fortune.zodiac}
              </div>
              <div className="flex-1">
                <div className="text-[11px] font-black text-[#e2e8f0]">{fortune.constellation}座</div>
                <div className="text-[9px] text-[#94a3b8]">幸运色：{fortune.luckyColor}</div>
              </div>
              <div className="flex gap-1.5">
                {fortune.luckyBalls.slice(0, 3).map((ball, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                    style={{ background: ball.c }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[9px] text-[#cbd5f5] mt-2">{fortune.message}</div>
          </ScoreCard>

          <ScoreCard title="今日开奖" accent="#38bdf8" icon={<Radio size={11} className="text-[#38bdf8]" />}>
            <div className="space-y-2">
              {todayDraws.slice(0, 3).map(draw => (
                <div key={draw.id} className="rounded-xl px-3 py-2 bg-[#0f1b2d] border border-[#1f2a44]">
                  <div className="text-[10px] font-black text-[#e2e8f0]">{draw.name}</div>
                  <div className="text-[9px] text-[#94a3b8]">{draw.time}</div>
                  <div className="mt-2 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${draw.colors?.[0] || '#38bdf8'}, ${draw.colors?.[1] || '#22d3ee'})` }} />
                </div>
              ))}
              {todayDraws.length === 0 && <div className="text-[9px] text-[#94a3b8]">今日暂无直播开奖</div>}
            </div>
          </ScoreCard>

          <ScoreCard title="本店喜报" accent="#facc15" icon={<Trophy size={11} className="text-[#facc15]" />}>
            <div className="space-y-2">
              {MOCK_WINNERS.slice(0, 3).map(w => (
                <div key={w.id} className="text-[9px] text-[#cbd5f5]">{w.text}</div>
              ))}
            </div>
          </ScoreCard>

          <NewsStack title="行业资讯" accent="#f97316" icon={<Globe size={10} className="text-[#f97316]" />} items={sources.industry} />
          <NewsStack title="地方资讯" accent="#38bdf8" icon={<MapPin size={10} className="text-[#38bdf8]" />} items={sources.local} />
          <NewsStack title="公益文化" accent="#34d399" icon={<TrendingUp size={10} className="text-[#34d399]" />} items={sources.culture} />

          <ScoreCard title="门店指数" accent="#34d399" icon={<BarChart3 size={10} className="text-[#34d399]" />}>
            <div className="grid grid-cols-3 gap-2">
              {sources.welfare.slice(0, 3).map(item => (
                <div key={item.id} className="rounded-xl px-2 py-2 bg-[#0f1b2d] border border-[#1f2a44] text-center">
                  <div className="text-[10px] font-black text-white">{item.value}</div>
                  <div className="text-[8px] text-[#94a3b8]">{item.title}</div>
                </div>
              ))}
            </div>
          </ScoreCard>

          <ScoreCard title="门店信息" accent="#94a3b8" icon={<MapPin size={10} className="text-[#94a3b8]" />}>
            <div className="text-[9px] text-[#cbd5f5]">{MOCK_STORE.address}</div>
            <div className="text-[9px] text-[#cbd5f5] mt-1">{MOCK_STORE.phone}</div>
          </ScoreCard>

          <div className="grid grid-cols-2 gap-3">
            <ScoreButton
              title="超级大乐透"
              sub="活力选号"
              colorFrom="#f97316"
              colorTo="#facc15"
              onClick={() => navigate(`/s/${storeId}/lotto`)}
            />
            <ScoreButton
              title="体彩顶呱刮"
              sub="幸运即刻"
              colorFrom="#38bdf8"
              colorTo="#22d3ee"
              onClick={() => navigate(`/s/${storeId}/scratch`)}
            />
          </div>
        </div>

        <div className="pb-2 text-center text-[9px] text-[#94a3b8] tracking-widest">
          理性购彩 · 适度娱乐 · 未成年人禁止购彩
        </div>
      </div>
    </div>
  );
};

export default function PortalStyleSportsScoreboard() {
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
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0b1220', fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div style={{ width: boxW, height: boxH, overflow: 'hidden', borderRadius: 18, boxShadow: '0 22px 80px rgba(0,0,0,0.4)' }}>
        {isLandscape ? <LandscapeLayout {...props} /> : <PortraitLayout {...props} />}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;800&family=Rajdhani:wght@500;700&display=swap');
        .score-head { font-family: 'Rajdhani', 'Noto Sans SC', sans-serif; letter-spacing: 0.08em; }
        .score-card {
          background: rgba(12,20,35,0.9);
          border: 1px solid #1f2a44;
          border-radius: 16px;
          padding: 12px;
          box-shadow: inset 0 0 0 1px rgba(56,189,248,0.08), 0 12px 24px rgba(0,0,0,0.35);
        }
        .score-frame {
          border-radius: 16px;
          border: 1px solid #1f2a44;
          box-shadow: 0 16px 28px rgba(0,0,0,0.4);
        }
        .score-banner {
          background: linear-gradient(90deg, rgba(56,189,248,0.12), rgba(52,211,153,0.12));
          border: 1px solid #1f2a44;
          border-radius: 12px;
          padding: 6px 8px;
        }
        .score-btn {
          border-radius: 12px;
          padding: 10px 12px;
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid rgba(255,255,255,0.2);
          box-shadow: 0 12px 20px rgba(0,0,0,0.35);
        }
        .scoreboard-bg {
          background:
            linear-gradient(180deg, rgba(15,23,42,0.9) 0%, rgba(11,18,32,0.95) 100%),
            repeating-linear-gradient(90deg, rgba(148,163,184,0.08) 0, rgba(148,163,184,0.08) 1px, transparent 1px, transparent 80px),
            repeating-linear-gradient(180deg, rgba(148,163,184,0.08) 0, rgba(148,163,184,0.08) 1px, transparent 1px, transparent 80px);
        }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}
