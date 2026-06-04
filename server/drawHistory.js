const axios = require('axios');
const https = require('https');

const agent = new https.Agent({ rejectUnauthorized: false });
const nationalClient = axios.create({
    httpsAgent: agent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Safari)',
        'Referer': 'https://www.lottery.gov.cn/',
        'Origin': 'https://www.lottery.gov.cn'
    },
    timeout: 15000
});
const fjClient = axios.create({
    httpsAgent: agent,
    headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Safari)',
        'Referer': 'https://www.fjtc.com.cn/',
        'Origin': 'https://www.fjtc.com.cn'
    },
    timeout: 15000
});

const NATIONAL_GAMES = [
    { key: 'dlt', name: '超级大乐透', gameNo: '85', fjType: 'dlt' },
    { key: 'qxc', name: '七星彩', gameNo: '04' },
    { key: 'pls', name: '排列3', gameNo: '35', fjType: 'pls' },
    { key: 'plw', name: '排列5', gameNo: '350133', fjType: 'plw' },
];

const FUJIAN_GAMES = [
    { key: 'fj367', name: '36选7', type: 'fj367' },
    { key: 'fj225', name: '22选5', type: 'fj225' },
    { key: 'fj317', name: '31选7', type: 'fj317' },
    { key: 'fj317fj', name: '31选7附加', type: 'fj317fj' },
];

const parseResultNumbers = (raw, key) => {
    const nums = String(raw || '').trim().split(/\s+/).filter(Boolean);
    if (nums.length === 0) return { numbers: [], bonusNumbers: [] };

    // Standard normalization for 5+2 or other formats
    if (key === 'dlt' && nums.length > 5) {
        return { numbers: nums.slice(0, 5), bonusNumbers: nums.slice(5) };
    }
    if (key === 'qxc' && nums.length > 6) {
        return { numbers: nums.slice(0, 6), bonusNumbers: nums.slice(6) };
    }
    if ((key === 'fj367' || key === 'fj317' || key === 'fj317fj') && nums.length > 7) {
        return { numbers: nums.slice(0, 7), bonusNumbers: nums.slice(7) };
    }
    return { numbers: nums, bonusNumbers: [] };
};

const fetchNationalHistory = async (game, pageSize) => {
    // Try Fujian source first if available for national games as per user preference
    if (game.fjType) {
        try {
            const fjHistory = await fetchFujianHistory({ ...game, type: game.fjType }, pageSize);
            if (fjHistory && fjHistory.length > 0) return fjHistory;
            throw new Error('Fujian history empty');
        } catch (e) {
            console.warn(`[DrawHistory] Fujian fallback for ${game.name} failed, trying National:`, e.message);
        }
    }

    const url = `https://webapi.sporttery.cn/gateway/lottery/getHistoryPageListV1.qry?gameNo=${game.gameNo}&provinceId=0&pageSize=${pageSize}&isVerify=1&pageNo=1`;
    const { data } = await nationalClient.get(url);
    if (!data || !data.success || !data.value || !Array.isArray(data.value.list)) {
        return [];
    }
    return data.value.list.map(item => {
        const parsed = parseResultNumbers(item.lotteryDrawResult, game.key);
        return {
            issue: item.lotteryDrawNum ? `${item.lotteryDrawNum}期` : '',
            date: item.lotteryDrawTime || '',
            numbers: parsed.numbers,
            bonusNumbers: parsed.bonusNumbers,
            pool: item.poolBalanceAfterdraw ?? item.poolBalanceAfterDraw ?? item.poolBalance ?? ''
        };
    });
};

const fetchFujianHistory = async (game, pageSize) => {
    const url = `https://www.fjtc.com.cn/data_api/lottery?type=${game.type}&page=1&limit=${pageSize}`;
    const { data } = await fjClient.get(url);
    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data?.data?.list) ? data.data.list : []);
    if (!list || list.length === 0) {
        throw new Error('Fujian history empty');
    }

    return list.map(item => {
        const rawResult = item.lotteryDrawResult || item.result || item.winNumber || item.win_number || '';
        const parsed = parseResultNumbers(rawResult, game.key);
        return {
            issue: (item.lotteryDrawNum || item.number || item.issue || item.qishu || '') + '期',
            date: item.lotteryDrawTime || item.draw_date || item.drawDate || item.openTime || '',
            numbers: parsed.numbers,
            bonusNumbers: parsed.bonusNumbers,
            pool: item.poolBalanceAfterdraw || item.pool_balance || item.poolBalance || item.poolAmount || ''
        };
    });
};

async function fetchAllDrawHistories(pageSize = 20) {
    const national = await Promise.all(
        NATIONAL_GAMES.map(async (game) => {
            try {
                const history = await fetchNationalHistory(game, pageSize);
                return { ...game, history };
            } catch (e) {
                console.error(`[DrawHistory] Error fetching ${game.name}:`, e.message);
                return { ...game, history: [], error: e.message };
            }
        })
    );

    const fujian = await Promise.all(
        FUJIAN_GAMES.map(async (game) => {
            try {
                const history = await fetchFujianHistory(game, pageSize);
                return { ...game, history };
            } catch (e) {
                console.error(`[DrawHistory] Error fetching ${game.name}:`, e.message);
                return { ...game, history: [], error: e.message };
            }
        })
    );

    return {
        timestamp: new Date().toISOString(),
        games: [...national, ...fujian]
    };
}

module.exports = { fetchAllDrawHistories };
