/**
 * server/puppeteerCrawler.js
 *
 * Fujian Province lottery data crawler using Puppeteer.
 * -------------------------------------------------------
 * TO REMOVE: Simply delete this file. crawler.js will automatically
 * detect its absence and fall back to static mock data.
 * No other code changes needed.
 */

const puppeteer = require('puppeteer');

// --- Fujian Game Config ---
const FUJIAN_GAMES = [
    { type: 'dlt', name: '超级大乐透', days: [1, 3, 6], time: '一、三、六 21:25', province: '全国' },
    { type: 'pls', name: '排列3', days: [0, 1, 2, 3, 4, 5, 6], time: '每天 21:25', province: '全国' },
    { type: 'plw', name: '排列5', days: [0, 1, 2, 3, 4, 5, 6], time: '每天 21:25', province: '全国' },
    { type: 'qxc', name: '7星彩', days: [0, 2, 5], time: '二、五、日 21:25', province: '全国' },
    { type: 'fj367', name: '36选7', days: [0, 2, 4], time: '一、三、五 21:15', province: '福建' },
    { type: 'fj317', name: '31选7', days: [1, 3, 5], time: '二、四、六 21:15', province: '福建' },
    { type: 'fj317fj', name: '31选7附加', days: [1, 3, 5], time: '二、四、六 21:25', province: '福建' },
    { type: 'fj225', name: '22选5', days: [0, 1, 2, 3, 4, 5, 6], time: '每天 21:15', province: '福建' },
];

function makeFallback(game) {
    return {
        id: game.type,
        name: game.name,
        province: game.province,
        time: game.time,
        days: game.days,
        issue: '--',
        numbers: [],
        bonusNumbers: [],
        pool: '--',
        drawDate: '',
        source: 'fallback',
    };
}

function parseGameData(raw, game) {
    if (!raw || raw.code !== 0 || !raw.data) {
        return null;
    }

    // The data might be an array or an object containing a list. Let's handle both.
    let latest;
    if (Array.isArray(raw.data) && raw.data.length > 0) {
        latest = raw.data[0];
    } else if (raw.data.list && Array.isArray(raw.data.list) && raw.data.list.length > 0) {
        latest = raw.data.list[0];
    } else if (typeof raw.data === 'object') {
        latest = raw.data;
    } else {
        return null;
    }
    const rawResult = latest.result || latest.winNumber || latest.win_number || latest.lotteryDrawResult || '';
    const plusIdx = rawResult.indexOf('+');
    let mainNums = [];
    let bonusNums = [];

    if (plusIdx !== -1) {
        mainNums = rawResult.slice(0, plusIdx).trim().split(/\s+/).filter(Boolean);
        bonusNums = rawResult.slice(plusIdx + 1).trim().split(/\s+/).filter(Boolean);
    } else {
        mainNums = rawResult.trim().split(/\s+/).filter(Boolean);
        // Extract bonus number for specific games that don't use '+'
        if ((game.type === 'fj367' || game.type === 'fj317' || game.type === 'fj317fj') && mainNums.length === 8) {
            bonusNums = [mainNums.pop()];
        }
    }

    // Use poolBalanceAfterdraw which matches the website's '奖池奖金' column (after-draw balance).
    // poolBalance = prize pool BEFORE draw; poolBalanceAfterdraw = AFTER draw (what the site shows).
    let pool = latest.poolBalanceAfterdraw || latest.pool_balance || latest.poolBalance || latest.poolAmount || '--';
    // The API already returns formatted strings like "761,949,362.33" — use them as-is.

    return {
        id: game.type,
        name: game.name,
        province: game.province,
        time: game.time,
        days: game.days,
        issue: `${latest.number || latest.issue || latest.qishu || latest.lotteryDrawNum || ''}期`,
        numbers: mainNums,
        bonusNumbers: bonusNums,
        pool,
        drawDate: latest.draw_date || latest.lotteryDrawTime || latest.drawDate || latest.openTime || '',
        source: 'fjtc',
    };
}

async function fetchFujianDraws() {
    let browser;
    const results = [];

    try {
        console.log('[PuppeteerCrawler] Launching browser (Direct Connection)...');
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
            ],
        });

        const page = await browser.newPage();

        // Capture all intercepted JSON responses by type passively
        const captured = {};
        page.on('response', async (response) => {
            const url = response.url();
            if (url.includes('data_api/lottery') && url.includes('type=')) {
                const match = url.match(/type=([^&]+)/);
                const type = match ? match[1] : null;
                if (type) {
                    try {
                        const json = await response.json();
                        captured[type] = json;
                    } catch (e) { }
                }
            }
        });

        await page.setUserAgent(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        );

        // Navigate to the results page to trigger initial XHRs naturally
        console.log('[PuppeteerCrawler] Navigating to Fujian draw results page...');
        try {
            await page.goto('https://www.fjtc.com.cn/node_309522.htm?gameType=fj367', {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            // Wait a bit for the internal page JS to fire XHRs
            await new Promise(r => setTimeout(r, 3000));
        } catch (e) {
            console.warn('[PuppeteerCrawler] Navigation issue:', e.message.slice(0, 80));
        }

        // Trigger any missing XHR requests for all game types via page evaluate
        const gameTypes = FUJIAN_GAMES.map(g => g.type);
        await page.evaluate(async (types) => {
            const BASE = 'https://www.fjtc.com.cn/data_api/lottery';
            for (const t of types) {
                try {
                    // Force a fresh fetch if not already captured by the page
                    await fetch(`${BASE}?type=${t}&page=1&limit=1`, {
                        headers: { 'X-Requested-With': 'XMLHttpRequest' }
                    });
                } catch (e) { }
            }
        }, gameTypes).catch(() => { });

        // Final wait for XHRs to settle
        await new Promise(r => setTimeout(r, 6000));

        // Build results from captured responses
        for (const game of FUJIAN_GAMES) {
            const raw = captured[game.type];
            if (raw) {
                const parsed = parseGameData(raw, game);
                if (parsed) {
                    console.log(`[PuppeteerCrawler] ✅ ${game.name}: ${parsed.issue} | ${parsed.numbers.join(' ')}`);
                    results.push(parsed);
                } else {
                    console.warn(`[PuppeteerCrawler] ⚠️ ${game.name}: empty/invalid data`);
                    results.push(makeFallback(game));
                }
            } else {
                console.warn(`[PuppeteerCrawler] ⚠️ ${game.name}: no response intercepted`);
                results.push(makeFallback(game));
            }
        }

    } catch (err) {
        console.error('[PuppeteerCrawler] Fatal error:', err.message);
        return FUJIAN_GAMES.map(makeFallback);
    } finally {
        if (browser) {
            try { await browser.close(); } catch (e) { }
        }
        const ok = results.filter(r => r.source === 'fjtc').length;
        console.log(`[PuppeteerCrawler] Done. ${ok}/${FUJIAN_GAMES.length} games captured via fjtc.`);
    }

    return results;
}

module.exports = { fetchFujianDraws, FUJIAN_GAMES };
