const axios = require('axios');
const cheerio = require('cheerio');

const ZODIAC_MAP = {
    'shu': '鼠', 'niu': '牛', 'hu': '虎', 'tu': '兔', 'long': '龙', 'she': '蛇',
    'ma': '马', 'yang': '羊', 'hou': '猴', 'ji': '鸡', 'gou': '狗', 'zhu': '猪'
};

const CONSTELLATION_MAP = {
    'aries': '白羊座', 'taurus': '金牛座', 'gemini': '双子座', 'cancer': '巨蟹座',
    'leo': '狮子座', 'virgo': '处女座', 'libra': '天秤座', 'scorpio': '天蝎座',
    'sagittarius': '射手座', 'capricorn': '摩羯座', 'aquarius': '水瓶座', 'pisces': '双鱼座'
};

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

/**
 * 标准颜色映射表 - 按照颜色名称精准匹配
 */
function getStandardHex(name) {
    if (!name) return '#F0F0F0';
    const mapping = {
        // 蓝色系
        '湖蓝': '#007FFF', '天蓝': '#87CEEB', '深蓝': '#00008B', '蓝色': '#0000FF', '蓝': '#0000FF', '浅蓝': '#ADD8E6', '宝蓝': '#000080',
        // 绿色系
        '草绿': '#99CC33', '翠绿': '#00FF00', '深绿': '#006400', '绿色': '#008000', '绿': '#008000', '浅绿': '#90EE90', '青色': '#00FFFF',
        // 红色系
        '枣红': '#8B0000', '大红': '#FF0000', '红色': '#FF0000', '红': '#FF0000', '粉红': '#FFC0CB', '粉色': '#FFC0CB', '玫红': '#E91E63',
        // 橙黄色系
        '橘黄': '#FFA500', '橙色': '#FFA500', '橙': '#FFA500', '金黄': '#FFD700', '金色': '#FFD700', '黄色': '#FFFF00', '黄': '#FFFF00', '杏色': '#FFE4B5',
        // 紫色系
        '绛紫': '#8B008B', '紫色': '#800080', '紫': '#800080', '暗紫': '#4B0082', '紫红': '#D02090',
        // 棕色咖啡色系
        '咖啡': '#6F4E37', '棕色': '#8B4513', '褐色': '#A52A2A', '亚麻': '#FAF0E6',
        // 黑白灰
        '黑色': '#000000', '黑': '#000000', '灰色': '#808080', '灰': '#808080', '银色': '#C0C0C0', '白色': '#FFFFFF'
    };

    // 优先全字匹配
    if (mapping[name]) return mapping[name];

    // 模糊匹配
    for (const key in mapping) {
        if (name.includes(key)) return mapping[key];
    }
    return '#FFDAB9'; // 默认底色
}

async function fetchZodiac(id, index, name) {
    try {
        const url = `https://m.xzw.com/sxys/${id}/`;
        const res = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': USER_AGENT } });
        const $ = cheerio.load(res.data);

        // Icon: Precise pattern
        const icon = `https://m.xzw.com/static/public/images/prot_icon/sx/a/${index}.png`;

        let luckyColor = '';
        let luckyNumber = '';

        // Improved logic for Zodiac info matching
        $('.fe_info li').each((_, li) => {
            const labelText = $(li).find('label').text().trim();
            const valueText = $(li).find('p').text().trim();
            if (labelText === '幸运颜色') luckyColor = valueText;
            if (labelText === '幸运数字') luckyNumber = valueText;
        });

        // Today's Yi logic
        let yi = $('.fe_yj span.fe_yi').text().trim().replace(/^宜/, '').trim();
        if (!yi) {
            // Check alt selector for Zodiac Yi
            yi = $('.fe_yj .fe_yi').text().trim().replace(/^宜/, '').trim();
        }

        return {
            id, type: 'zodiac', name,
            icon,
            luckyColor: luckyColor || '-',
            luckyColorHex: getStandardHex(luckyColor),
            luckyNumber: luckyNumber || '-',
            yi: yi || '平稳顺遂',
            updateTime: new Date().toISOString()
        };
    } catch (e) {
        console.error(`[Crawler] Error zodiac ${name}:`, e.message);
        return null;
    }
}

async function fetchConstellation(id, index, name) {
    try {
        const url = `https://m.xzw.com/fortune/${id}/`;
        const res = await axios.get(url, { timeout: 15000, headers: { 'User-Agent': USER_AGENT } });
        const $ = cheerio.load(res.data);

        // Constellation Icon: Force absolute path
        const icon = `https://m.xzw.com/static/public/images/prot_icon/xz/a/${index}.png`;

        let luckyColor = '';
        let luckyNumber = '';

        // Better matching for Constellation info
        $('.for_box span').each((_, span) => {
            const label = $(span).find('p').text().trim();
            const val = $(span).find('em').text().trim();
            if (label === '幸运颜色') luckyColor = val;
            if (label === '幸运数字') luckyNumber = val;
        });

        let yi = $('.for_yj div.item.yi p').text().trim();

        return {
            id, type: 'constellation', name,
            icon,
            luckyColor: luckyColor || '-',
            luckyColorHex: getStandardHex(luckyColor),
            luckyNumber: luckyNumber || '-',
            yi: yi || '顺其自然',
            updateTime: new Date().toISOString()
        };
    } catch (e) {
        console.error(`[Crawler] Error constellation ${name}:`, e.message);
        return null;
    }
}

async function fetchAllFortune() {
    console.log('[Crawler] Starting Precision Fortune Sync...');
    const results = { zodiacs: [], constellations: [], lastUpdated: new Date().toISOString() };

    let zIdx = 1;
    for (const [id, name] of Object.entries(ZODIAC_MAP)) {
        const data = await fetchZodiac(id, zIdx++, name);
        if (data) {
            results.zodiacs.push(data);
            console.log(`[Crawler] Zodiac ${name} synced`);
        }
        await new Promise(r => setTimeout(r, 400));
    }

    let cIdx = 1;
    for (const [id, name] of Object.entries(CONSTELLATION_MAP)) {
        const data = await fetchConstellation(id, cIdx++, name);
        if (data) {
            results.constellations.push(data);
            console.log(`[Crawler] Constellation ${name} synced`);
        }
        await new Promise(r => setTimeout(r, 400));
    }

    console.log('[Crawler] Precision Sync Complete. Total:', results.zodiacs.length + results.constellations.length);
    return results;
}

module.exports = { fetchAllFortune };
