import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowRight, Flame, MapPin, Phone, Radio, Sparkles, Star, Sun, TrendingUp, Trophy, Zap } from 'lucide-react';

const MOCK_STORE = {
  name: '东街口体彩旗舰店',
  slogan: '青春能量站',
  address: '福州市鼓楼区东街口88号',
  phone: '13888888888',
};

const HEROES = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1400&q=80',
    title: '青春跑道 · 能量全开',
    sub: '本周能量场：追风计划',
    badge: '活力焦点',
    c1: '#FF7A00',
    c2: '#FFB703',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1518600506278-4e8ef466b810?w=1400&q=80',
    title: '向上生长 · 幸运同行',
    sub: '今日热力值 +18%',
    badge: '上新活动',
    c1: '#00C2FF',
    c2: '#00F5A0',
  },
  {
    id: 3,
    url: 'https://images.unsplash.com/photo-1549576490-b0b4831ef60a?w=1400&q=80',
    title: '点亮好运 · 热血开局',
    sub: '青春节拍 · 快乐开票',
    badge: '门店推荐',
    c1: '#FF4D6D',
    c2: '#FFD166',
  },
];

const MOCK_NEWS = [
  { id: 1, tag: '热度', tagColor: '#FF7A00', tagBg: '#FF7A0015', title: '青春公益行动，助力校园运动角' },
  { id: 2, tag: '快讯', tagColor: '#00C2FF', tagBg: '#00C2FF15', title: '本周门店“能量打卡”挑战开启' },
  { id: 3, tag: '福利', tagColor: '#00D47E', tagBg: '#00D47E15', title: '幸运玩家喜中快乐加倍奖' },
];

const MOCK_WINNERS = [
  { id: 1, text: '恭喜本店顾客喜中超级大乐透一等奖 1000 万元' },
  { id: 2, text: '恭喜本店顾客喜中排列5 10 注追加，奖金 113 万元' },
  { id: 3, text: '恭喜本店顾客喜中7星彩 50 万元' },
];

const MOCK_DRAWS = [
  { id: 1, name: '超级大乐透', time: '每周一、三、六 21:25', days: [1, 3, 6], colors: ['#FF7A00', '#FFD166'] },
  { id: 2, name: '排列3', time: '每天 21:25', days: [0, 1, 2, 3, 4, 5, 6], colors: ['#00C2FF', '#00F5A0'] },
  { id: 3, name: '排列5', time: '每天 21:25', days: [0, 1, 2, 3, 4, 5, 6], colors: ['#FF4D6D', '#FFD166'] },
  { id: 4, name: '7星彩', time: '每周二、五、日 21:25', days: [0, 2, 5], colors: ['#FF7A00', '#00C2FF'] },
];

const MOCK_WELFARE = [
  { id: 1, title: '公益金累计', value: '9963.57', unit: '亿元' },
  { id: 2, title: '青春运动角', value: '1350', unit: '个' },
  { id: 3, title: '社区健身项目', value: '420', unit: '场' },
];

const TICKER_TEXT = [
  '青春向上 · 运动更有彩',
  '理性购彩 · 快乐同行',
  '门店能量打卡，参与有礼',
  '把好运变成习惯',
];

function getDailyEnergy(date) {
  const d = date.getDate();
  const m = date.getMonth() + 1;
  const power = 70 + ((d * 7 + m * 3) % 29);
  const smile = 60 + ((d * 5 + m * 11) % 31);
  const focus = 55 + ((d * 9 + m * 2) % 36);
  const nums = [
    String((d * 3 + 7) % 35 || 7).padStart(2, '0'),
    String((d * 5 + 9) % 35 || 9).padStart(2, '0'),
    String((d * 7 + 11) % 35 || 11).padStart(2, '0'),
  ];
  const colors = ['朝阳橙', '清澈蓝', '荧光绿', '热力红'];
  return {
    power,
    smile,
    focus,
    nums,
    colorText: colors[d % colors.length],
    message: '保持好奇心，今天的好运更偏爱勇敢的人。',
  };
}

const EnergyBadge = ({ label, value, color }) => (
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/70 border border-white/60 shadow-[0_10px_20px_rgba(0,0,0,0.06)]">
    <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
    <div className="text-[11px] font-semibold text-gray-600">{label}</div>
    <div className="ml-auto text-[15px] font-black" style={{ color }}>{value}</div>
  </div>
);

const PulseButton = ({ onClick, title, sub, colorFrom, colorTo }) => (
  <button
    onClick={onClick}
    className="relative overflow-hidden rounded-2xl px-4 py-3 flex items-center gap-3 text-left active:scale-95 transition-transform"
    style={{
      background: `linear-gradient(135deg, ${colorFrom}, ${colorTo})`,
      boxShadow: `0 10px 26px ${colorFrom}50`,
    }}
  >
    <div className="absolute -top-10 -right-8 w-24 h-24 rounded-full opacity-40 blur-2xl" style={{ background: '#fff' }} />
    <div className="relative z-10">
      <div className="text-white font-black text-base leading-none">{title}</div>
      <div className="text-white/75 text-[11px] mt-1">{sub}</div>
    </div>
    <ArrowRight size={18} className="text-white ml-auto relative z-10" />
  </button>
);

const Hero = ({ item }) => (
  <div className="relative h-full w-full overflow-hidden rounded-3xl">
    <img src={item.url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
    <div className="absolute inset-0" style={{ background: `linear-gradient(115deg, ${item.c1}cc 0%, ${item.c1}66 42%, ${item.c2}33 75%, transparent 100%)` }} />
    <div className="absolute inset-0" style={{ background: 'radial-gradient(circle at 15% 20%, rgba(255,255,255,0.45), transparent 55%)' }} />
    <div className="absolute top-4 left-4">
      <span className="text-[11px] font-black px-3 py-1 rounded-full tracking-widest uppercase"
        style={{ background: 'rgba(255,255,255,0.85)', color: item.c1, boxShadow: `0 6px 16px ${item.c1}40` }}>
        {item.badge}
      </span>
    </div>
    <div className="absolute left-6 bottom-6 text-white">
      <div className="text-3xl font-black leading-tight drop-shadow-[0_10px_30px_rgba(0,0,0,0.35)]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
        {item.title}
      </div>
      <div className="text-sm font-semibold text-white/85 mt-2">{item.sub}</div>
    </div>
  </div>
);

const LandscapeLayout = ({ storeId, navigate, timeStr, dateStr, energy, sources, hero }) => {
  const today = new Date().getDay();
  const allDraws = [...(sources.draws || []), ...(sources.fujianDraws || [])];
  const todayDraws = allDraws.filter(d => d.days && d.days.includes(today));

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(140deg,#fff9ef 0%, #f3fffd 45%, #f0f6ff 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.25) 0, rgba(255,255,255,0.25) 12px, rgba(255,255,255,0) 12px, rgba(255,255,255,0) 24px)' }} />
      <div className="absolute -top-16 -left-10 w-60 h-60 rounded-full blur-3xl opacity-60" style={{ background: '#FFE29A' }} />
      <div className="absolute -bottom-20 right-10 w-72 h-72 rounded-full blur-3xl opacity-50" style={{ background: '#7AF0FF' }} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-black"
              style={{ background: 'linear-gradient(135deg,#FF7A00,#FFD166)', boxShadow: '0 10px 20px rgba(255,122,0,0.35)' }}>
              <Sun size={20} />
            </div>
            <div>
              <div className="text-lg font-black text-gray-800">{MOCK_STORE.name}</div>
              <div className="text-[11px] font-semibold text-[#FF7A00] tracking-[0.35em] uppercase">{MOCK_STORE.slogan}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-gray-800" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{timeStr}</div>
            <div className="text-[11px] font-semibold text-gray-500">{dateStr}</div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 flex gap-4 px-5 pb-4 min-h-0">
          {/* Left column */}
          <div className="flex flex-col gap-3" style={{ width: '24%' }}>
            <div className="rounded-2xl p-4 bg-white/85 shadow-[0_14px_30px_rgba(255,122,0,0.12)] border border-white/70">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={16} className="text-[#FF7A00]" />
                <div className="text-sm font-black text-gray-800">今日能量</div>
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FF7A00] text-white">LIVE</span>
              </div>
              <div className="text-[12px] text-gray-600 leading-relaxed mb-3">{energy.message}</div>
              <div className="flex gap-2 mb-2">
                {energy.nums.map((n, i) => (
                  <div key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black"
                    style={{ background: ['#FF7A00', '#00C2FF', '#00D47E'][i], boxShadow: '0 8px 16px rgba(0,0,0,0.12)' }}>
                    {n}
                  </div>
                ))}
              </div>
              <div className="text-[11px] font-semibold text-gray-500">幸运色：{energy.colorText}</div>
            </div>

            <div className="rounded-2xl p-4 bg-white/85 shadow-[0_14px_30px_rgba(0,194,255,0.12)] border border-white/70">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp size={16} className="text-[#00C2FF]" />
                <div className="text-sm font-black text-gray-800">青春指数</div>
              </div>
              <div className="space-y-2">
                <EnergyBadge label="能量值" value={`${energy.power}%`} color="#FF7A00" />
                <EnergyBadge label="笑容值" value={`${energy.smile}%`} color="#00C2FF" />
                <EnergyBadge label="专注值" value={`${energy.focus}%`} color="#00D47E" />
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-white/85 shadow-[0_14px_30px_rgba(0,0,0,0.08)] border border-white/70 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MapPin size={15} className="text-[#FF4D6D]" />
                <div className="text-sm font-black text-gray-800">门店信息</div>
              </div>
              <div className="text-[11px] text-gray-600">{MOCK_STORE.address}</div>
              <div className="flex items-center gap-2 text-[11px] text-gray-600">
                <Phone size={12} />
                {MOCK_STORE.phone}
              </div>
            </div>
          </div>

          {/* Center */}
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="flex-1 rounded-3xl shadow-[0_18px_40px_rgba(0,0,0,0.18)] overflow-hidden">
              <Hero item={hero} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-2xl p-3 bg-white/80 border border-white/70 shadow-[0_12px_24px_rgba(255,122,0,0.12)]">
                <div className="flex items-center gap-2 mb-2">
                  <Flame size={16} className="text-[#FF7A00]" />
                  <div className="text-[12px] font-black text-gray-800">今日热力</div>
                </div>
                <div className="text-2xl font-black text-[#FF7A00]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>+{energy.power}</div>
                <div className="text-[10px] text-gray-500">活力指数</div>
              </div>
              <div className="rounded-2xl p-3 bg-white/80 border border-white/70 shadow-[0_12px_24px_rgba(0,194,255,0.12)]">
                <div className="flex items-center gap-2 mb-2">
                  <Star size={16} className="text-[#00C2FF]" />
                  <div className="text-[12px] font-black text-gray-800">门店评分</div>
                </div>
                <div className="text-2xl font-black text-[#00C2FF]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>4.9</div>
                <div className="text-[10px] text-gray-500">好评度</div>
              </div>
              <div className="rounded-2xl p-3 bg-white/80 border border-white/70 shadow-[0_12px_24px_rgba(0,212,126,0.12)]">
                <div className="flex items-center gap-2 mb-2">
                  <Activity size={16} className="text-[#00D47E]" />
                  <div className="text-[12px] font-black text-gray-800">今日打卡</div>
                </div>
                <div className="text-2xl font-black text-[#00D47E]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>128</div>
                <div className="text-[10px] text-gray-500">参与人数</div>
              </div>
            </div>
            <div className="rounded-2xl px-4 py-2 bg-white/85 border border-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.08)] overflow-hidden">
              <div className="flex items-center gap-2 text-[11px] font-semibold text-gray-600">
                <Zap size={14} className="text-[#FF7A00]" />
                <div className="whitespace-nowrap">青春播报</div>
                <div className="flex-1 overflow-hidden">
                  <div className="inline-flex gap-8 whitespace-nowrap"
                    style={{ animation: 'marquee 18s linear infinite' }}>
                    {TICKER_TEXT.concat(TICKER_TEXT).map((t, i) => (
                      <span key={i} className="text-gray-600">{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-3" style={{ width: '26%' }}>
            <div className="rounded-2xl p-4 bg-white/88 border border-white/70 shadow-[0_14px_30px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-2 mb-3">
                <Radio size={15} className="text-[#FF4D6D]" />
                <div className="text-sm font-black text-gray-800">最新开奖</div>
              </div>
              <div className="space-y-2">
                {todayDraws.slice(0, 4).map(draw => (
                  <div key={draw.id} className="rounded-xl px-3 py-2 border border-[#FF4D6D15] bg-[#FFF5F7]">
                    <div className="text-[12px] font-bold text-gray-800">{draw.name}</div>
                    <div className="text-[10px] text-gray-500 mt-1">{draw.time}</div>
                  </div>
                ))}
                {todayDraws.length === 0 && (
                  <div className="text-[11px] text-gray-500">今日暂无直播开奖</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-white/88 border border-white/70 shadow-[0_14px_30px_rgba(255,122,0,0.12)]">
              <div className="flex items-center gap-2 mb-3">
                <Trophy size={15} className="text-[#FF7A00]" />
                <div className="text-sm font-black text-gray-800">幸运播报</div>
              </div>
              <div className="space-y-2">
                {MOCK_WINNERS.map(w => (
                  <div key={w.id} className="text-[11px] text-gray-600 rounded-xl px-3 py-2 bg-white/80 border border-gray-100">
                    {w.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl p-4 bg-white/88 border border-white/70 shadow-[0_14px_30px_rgba(0,0,0,0.08)]">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={15} className="text-[#00C2FF]" />
                <div className="text-sm font-black text-gray-800">青春快讯</div>
              </div>
              <div className="space-y-2">
                {(sources.industry || MOCK_NEWS).slice(0, 3).map(n => (
                  <div key={n.id} className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: n.tagBg || '#EAF7FF', color: n.tagColor || '#00C2FF' }}>
                      {n.tag || '快讯'}
                    </span>
                    <div className="text-[11px] text-gray-600 truncate">{n.title}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <PulseButton
                onClick={() => navigate(`/s/${storeId}/lotto`)}
                title="超级大乐透"
                sub="活力选号 · 快乐出发"
                colorFrom="#FF7A00"
                colorTo="#FFB703"
              />
              <PulseButton
                onClick={() => navigate(`/s/${storeId}/scratch`)}
                title="体彩顶呱刮"
                sub="轻松体验 · 幸运加倍"
                colorFrom="#00C2FF"
                colorTo="#00F5A0"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pb-2 text-center text-[10px] text-gray-400 tracking-widest">
          理性购彩 · 适度娱乐 · 未成年人禁止购彩
        </div>
      </div>
    </div>
  );
};

const PortraitLayout = ({ storeId, navigate, timeStr, dateStr, energy, sources, hero }) => {
  const today = new Date().getDay();
  const allDraws = [...(sources.draws || []), ...(sources.fujianDraws || [])];
  const todayDraws = allDraws.filter(d => d.days && d.days.includes(today));

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,#fff9ef 0%, #f2fffb 45%, #eff4ff 100%)' }} />
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.28) 0, rgba(255,255,255,0.28) 10px, rgba(255,255,255,0) 10px, rgba(255,255,255,0) 20px)' }} />
      <div className="absolute -top-20 left-10 w-52 h-52 rounded-full blur-3xl opacity-60" style={{ background: '#FFE29A' }} />
      <div className="absolute -bottom-24 right-4 w-56 h-56 rounded-full blur-3xl opacity-50" style={{ background: '#7AF0FF' }} />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white"
              style={{ background: 'linear-gradient(135deg,#FF7A00,#FFD166)', boxShadow: '0 10px 20px rgba(255,122,0,0.35)' }}>
              <Sun size={18} />
            </div>
            <div>
              <div className="text-sm font-black text-gray-800">{MOCK_STORE.name}</div>
              <div className="text-[10px] font-semibold text-[#FF7A00] tracking-[0.3em] uppercase">{MOCK_STORE.slogan}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-base font-black text-gray-800" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>{timeStr}</div>
            <div className="text-[10px] font-semibold text-gray-500">{dateStr}</div>
          </div>
        </div>

        <div className="px-4 flex-1 flex flex-col gap-3 min-h-0 pb-3">
          {/* Hero */}
          <div className="rounded-3xl overflow-hidden shadow-[0_16px_35px_rgba(0,0,0,0.2)]" style={{ height: '32%' }}>
            <Hero item={hero} />
          </div>

          {/* Energy cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-3 bg-white/85 border border-white/70 shadow-[0_12px_24px_rgba(255,122,0,0.12)]">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={14} className="text-[#FF7A00]" />
                <div className="text-[12px] font-black text-gray-800">今日热力</div>
              </div>
              <div className="text-2xl font-black text-[#FF7A00]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>+{energy.power}</div>
              <div className="text-[10px] text-gray-500">活力指数</div>
            </div>
            <div className="rounded-2xl p-3 bg-white/85 border border-white/70 shadow-[0_12px_24px_rgba(0,194,255,0.12)]">
              <div className="flex items-center gap-2 mb-2">
                <Star size={14} className="text-[#00C2FF]" />
                <div className="text-[12px] font-black text-gray-800">门店评分</div>
              </div>
              <div className="text-2xl font-black text-[#00C2FF]" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>4.9</div>
              <div className="text-[10px] text-gray-500">好评度</div>
            </div>
          </div>

          {/* Energy detail */}
          <div className="rounded-2xl p-3 bg-white/85 border border-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={14} className="text-[#FF7A00]" />
              <div className="text-[12px] font-black text-gray-800">今日能量</div>
            </div>
            <div className="text-[11px] text-gray-600 leading-relaxed mb-2">{energy.message}</div>
            <div className="flex gap-2">
              {energy.nums.map((n, i) => (
                <div key={i} className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black"
                  style={{ background: ['#FF7A00', '#00C2FF', '#00D47E'][i], boxShadow: '0 6px 14px rgba(0,0,0,0.12)' }}>
                  {n}
                </div>
              ))}
              <div className="ml-auto text-[10px] text-gray-500">幸运色：{energy.colorText}</div>
            </div>
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
            <div className="rounded-2xl p-3 bg-white/90 border border-white/70 shadow-[0_12px_24px_rgba(0,0,0,0.08)] flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Radio size={13} className="text-[#FF4D6D]" />
                <div className="text-[12px] font-black text-gray-800">今日开奖</div>
              </div>
              <div className="space-y-2 overflow-y-auto">
                {todayDraws.slice(0, 3).map(draw => (
                  <div key={draw.id} className="rounded-xl px-2 py-1.5 border border-[#FF4D6D15] bg-[#FFF5F7]">
                    <div className="text-[11px] font-bold text-gray-800">{draw.name}</div>
                    <div className="text-[9px] text-gray-500">{draw.time}</div>
                  </div>
                ))}
                {todayDraws.length === 0 && (
                  <div className="text-[10px] text-gray-500">今日暂无直播开奖</div>
                )}
              </div>
            </div>
            <div className="rounded-2xl p-3 bg-white/90 border border-white/70 shadow-[0_12px_24px_rgba(255,122,0,0.12)] flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <Trophy size={13} className="text-[#FF7A00]" />
                <div className="text-[12px] font-black text-gray-800">幸运播报</div>
              </div>
              <div className="space-y-2 overflow-y-auto">
                {MOCK_WINNERS.slice(0, 3).map(w => (
                  <div key={w.id} className="text-[10px] text-gray-600 rounded-xl px-2 py-1.5 bg-white/80 border border-gray-100">
                    {w.text}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl px-3 py-2 bg-white/90 border border-white/70 shadow-[0_10px_20px_rgba(0,0,0,0.08)]">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-gray-600">
              <Zap size={12} className="text-[#FF7A00]" />
              <div className="whitespace-nowrap">青春播报</div>
              <div className="flex-1 overflow-hidden">
                <div className="inline-flex gap-6 whitespace-nowrap" style={{ animation: 'marquee 16s linear infinite' }}>
                  {TICKER_TEXT.concat(TICKER_TEXT).map((t, i) => (
                    <span key={i} className="text-gray-600">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <PulseButton
              onClick={() => navigate(`/s/${storeId}/lotto`)}
              title="超级大乐透"
              sub="活力选号"
              colorFrom="#FF7A00"
              colorTo="#FFB703"
            />
            <PulseButton
              onClick={() => navigate(`/s/${storeId}/scratch`)}
              title="体彩顶呱刮"
              sub="幸运即刻"
              colorFrom="#00C2FF"
              colorTo="#00F5A0"
            />
          </div>
        </div>

        <div className="pb-2 text-center text-[9px] text-gray-400 tracking-widest">
          理性购彩 · 适度娱乐 · 未成年人禁止购彩
        </div>
      </div>
    </div>
  );
};

export default function PortalStyleYouth() {
  const { storeId } = useParams();
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [heroIndex, setHeroIndex] = useState(0);
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [sourcesData, setSourcesData] = useState(null);

  const handleResize = useCallback(() => setDims({ w: window.innerWidth, h: window.innerHeight }), []);

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 1000);
    const heroTimer = setInterval(() => setHeroIndex(i => (i + 1) % HEROES.length), 6000);
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    fetch('/api/system/sources')
      .then(r => r.json())
      .then(res => {
        const payload = res?.data || res;
        if (payload && (payload.industry || payload.local || payload.draws || payload.welfare)) {
          setSourcesData(payload);
        }
      })
      .catch(() => { });

    return () => {
      clearInterval(t);
      clearInterval(heroTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, [handleResize]);

  const isLandscape = dims.w >= dims.h;
  const ratio = isLandscape ? (16 / 9) : (9 / 16);
  let boxW = dims.w;
  let boxH = dims.h;
  if (isLandscape) {
    boxH = dims.h;
    boxW = boxH * ratio;
    if (boxW > dims.w) {
      boxW = dims.w;
      boxH = boxW / ratio;
    }
  } else {
    boxW = Math.min(dims.w, dims.h * ratio);
    boxH = boxW / ratio;
    if (boxH > dims.h) {
      boxH = dims.h;
      boxW = boxH * ratio;
    }
  }

  const energy = useMemo(() => getDailyEnergy(currentTime), [currentTime]);
  const timeStr = currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = currentTime.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });

  const sources = {
    industry: sourcesData?.industry || MOCK_NEWS,
    local: sourcesData?.local || MOCK_NEWS,
    culture: sourcesData?.culture || MOCK_NEWS,
    welfare: sourcesData?.welfare || MOCK_WELFARE,
    draws: sourcesData?.draws || MOCK_DRAWS,
  };

  const hero = HEROES[heroIndex % HEROES.length];
  const props = { storeId, navigate, timeStr, dateStr, energy, sources, hero };

  return (
    <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9eef5', fontFamily: "'Noto Sans SC', sans-serif" }}>
      <div style={{ width: boxW, height: boxH, overflow: 'hidden', borderRadius: 18, boxShadow: '0 22px 80px rgba(0,0,0,0.22)' }}>
        {isLandscape ? <LandscapeLayout {...props} /> : <PortraitLayout {...props} />}
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Noto+Sans+SC:wght@400;600;800&display=swap');
        @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
      `}</style>
    </div>
  );
}
