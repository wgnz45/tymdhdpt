import { useCallback, useEffect, useState } from 'react';

export const MOCK_STORE = {
  name: '东街口体彩旗舰店',
  manager: '王店长',
  address: '福建省福州市鼓楼区东街口88号',
  phone: '13888888888',
  hours: '08:30 - 22:00',
  notice: '本站喜中大乐透二等奖！顶呱刮《龙腾四海》新票火热来袭！本月已产出中奖体彩200注！',
};

export const MOCK_CAROUSEL = [
  {
    id: 1,
    url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=1200&q=80',
    title: '大乐透 · 超级大派奖',
    sub: '本周奖池高达12亿',
    badge: '进行中',
    c1: '#E85D04',
    c2: '#FFB703',
  },
  {
    id: 2,
    url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=1200&q=80',
    title: '体彩顶呱刮 · 中国龙',
    sub: '面值20元 · 最高奖100万',
    badge: '新品',
    c1: '#00B4D8',
    c2: '#00F5D4',
  },
];

export const MOCK_WINNERS = [
  { id: 1, text: '热烈祝贺4402026948店中出超级大乐透一等奖1注1000万元', color: '#E85D04' },
  { id: 2, text: '恭喜本店喜中大乐透一等奖10注追加，奖金1.13亿元', color: '#00B4D8' },
  { id: 3, text: '热烈祝贺3303131510站点喜中25269期排列五15注，共150万元', color: '#2A9D8F' },
  { id: 4, text: '恭喜本站彩民中顶呱刮《瑞龙呈祥》10万元大奖', color: '#F94144' },
];

export const MOCK_INDUSTRY_NEWS = [
  { id: 1, title: '体育总局体彩中心发布《2025年中国体育彩票社会责任报告》', tag: '最新', tagColor: '#E85D04', tagBg: '#E85D0415' },
  { id: 2, title: '“微光行动”持续发力，体彩助力乡村教育振兴', tag: '聚焦', tagColor: '#00B4D8', tagBg: '#00B4D815' },
  { id: 3, title: '全国体彩工作会议召开，部署年度重点任务', tag: '行业', tagColor: '#2A9D8F', tagBg: '#2A9D8F15' },
];

export const MOCK_LOCAL_NEWS = [
  { id: 1, title: '福建体彩“越努力 越美好”趣味运动会圆满落幕', tag: '福建', tagColor: '#2A9D8F', tagBg: '#2A9D8F15' },
  { id: 2, title: '福州购彩者喜中大乐透1000万，现场省中心兑领奖', tag: '大奖', tagColor: '#FFB703', tagBg: '#FFB70315' },
  { id: 3, title: '福建体彩管理中心开展消防安全演练', tag: '动态', tagColor: '#64748B', tagBg: '#64748B15' },
];

export const MOCK_CULTURE_NEWS = [
  { id: 1, title: '公益金持续投入群众体育设施建设', tag: '公益', tagColor: '#F94144', tagBg: '#F9414415' },
  { id: 2, title: '微光计划走进社区，传递温暖力量', tag: '暖心', tagColor: '#E85D04', tagBg: '#E85D0415' },
  { id: 3, title: '体彩志愿者服务再升级', tag: '行动', tagColor: '#00B4D8', tagBg: '#00B4D815' },
];

export const MOCK_LIVE_DRAWS = [
  { id: 1, name: '超级大乐透', time: '每周一、三、六 21:25', days: [1, 3, 6], colors: ['#E85D04', '#FFB703'] },
  { id: 2, name: '排列3', time: '每天 21:25', days: [0, 1, 2, 3, 4, 5, 6], colors: ['#00B4D8', '#00F5D4'] },
  { id: 3, name: '排列5', time: '每天 21:25', days: [0, 1, 2, 3, 4, 5, 6], colors: ['#F94144', '#FFB703'] },
  { id: 4, name: '7星彩', time: '每周二、五、日 21:25', days: [0, 2, 5], colors: ['#E85D04', '#00B4D8'] },
];

export const MOCK_WELFARE = [
  { id: 1, title: '公益金累计', value: '9963.57', unit: '亿元' },
  { id: 2, title: '微光行动项目', value: '1350', unit: '个' },
  { id: 3, title: '社区体育活动', value: '420', unit: '场' },
];

const ZODIAC_ANIMALS = ['鼠', '牛', '虎', '兔', '龙', '蛇', '马', '羊', '猴', '鸡', '狗', '猪'];
const ZODIAC_COLORS = ['#E85D04', '#FFB703', '#F94144', '#00B4D8', '#2A9D8F', '#FFD166', '#00F5D4', '#E85D04', '#2DD4BF', '#E85D04', '#22C55E', '#0EA5E9'];
const CONSTELLATIONS = ['摩羯', '水瓶', '双鱼', '白羊', '金牛', '双子', '巨蟹', '狮子', '处女', '天秤', '天蝎', '射手'];
const LUCKY_GAMES = ['超级大乐透', '体彩顶呱刮'];
const LUCKY_COLORS_TEXT = ['朝阳橙', '元气黄', '清澈蓝', '活力绿', '热力红'];

export function getDailyFortune(date) {
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
      { n: String(n1).padStart(2, '0'), c: '#E85D04' },
      { n: String(n2).padStart(2, '0'), c: '#00B4D8' },
      { n: String(((d * 2) % 35) + 1).padStart(2, '0'), c: '#2A9D8F' },
      { n: String(n3).padStart(2, '0'), c: '#FFB703' },
      { n: String(((d * 5) % 12) + 1).padStart(2, '0'), c: '#F94144' },
    ],
    message: `今日${CONSTELLATIONS[consIdx]}与属${ZODIAC_ANIMALS[zodiacIdx]}的气场很合，适合关注${LUCKY_GAMES[d % 2]}。`,
  };
}

export function useFitBox() {
  const [dims, setDims] = useState({ w: window.innerWidth, h: window.innerHeight });
  const handleResize = useCallback(() => setDims({ w: window.innerWidth, h: window.innerHeight }), []);

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
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
    if (boxW > dims.w) { boxW = dims.w; boxH = boxW / ratio; }
  } else {
    boxW = Math.min(dims.w, dims.h * ratio);
    boxH = boxW / ratio;
    if (boxH > dims.h) { boxH = dims.h; boxW = boxH * ratio; }
  }

  return { boxW, boxH, isLandscape };
}
