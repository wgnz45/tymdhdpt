import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowRight, Flame, Globe, MapPin, Phone, Play, Radio, Sparkles, Star, Sun, Trophy, TrendingUp, Volume2, Zap } from 'lucide-react';

/* =========================================
   MOCK DATA (same content as style-sports)
   ========================================= */
const MOCK_STORE = {
  name: '东街口体彩旗舰店',
  manager: '王店长',
  address: '福建省福州市鼓楼区东街口88号',
  phone: '13888888888',
  hours: '08:30 - 22:00',
  notice: '本站喜中大乐透二等奖！顶呱刮《龙腾四海》新票火热来袭！本月已产出中奖体彩200注！',
};

const MOCK_CAROUSEL = [
  { id: 1, url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=80', title: '大乐透 · 超级大派奖', sub: '本周奖池高达12亿', badge: '进行中', c1: '#FF6A00', c2: '#FFD166' },
  { id: 2, url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&q=80', title: '体彩顶呱刮 · 中国龙', sub: '面值20元 · 最高奖100万', badge: '新品', c1: '#00C2FF', c2: '#00F5A0' },
];

const MOCK_WINNERS = [
  { id: 1, text: '热烈祝贺4402026948店中出超级大乐透一等奖1注1000万元', color: '#FF6A00' },
  { id: 2, text: '恭喜本店喜中大乐透一等奖10注追加，奖金1.13亿元', color: '#00C2FF' },
  { id: 3, text: '热烈祝贺3303131510站点喜中25269期排列五15注，共150万元', color: '#00D47E' },
  { id: 4, text: '恭喜本站彩民中顶呱刮《瑞龙呈祥》10万元大奖', color: '#FF4D6D' },
];

const MOCK_INDUSTRY_NEWS = [
  { id: 1, title: '体育总局体彩中心发布《2025年中国体育彩票社会责任报告》', tag: '最新', tagColor: '#FF6A00', tagBg: '#FF6A0015' },
  { id: 2, title: '“微光行动”持续发力，体彩助力乡村教育振兴', tag: '聚焦', tagColor: '#00C2FF', tagBg: '#00C2FF15' },
  { id: 3, title: '全国体彩工作会议召开，部署年度重点任务', tag: '行业', tagColor: '#00D47E', tagBg: '#00D47E15' },
];

const MOCK_LOCAL_NEWS = [
  { id: 1, title: '福建体彩“越努力 越美好”趣味运动会圆满落幕', tag: '福建', tagColor: '#00D47E', tagBg: '#00D47E15' },
  { id: 2, title: '福州购彩者喜中大乐透1000万，现场省中心兑领奖', tag: '大奖', tagColor: '#FFB703', tagBg: '#FFB70315' },
  { id: 3, title: '福建体彩管理中心开展消防安全演练', tag: '动态', tagColor: '#64748B', tagBg: '#64748B15' },
];

const MOCK_CULTURE_NEWS = [
  { id: 1, title: '公益金持续投入群众体育设施建设', tag: '公益', tagColor: '#FF4D6D', tagBg: '#FF4D6D15' },
  { id: 2, title: '微光计划走进社区，传递温暖力量', tag: '暖心', tagColor: '#FF6A00', tagBg: '#FF6A0015' },
  { id: 3, title: '体彩志愿者服务再升级', tag: '行动', tagColor: '#00C2FF', tagBg: '#00C2FF15' },
];

const MOCK_LIVE_DRAWS = [
  { id: 1, name: '超级大乐透', time: '每周一、三、六 21:25', days: [1, 3, 6], colors: ['#FF6A00', '#FFD166'] },
  { id: 2, name: '排列3', time: '每天 21:25', days: [0, 1, 2, 3, 4, 5, 6], colors: ['#00C2FF', '#00F5A0'] },
  { id: 3, name: '排列5', time: '每天 21:25', days: [0, 1, 2, 3, 4, 5, 6], colors: ['#FF4D6D', '#FFD166'] },
  { id: 4, name: '7星彩', time: '每周二、五、日 21:25', days: [0, 2, 5], colors: ['#FF6A00', '#00C2FF'] },
];

const MOCK_WELFARE = [
  { id: 1, title: '公益金累计', value: '9963.57', unit: '亿元' },
  { id: 2, title: '微光行动项目', value: '1350', unit: '个' },
  { id: 3, title: '社区体育活动', value: '420', unit: '场' },
];

/* =========================================
   FORTUNE DATA
   ========================================= */
const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const ZODIAC_COLORS = ['#FF6A00', '#FFD166', '#FF4D6D', '#00C2FF', '#00D47E', '#FFB703', '#00F5A0', '#FF7A00', '#2DD4BF', '#FF6A00', '#22C55E', '#0EA5E9'];
const CONSTELLATIONS = ['摩羯', '水瓶', '双鱼', '白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手'];
const LUCKY_GAMES = ['超级大乐透', '体彩顶呱刮'];
const LUCKY_COLORS_TEXT = ['朝阳橙', '元气黄', '清澈蓝', '活力绿', '热力红'];

function getDailyFortune(date) {
  const d = date.getDate();
  const m = date.getMonth();
  const zodiacIdx = (d + m * 2 + 4) % 12;
  const consIdx = (m + d % 4) % 12;
  const n1 = (d % 35) + 1;
  const n2 = ((d * 3) % 35) + 1;
  const n3 = ((d * 7) % 12) + 1;
  return {
    zodiac: ZODIAC_ANIMALS[zodiacIdx],
    zodiacColor: ZODIAC_COLORS[zodiacIdx],
    zodiacNums: [n1, n2].map(n => String(n).padStart(2, '0')),
    constellation: CONSTELLATIONS[consIdx],
    consNums: [n3, ((d * 11) % 35) + 1].map(n => String(n).padStart(2, '0')),
    luckyGame: LUCKY_GAMES[d % 2],
    luckyColor: LUCKY_COLORS_TEXT[d % LUCKY_COLORS_TEXT.length],
    luckyBalls: [
      { n: String(n1).padStart(2, '0'), c: '#FF6A00' },
      { n: String(n2).padStart(2, '0'), c: '#00C2FF' },
      { n: String(((d * 2) % 35) + 1).padStart(2, '0'), c: '#00D47E' },
      { n: String(n3).padStart(2, '0'), c: '#FFD166' },
      { n: String(((d * 5) % 12) + 1).padStart(2, '0'), c: '#FF4D6D' },
    ],
    message: `今日${CONSTELLATIONS[consIdx]}与属${ZODIAC_ANIMALS[zodiacIdx]}的气场很合，适合关注${LUCKY_GAMES[d % 2]}。`,
  };
}

const StatPill = ({ label, value, accent }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/80 border border-white/70 shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
    <div className="w-2.5 h-2.5 rounded-full" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
    <div className="text-[11px] font-semibold text-gray-600">{label}</div>
    <div className="ml-auto text-[15px] font-black" style={{ color: accent }}>{value}</div>
  </div>
);

const Tag = ({ text, color, bg }) => (
  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color, background: bg }}>
    {text}
  </span>
);

const HeroCarousel = ({ items }) => {
  const [active, setActive] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setActive(s => (s + 1) % items.length), 5000);
    return () => clearInterval(t);
  }, [items.length]);
  return (
    <div className="relative w-full h-full overflow-hidden rounded-[28px]">
      {items.map((item, i) => (
        <div key={item.id} className="absolute inset-0 transition-opacity duration-700 ease-in-out" style={{ opacity: i === active ? 1 : 0 }}>
          <img src={item.url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: `linear-gradient(120deg, ${item.c1}cc 0%, ${item.c1}66 45%, ${item.c2}33 80%, transparent 100%)` }} />
          <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.55), transparent 60%)' }} />
          <div className="absolute left-6 bottom-6 text-white">
            <div className="text-[11px] font-black px-3 py-1 rounded-full inline-block mb-2 tracking-[0.3em]"
              style={{ background: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.45)' }}>
              {item.badge}
            </div>
            <div className="text-3xl font-black leading-tight drop-shadow-[0_12px_30px_rgba(0,0,0,0.35)]" style={{ fontFamily: "'Oswald', sans-serif" }}>
              {item.title}
            </div>
            <div className="text-sm font-semibold text-white/80 mt-2">{item.sub}</div>
          </div>
        </div>
      ))}
      <div className="absolute top-4 right-4 flex gap-1.5 z-10">
        {items.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            style={{ width: i === active ? 16 : 6, height: 6, borderRadius: 6, background: i === active ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'all 0.3s', border: 'none', padding: 0 }} />
        ))}
      </div>
    </div>
  );
};

const NewsColumn = ({ title, icon, accent, items }) => (
  <div className="flex flex-col h-full rounded-2xl bg-white/85 border border-white/70 shadow-[0_14px_26px_rgba(0,0,0,0.08)] overflow-hidden">
    <div className="flex items-center gap-2 px-3 py-2 border-b border-white/60" style={{ background: 'rgba(255,255,255,0.6)' }}>
      {icon}
      <div className="text-[12px] font-black text-gray-800">{title}</div>
      <div className="ml-auto w-2 h-2 rounded-full" style={{ background: accent }} />
    </div>
    <div className="flex-1 overflow-hidden px-3 py-2 space-y-2">
      {items.slice(0, 4).map(n => (
        <div key={n.id} className="flex items-start gap-2">
          <Tag text={n.tag} color={n.tagColor} bg={n.tagBg} />
          <div className="text-[11px] text-gray-600 leading-tight line-clamp-2">{n.title}</div>
        </div>
      ))}
    </div>
  </div>
);

const DrawList = ({ draws }) => (
  <div className="space-y-2">
    {draws.slice(0, 4).map(draw => {
      const colors = draw.colors || ['#FF6A00', '#FFD166'];
      return (
        <div key={draw.id} className="rounded-xl px-3 py-2 border border-white/70 bg-white/80 shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
          <div className="flex items-center justify-between">
            <div className="text-[12px] font-black text-gray-800">{draw.name}</div>
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: `${colors[0]}15`, color: colors[0] }}>
              {draw.time.replace('每天 ', '').replace('每周', '')}
            </span>
          </div>
          <div className="mt-1 h-1 rounded-full" style={{ background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})` }} />
        </div>
      );
    })}
    {draws.length === 0 && <div className="text-[11px] text-gray-500">今日暂无直播开奖</div>}
  </div>
);

const WinnerList = ({ winners }) => (
  <div className="space-y-2">
    {winners.slice(0, 4).map(w => (
      <div key={w.id} className="rounded-xl px-3 py-2 bg-white/80 border border-white/70 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
        <div className="text-[11px] font-semibold text-gray-700 leading-tight">{w.text}</div>
      </div>
    ))}
  </div>
);

const QuickButton = ({ title, sub, colorFrom, colorTo, onClick }) => (
  <button
    onClick={onClick}
    className="relative overflow-hidden rounded-2xl px-4 py-3 flex items-center gap-3 text-left active:scale-95 transition-transform"
    style={{ background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})`, boxShadow: `0 12px 26px ${colorFrom}55` }}
  >
    <div className="absolute -top-10 -right-8 w-24 h-24 rounded-full opacity-40 blur-2xl" style={{ background: '#fff' }} />
    <div className="relative z-10">
      <div className="text-white font-black text-base leading-none">{title}</div>
      <div className="text-white/75 text-[11px] mt-1">{sub}</div>
    </div>
    <ArrowRight size={18} className="text-white ml-auto relative z-10" />
  </button>
);

const LandscapeLayout = ({ storeId, navigate, fortune, timeStr, dateStr, sources }) => {
  const today = new Date().getDay();
  const heroItems = sources.carousel || MOCK_CAROUSEL;
  const allDraws = [...(sources.draws || []), ...(sources.fujianDraws || [])];
  const todayDraws = allDraws.filter(d => d.days && d.days.includes(today));

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(140deg,#fff7ef 0%, #f1fffb 45%, #eff4ff 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.3) 0, rgba(255,255,255,0.3) 12px, rgba(255,255,255,0) 12px, rgba(255,255,255,0) 24px)' }} />
      <div className="absolute -top-16 -left-10 w-56 h-56 rounded-full blur-3xl opacity-60" style={{ background: '#FFE29A' }} />
      <div className="absolute -bottom-24 right-10 w-64 h-64 rounded-full blur-3xl opacity-50" style={{ background: '#7AF0FF' }} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black"
              style={{ background: 'linear-gradient(135deg,#FF6A00,#FFD166)', boxShadow: '0 10px 20px rgba(255,106,0,0.35)' }}>
              <Sun size={20} />
            </div>
            <div>
              <div className="text-base font-black text-gray-800">{MOCK_STORE.name}</div>
              <div className="text-[10px] font-semibold text-[#FF6A00] tracking-[0.35em] uppercase">SPORTS LOTTERY</div>
            </div>
          </div>
          <div className="flex-1 mx-6 overflow-hidden text-[11px] font-semibold text-gray-600 whitespace-nowrap flex items-center gap-2">
            <Volume2 size={13} style={{ color: '#FF6A00', flexShrink: 0 }} />
            <span style={{ display: 'inline-block', animation: 'marquee 20s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-gray-800" style={{ fontFamily: "'Oswald', sans-serif" }}>{timeStr}</div>
            <div className="text-[10px] font-semibold text-gray-500">{dateStr}</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="flex-1 min-h-0 px-5 pb-4 grid grid-cols-12 grid-rows-12 gap-3">
          {/* Hero */}
          <div className="col-span-8 row-span-7">
            <div className="relative h-full">
              <HeroCarousel items={heroItems} />
              <div className="absolute left-5 bottom-5 flex gap-2">
                <div className="rounded-2xl px-3 py-2 bg-white/80 border border-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
                  <div className="text-[10px] font-bold text-gray-500 mb-1">公益数据</div>
                  <div className="flex gap-2">
                    {sources.welfare.slice(0, 2).map(item => (
                      <div key={item.id} className="text-[12px] font-black text-gray-800">
                        {item.value}<span className="text-[9px] font-semibold text-gray-400 ml-0.5">{item.unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl px-3 py-2 bg-white/80 border border-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.12)]">
                  <div className="text-[10px] font-bold text-gray-500 mb-1">门店信息</div>
                  <div className="text-[10px] text-gray-600">{MOCK_STORE.address}</div>
                  <div className="text-[10px] text-gray-600">{MOCK_STORE.phone}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Fortune */}
          <div className="col-span-4 row-span-4">
            <div className="h-full rounded-2xl p-4 bg-white/85 border border-white/70 shadow-[0_16px_28px_rgba(0,0,0,0.1)]">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#FF6A00]" />
                <div className="text-[13px] font-black text-gray-800">今日好运</div>
                <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FF6A00] text-white">LIVE</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                  style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #FFD166)` }}>
                  {fortune.zodiac}
                </div>
                <div>
                  <div className="text-[13px] font-black text-gray-800">{fortune.constellation}座</div>
                  <div className="text-[10px] text-gray-500">幸运色：{fortune.luckyColor}</div>
                </div>
              </div>
              <div className="text-[11px] text-gray-600 leading-relaxed mb-3">{fortune.message}</div>
              <div className="flex gap-2">
                {fortune.luckyBalls.slice(0, 5).map((ball, i) => (
                  <div key={i} className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black text-white"
                    style={{ background: ball.c, boxShadow: `0 6px 14px ${ball.c}55` }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Draws */}
          <div className="col-span-4 row-span-3">
            <div className="h-full rounded-2xl p-4 bg-white/85 border border-white/70 shadow-[0_16px_28px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-2 mb-3">
                <Radio size={15} className="text-[#FF4D6D]" />
                <div className="text-[13px] font-black text-gray-800">最新开奖</div>
                <Play size={12} className="text-[#FF4D6D] ml-auto" />
              </div>
              <DrawList draws={todayDraws} />
            </div>
          </div>

          {/* News */}
          <div className="col-span-8 row-span-5 grid grid-cols-3 gap-3">
            <NewsColumn title="行业资讯" accent="#FF6A00" icon={<Globe size={13} className="text-[#FF6A00]" />} items={sources.industry} />
            <NewsColumn title="地方资讯" accent="#00C2FF" icon={<MapPin size={13} className="text-[#00C2FF]" />} items={sources.local} />
            <NewsColumn title="公益文化" accent="#00D47E" icon={<Sparkles size={13} className="text-[#00D47E]" />} items={sources.culture} />
          </div>

          {/* Winners + Buttons */}
          <div className="col-span-4 row-span-5">
            <div className="h-full rounded-2xl p-4 bg-white/85 border border-white/70 shadow-[0_16px_28px_rgba(0,0,0,0.1)] flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={15} className="text-[#FF6A00]" />
                <div className="text-[13px] font-black text-gray-800">本店喜报</div>
                <div className="ml-auto text-[8px] font-bold px-2 py-0.5 rounded-full bg-[#FF6A00] text-white">LIVE</div>
              </div>
              <div className="flex-1 overflow-hidden">
                <WinnerList winners={MOCK_WINNERS} />
              </div>
              <div className="mt-3 grid gap-2">
                <QuickButton
                  onClick={() => navigate(`/s/${storeId}/lotto`)}
                  title="超级大乐透"
                  sub="活力选号 · 快乐出发"
                  colorFrom="#FF6A00"
                  colorTo="#FFD166"
                />
                <QuickButton
                  onClick={() => navigate(`/s/${storeId}/scratch`)}
                  title="体彩顶呱刮"
                  sub="轻松体验 · 幸运加倍"
                  colorFrom="#00C2FF"
                  colorTo="#00F5A0"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="pb-2 text-center text-[10px] text-gray-400 tracking-widest">
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
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#fff7ef 0%, #f1fffb 45%, #eff4ff 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.28) 10px, rgba(255,255,255,0) 10px, rgba(255,255,255,0) 20px)' }} />
      <div className="absolute -top-20 left-8 w-52 h-52 rounded-full blur-3xl opacity-60" style={{ background: '#FFE29A' }} />
      <div className="absolute -bottom-24 right-4 w-56 h-56 rounded-full blur-3xl opacity-50" style={{ background: '#7AF0FF' }} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#FF6A00,#FFD166)', boxShadow: '0 10px 20px rgba(255,106,0,0.35)' }}>
              <Sun size={18} />
            </div>
            <div>
              <div className="text-sm font-black text-gray-800">{MOCK_STORE.name}</div>
              <div className="text-[9px] font-semibold text-[#FF6A00] tracking-[0.3em] uppercase">SPORTS LOTTERY</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-black text-gray-800" style={{ fontFamily: "'Oswald', sans-serif" }}>{timeStr}</div>
            <div className="text-[9px] font-semibold text-gray-500">{dateStr}</div>
          </div>
        </div>

        {/* Ticker */}
        <div className="px-4 pb-2">
          <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-600 overflow-hidden rounded-xl bg-white/80 border border-white/70 px-3 py-2">
            <Volume2 size={12} className="text-[#FF6A00] flex-shrink-0" />
            <span style={{ display: 'inline-block', animation: 'marquee 18s linear infinite', paddingLeft: '100%' }}>
              {MOCK_STORE.notice}
            </span>
          </div>
        </div>

        <div className="px-4 flex-1 min-h-0 flex flex-col gap-3 pb-3">
          {/* Hero */}
          <div className="rounded-[26px] overflow-hidden shadow-[0_16px_35px_rgba(0,0,0,0.2)]" style={{ height: '30%' }}>
            <HeroCarousel items={heroItems} />
          </div>

          {/* Fortune */}
          <div className="rounded-2xl p-3 bg-white/85 border border-white/70 shadow-[0_14px_26px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[#FF6A00]" />
              <div className="text-[12px] font-black text-gray-800">今日好运</div>
              <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FF6A00] text-white">LIVE</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg font-black text-white"
                style={{ background: `linear-gradient(135deg, ${fortune.zodiacColor}, #FFD166)` }}>
                {fortune.zodiac}
              </div>
              <div className="flex-1">
                <div className="text-[12px] font-black text-gray-800">{fortune.constellation}座</div>
                <div className="text-[10px] text-gray-500">幸运色：{fortune.luckyColor}</div>
              </div>
              <div className="flex gap-1.5">
                {fortune.luckyBalls.slice(0, 3).map((ball, i) => (
                  <div key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white"
                    style={{ background: ball.c, boxShadow: `0 6px 12px ${ball.c}55` }}>
                    {ball.n}
                  </div>
                ))}
              </div>
            </div>
            <div className="text-[10px] text-gray-600 mt-2">{fortune.message}</div>
          </div>

          {/* Draws + Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-3 bg-white/85 border border-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-2 mb-2">
                <Radio size={12} className="text-[#FF4D6D]" />
                <div className="text-[12px] font-black text-gray-800">今日开奖</div>
              </div>
              <DrawList draws={todayDraws} />
            </div>
            <div className="rounded-2xl p-3 bg-white/85 border border-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={12} className="text-[#00C2FF]" />
                <div className="text-[12px] font-black text-gray-800">青春指数</div>
              </div>
              <div className="space-y-2">
                <StatPill label="能量值" value="92%" accent="#FF6A00" />
                <StatPill label="笑容值" value="88%" accent="#00C2FF" />
                <StatPill label="专注值" value="80%" accent="#00D47E" />
              </div>
            </div>
          </div>

          {/* News */}
          <div className="grid grid-cols-1 gap-3 flex-1 min-h-0">
            <NewsColumn title="行业资讯" accent="#FF6A00" icon={<Globe size={12} className="text-[#FF6A00]" />} items={sources.industry} />
            <NewsColumn title="地方资讯" accent="#00C2FF" icon={<MapPin size={12} className="text-[#00C2FF]" />} items={sources.local} />
            <NewsColumn title="公益文化" accent="#00D47E" icon={<Sparkles size={12} className="text-[#00D47E]" />} items={sources.culture} />
          </div>

          {/* Winners + Buttons */}
          <div className="rounded-2xl p-3 bg-white/85 border border-white/70 shadow-[0_14px_26px_rgba(0,0,0,0.1)]">
            <div className="flex items-center gap-2 mb-2">
              <Trophy size={12} className="text-[#FF6A00]" />
              <div className="text-[12px] font-black text-gray-800">本店喜报</div>
              <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-[#FF6A00] text-white">LIVE</span>
            </div>
            <WinnerList winners={MOCK_WINNERS} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <QuickButton
              onClick={() => navigate(`/s/${storeId}/lotto`)}
              title="超级大乐透"
              sub="活力选号"
              colorFrom="#FF6A00"
              colorTo="#FFD166"
            />
            <QuickButton
              onClick={() => navigate(`/s/${storeId}/scratch`)}
              title="体彩顶呱刮"
              sub="幸运即刻"
              colorFrom="#00C2FF"
              colorTo="#00F5A0"
            />
          </div>

          {/* Store */}
          <div className="rounded-2xl px-3 py-2 bg-white/85 border border-white/70 shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 text-[10px] text-gray-600">
              <MapPin size={11} />
              {MOCK_STORE.address}
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-600 mt-1">
              <Phone size={11} />
              {MOCK_STORE.phone}
            </div>
          </div>
        </div>

        <div className="pb-2 text-center text-[9px] text-gray-400 tracking-widest">
          理性购彩 · 适度娱乐 · 未成年人禁止购彩
        </div>
      </div>
    </div>
  );
};

export default function PortalStyleSportsNeo() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [sourcesData, setSourcesData] = useState(null);

  const handleResize = useCallback(() => setDims({ w: window.innerWidth, h: window.innerHeight }), []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    fetch('/api/system/sources')
      .then(r => r.json())
      .then(res => {
        const payload = res?.data || res;
        if (payload && (payload.industry || payload.local || payload.culture || payload.draws || payload.welfare)) {
          setSourcesData(payload);
        }
      })
      .catch(() => { });

    return () => {
      clearInterval(t);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  const isLandscape = dims.w >= dims.h;
  const screenRatio = dims.w / dims.h;
  const isAndroidUA = /Android/i.test(navigator.userAgent || '');
  const isTabletSize = Math.min(dims.w, dims.h) >= 600;
  const androidPadMode = isAndroidUA && isTabletSize;
  const useFullScreenRatio = androidPadMode;
  const ratio = useFullScreenRatio ? screenRatio : (isLandscape ? (16 / 9) : (9 / 16));
  let boxW = dims.w;
  let boxH = dims.h;
  if (useFullScreenRatio) {
    boxW = dims.w;
    boxH = dims.h;
  } else if (isLandscape) {
    boxH = dims.h;
    boxW = boxH * ratio;
    if (boxW > dims.w) { boxW = dims.w; boxH = boxW / ratio; }
  } else {
    boxW = Math.min(dims.w, dims.h * ratio);
    boxH = boxW / ratio;
    if (boxH > dims.h) { boxH = dims.h; boxW = boxH * ratio; }
  }

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

  const props = { storeId, navigate, fortune, timeStr, dateStr, sources, androidPadMode };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e7eef7', fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div
        style={{
          width: boxW,
          height: boxH,
          overflow: 'hidden',
          borderRadius: useFullScreenRatio ? 0 : 18,
          boxShadow: useFullScreenRatio ? 'none' : '0 22px 80px rgba(0,0,0,0.22)'
        }}
      >
        {isLandscape ? <LandscapeLayout {...props} /> : <PortraitLayout {...props} />}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;600;800&family=Oswald:wght@400;600;700&display=swap');
        :root {
          --neo-orange: #FF6A00;
          --neo-blue: #00C2FF;
          --neo-green: #00D47E;
          --neo-yellow: #FFD166;
        }
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}
