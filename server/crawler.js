const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { fetchFujianDraws } = require('./puppeteerCrawler.js');

// 保存合成图的目录
const SCRATCH_IMG_DIR = path.join(__dirname, 'scratch_images');
if (!fs.existsSync(SCRATCH_IMG_DIR)) fs.mkdirSync(SCRATCH_IMG_DIR, { recursive: true });

/**
 * 抓取国家体彩网公益金数据（lottery.gov.cn）
 * 直接请求其背后的 Web API，比 Puppeteer 更稳定
 */
async function fetchNationalWelfare() {
    try {
        const axios = require('axios');
        const res = await axios.get('https://webapi.sporttery.cn/gateway/pwf/getWelfareFundDetailV1.qry?gameIdList=0', {
            timeout: 10000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Referer': 'https://www.lottery.gov.cn/'
            }
        });

        if (res.data && res.data.success && res.data.value) {
            const val = res.data.value;
            const data = {
                date: val.reportDate || '',
                historyAmount: val.historyAmount || '',
                currentYearAmount: val.currentYearAmount || ''
            };
            console.log('[Welfare] 国家体彩 (API):', data);
            return data;
        }
        console.warn('[Welfare] 国家体彩 API 返回异常:', res.data);
        return null;
    } catch (e) {
        console.warn('[Welfare] 国家体彩 API 抓取失败:', e.message);
        return null;
    }
}


/**
 * 抓取福建体彩网公益金数据（fjtc.com.cn）
 * 数据在 .top-right p 标签中，服务端渲染的静态内容
 */
async function fetchFujianWelfare() {
    try {
        const axios = require('axios');
        const cheerio = require('cheerio');
        const res = await axios.get('https://www.fjtc.com.cn/', {
            timeout: 12000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9'
            }
        });
        const $ = cheerio.load(res.data);
        const container = $('.top-right');
        if (!container.length) {
            console.warn('[Welfare] 福建体彩：未找到 .top-right 元素');
            return null;
        }
        const ps = container.find('p');
        // p[0] = 截至日期, p[1] = 累计金额, p[2] = 年度金额
        const date = ps.eq(0).text().trim();
        const totalRaw = ps.eq(1).text().trim();    // "487.06亿元"
        const yearRaw = ps.eq(2).text().trim();     // "8.58亿元"
        console.log('[Welfare] 福建体彩:', { date, totalRaw, yearRaw });
        return { date, totalRaw, yearRaw };
    } catch (e) {
        console.warn('[Welfare] 福建体彩抓取失败:', e.message);
        return null;
    }
}


/**
 * 统一日期格式为 xxxx年x月x日
 * 例如：2026-03-24 -> 2026年3月24日
 */
function formatToChineseDate(dateStr) {
    if (!dateStr) return '实时同步';
    // 移除“截至”等中文字样
    let clean = dateStr.replace(/[截至：:]/g, '').trim();
    
    // 处理 2026-03-24 或 2026/03/24 格式
    if (clean.includes('-') || clean.includes('/')) {
        const parts = clean.split(/[-/]/);
        if (parts.length >= 3) {
            const year = parts[0];
            const month = parseInt(parts[1], 10);
            const day = parseInt(parts[2], 10);
            return `${year}年${month}月${day}日`;
        }
    }
    
    // 如果已经是中文格式但带有前导0（如 2026年03月24日），规范化它
    if (clean.includes('年') && clean.includes('月') && clean.includes('日')) {
        return clean.replace(/(\d{4})年0?(\d{1,2})月0?(\d{1,2})日/, '$1年$2月$3日');
    }

    return clean;
}

/**
 * 主爬虫入口 (由 index.js 调用)
 */
async function runAllCrawlers(historySize = 20) {
    console.log('[Crawler] Running all crawlers...');

    // 并发执行：福建开奖 + 国家公益金 + 福建公益金
    const [fujianDraws, nationalWelfare, fujianWelfare] = await Promise.allSettled([
        fetchFujianDraws(),
        fetchNationalWelfare(),
        fetchFujianWelfare()
    ]).then(results => results.map(r => r.status === 'fulfilled' ? r.value : null));

    // 组装 welfare 结构（分模块：全国 vs 福建）
    const welfare = {
        national: null,
        fujian: null
    };

    if (nationalWelfare) {
        const { date, historyAmount, currentYearAmount } = nationalWelfare;
        welfare.national = [
            { id: 'n_date', title: '数据截止日期', value: formatToChineseDate(date), unit: '', isDate: true },
            { id: 'n_total', title: '中国体育彩票累计筹集公益金', value: (historyAmount || '').replace('亿元', '').trim(), unit: '亿元' },
            { id: 'n_year', title: '2026年度已筹集公益金(全国)', value: (currentYearAmount || '').replace('亿元', '').trim(), unit: '亿元' }
        ];
    }

    if (fujianWelfare) {
        const { date, totalRaw, yearRaw } = fujianWelfare;
        welfare.fujian = [
            { id: 'f_date', title: '数据截止日期', value: formatToChineseDate(date), unit: '', isDate: true },
            { id: 'f_total', title: '福建体彩累计筹集公益金', value: (totalRaw || '').replace('亿元', '').trim(), unit: '亿元' },
            { id: 'f_year', title: '本年度已筹集公益金(福建)', value: (yearRaw || '').replace('亿元', '').trim(), unit: '亿元' }
        ];
    }

    // 整理 draws 数据输出，确保包含 ID、期号、号码、时间（供监控面板显示）
    const draws = (fujianDraws || []).map(d => ({
        id: d.id,
        name: d.name,
        issue: d.issue,
        numbers: d.numbers,
        bonusNumbers: d.bonusNumbers,
        pool: d.pool,
        time: d.time
    }));

    const result = {
        timestamp: new Date().toISOString(),
        status: 'success',
        welfare, // 包含 national 和 fujian
        draws,   // 统计卡片使用此 key
        fujianDraws: draws, // 前端开奖列表展示使用此 key
        puppeteerEnabled: true
    };

    console.log('[Crawler] runAllCrawlers finished. Welfare data summary:', {
        hasNational: !!welfare.national,
        hasFujian: !!welfare.fujian,
        drawCount: draws.length
    });

    return result;
}



/**
 * 用 Puppeteer 将多个图片 URL 拼接成一张图，保存为 JPEG 文件
 * @param {object} browser
 * @param {string[]} parts      图片 URL 数组
 * @param {string}  name        票面名称（用于文件名）
 * @param {string}  direction   'column'（上下/竖向） | 'row'（左右/横向）
 * @param {string}  refUrl      参考图 URL，用于获取真实物理卡片的宽高边框
 */
async function stitchParts(browser, parts, name, direction = 'column', refUrl = '') {
    if (!parts || parts.length === 0) return null;
    if (parts.length === 1) return null;

    const safeId = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_').slice(0, 30) + '_' + Date.now();
    const outputFile = path.join(SCRATCH_IMG_DIR, `${safeId}.jpg`);

    const page = await browser.newPage();
    try {
        const initHtml = `<!DOCTYPE html><html><body style="margin:0;padding:0">
<img id="ref" src="${refUrl || parts[0]}" style="display:none;" crossorigin="anonymous">
<div id="container" style="display:flex; flex-direction:${direction};">
${parts.map((src, i) => `<img id="i${i}" src="${src}" style="display:block; object-fit:fill;" crossorigin="anonymous">`).join('\n')}
</div>
</body></html>`;

        await page.setContent(initHtml, { waitUntil: 'load', timeout: 30000 });

        const dims = await page.evaluate((dir, count, hasRef) => {
            return new Promise(resolve => {
                const ref = document.getElementById('ref');
                const imgs = Array.from({ length: count }, (_, i) => document.getElementById('i' + i));

                const checkAll = () => {
                    if (hasRef && (!ref.complete || !ref.naturalWidth)) return false;
                    return imgs.every(el => el && el.complete && el.naturalWidth > 0);
                };

                const runLayout = () => {
                    let refW = ref.naturalWidth;
                    let refH = ref.naturalHeight;

                    if (!refW || !refH || !hasRef) {
                        // Fallback: Use the natural accumulated size of the parts
                        if (dir === 'row') {
                            refW = imgs.reduce((s, el) => s + el.naturalWidth, 0);
                            refH = Math.max(...imgs.map(el => el.naturalHeight));
                        } else {
                            refH = imgs.reduce((s, el) => s + el.naturalHeight, 0);
                            refW = Math.max(...imgs.map(el => el.naturalWidth));
                        }
                    }

                    if (refW < 10 || refH < 10) {
                        refW = 600; refH = 1200; // Ultimate fallback
                    }

                    const container = document.getElementById('container');
                    container.style.width = refW + 'px';
                    container.style.height = refH + 'px';

                    for (let i = 0; i < count; i++) {
                        const img = imgs[i];
                        if (dir === 'row') {
                            img.style.height = '100%';
                            let ratio = img.naturalWidth / img.naturalHeight;
                            img.style.flex = ratio || 1;
                        } else {
                            img.style.width = '100%';
                            let ratio = img.naturalHeight / img.naturalWidth;
                            img.style.flex = ratio || 1;
                        }
                    }
                    resolve({ w: refW, h: refH });
                };

                if (checkAll()) {
                    runLayout();
                } else {
                    const t = setInterval(() => {
                        if (checkAll()) { clearInterval(t); runLayout(); }
                    }, 200);
                    setTimeout(() => { clearInterval(t); runLayout(); }, 8000); // 8s timeout
                }
            });
        }, direction, parts.length, !!refUrl);

        if (dims.w < 10 || dims.h < 10) {
            console.warn('[ScratchCrawler] Stitch dims too small, skipping');
            return null;
        }

        await page.setViewport({ width: dims.w, height: dims.h });

        // Wait just a bit for browser to apply flexbox layout paints
        await page.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))));
        await new Promise(r => setTimeout(r, 100));

        const el = await page.$('#container');
        await el.screenshot({ path: outputFile, type: 'jpeg', quality: 90 });

        console.log(`[ScratchCrawler] Stitched ${parts.length}p (${direction}, ${dims.w}×${dims.h}) => ${path.basename(outputFile)}`);
        return `/api/scratch-image/${path.basename(outputFile)}`;
    } catch (err) {
        console.error('[ScratchCrawler] Stitch failed:', err.message);
        return null;
    } finally {
        await page.close();
    }
}

/**
 * 爬取单个详情页，从 cpxqV1.dataDetal 提取全部图片数据
 */
async function crawlDetailPage(browser, item, faceValueStr) {
    const detailPage = await browser.newPage();
    try {
        await detailPage.goto(item.detailUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });

        let detailData = null;
        for (let retry = 0; retry < 20; retry++) {
            detailData = await detailPage.evaluate(async () => {
                if (typeof cpxqV1 !== 'undefined' && cpxqV1.dataDetal && cpxqV1.dataDetal.name) {
                    const d = cpxqV1.dataDetal;
                    const fix = src => src && src.startsWith('//') ? 'https:' + src : (src || '');

                    let candidates = [fix(d.backImg)];

                    const partKeys = ['backgroundA', 'backgroundB', 'backgroundC', 'backgroundD', 'backgroundE'];
                    if (d.themes && d.themes.length > 0) {
                        for (const key of partKeys) {
                            if (d.themes[0][key]) {
                                candidates.push(fix(d.themes[0][key]));
                            }
                        }
                    }

                    // 如果确实没有任何图，才抓 productImg 兜底
                    if (candidates.filter(Boolean).length === 0) {
                        candidates.push(fix(d.productImg));
                        if (d.parts) {
                            for (const p of d.parts) candidates.push(fix(p));
                        }
                    }

                    candidates = [...new Set(candidates.filter(Boolean))];

                    const loadImg = (url) => new Promise(resolve => {
                        const img = new Image();
                        img.crossOrigin = "anonymous";
                        let done = false;
                        const finish = (w, h) => {
                            if (done) return;
                            done = true;
                            resolve({ url, w, h, area: w * h });
                        };
                        img.onload = () => finish(img.naturalWidth, img.naturalHeight);
                        img.onerror = () => finish(0, 0);
                        img.src = url;
                        setTimeout(() => finish(0, 0), 4000);
                    });

                    const imgInfos = await Promise.all(candidates.map(url => loadImg(url)));

                    let maxArea = 0;
                    let fullSizeUrl = '';
                    let fullW = 0, fullH = 0;

                    for (const info of imgInfos) {
                        if (info.area > maxArea) {
                            maxArea = info.area;
                            fullSizeUrl = info.url;
                            fullW = info.w;
                            fullH = info.h;
                        }
                    }

                    // 其他图作为拼接用的切片
                    const parts = candidates.filter(url => url !== fullSizeUrl);

                    // 获取切片信息并决定拼接方向
                    const partInfos = imgInfos.filter(info => info.url !== fullSizeUrl);

                    let direction = d.layout === 1 ? 'row' : 'column';
                    if (partInfos.length > 0 && fullW > 0 && fullH > 0) {
                        const p1 = partInfos[0];
                        if (Math.abs(p1.w - fullW) <= 10) {
                            direction = 'column';
                        } else if (Math.abs(p1.h - fullH) <= 10) {
                            direction = 'row';
                        }
                    }

                    return {
                        name: d.name || '',
                        fullSizeUrl: fullSizeUrl || '',
                        parts: parts,
                        layoutDir: direction,
                        intro: d.description || d.introduce || '',
                        maxPrize: d.maxAward ? (d.maxAward / 10000) + '万元' : '',
                        faceValue: d.money || 10
                    };

                }
                return null;
            });
            if (detailData) break;
            await new Promise(r => setTimeout(r, 500));
        }

        const tierNum = parseInt(faceValueStr) || 10;

        if (!detailData || (!detailData.fullSizeUrl && detailData.parts.length === 0)) {
            // 最终回退
            const fallbackUrl = await detailPage.evaluate(() => {
                const imgs = Array.from(document.querySelectorAll('img'));
                const uploadImgs = imgs.filter(img => img.src && img.src.includes('/upload/'));
                let best = '', bestArea = 0;
                for (const img of uploadImgs) {
                    const area = (img.naturalWidth || img.width) * (img.naturalHeight || img.height);
                    if (area > bestArea) { bestArea = area; best = img.src; }
                }
                return best;
            });
            console.warn(`[ScratchCrawler] ✗ ${item.name}: fallback img ${fallbackUrl}`);
            return {
                id: `sc_${item.name || 'untitle'}_${item.tier || tierNum}`,
                name: item.name || '未命名票面',
                tier: item.tier || tierNum,
                url: fallbackUrl || '',
                frontUrl: fallbackUrl || '',
                backUrl: '',
                parts: [],
                intro: item.intro || '',
                maxPrize: item.maxPrize || '',
                type: 'external',
                enabled: false,
                createdAt: new Date().toISOString()
            };
        }

        let scratchFaceUrl = null;
        if (detailData.parts.length > 1) {
            const direction = detailData.layoutDir || 'column';
            // 参考大图（如果需要保持尺寸）可以用 fullSizeUrl
            scratchFaceUrl = await stitchParts(browser, detailData.parts, detailData.name, direction, detailData.fullSizeUrl);
        }

        // 拼接图默认作为封面 (A)，完整尺寸图默认作为背面 (B)
        // 拼接图(scratchFaceUrl)可能拼接失败，降级退回 parts[0]
        const frontUrl = scratchFaceUrl || (detailData.parts[0] || detailData.fullSizeUrl || '');
        const backUrl = detailData.fullSizeUrl || '';

        const label = scratchFaceUrl ? `stitched(${detailData.parts.length}p)` : `single`;
        console.log(`[ScratchCrawler] ✓ ${detailData.name} [${label}]  front:${frontUrl.slice(-18)}  back:${backUrl.slice(-18)}`);

        return {
            id: `sc_${(detailData.name || item.name || 'untitle').trim()}_${detailData.faceValue || item.tier || tierNum}`,
            name: detailData.name || item.name || '未命名票面',
            tier: detailData.faceValue || item.tier || tierNum,
            // 默认展示封面图 A
            url: frontUrl,
            // 备选图 A (拼接图/封面)
            frontUrl: frontUrl,
            // 备选图 B (完整尺寸图/背面)
            backUrl: backUrl,
            // 拼接的直接原图路径
            scratchFaceUrl: scratchFaceUrl || '',
            stitchedUrl: scratchFaceUrl || '',
            parts: detailData.parts,
            intro: detailData.intro || item.intro || '',
            maxPrize: detailData.maxPrize || item.maxPrize || '',
            type: scratchFaceUrl ? 'local-server' : 'external',
            enabled: false,
            createdAt: new Date().toISOString()
        };

    } catch (err) {
        console.error(`[ScratchCrawler] Failed: ${item.detailUrl}`, err.message);
        return null;
    } finally {
        await detailPage.close();
    }
}

/**
 * 爬取指定面值的顶呱刮票面（并发版）
 */
async function crawlScratchCards(faceValueStr) {
    const CONCURRENCY = 4;

    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security',
            '--disable-dev-shm-usage', '--disable-gpu']
    });

    try {
        const page = await browser.newPage();
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        const url = `https://www.lottery.gov.cn/xdgg/sgty/?p=1&m=${encodeURIComponent(faceValueStr)}`;
        console.log(`[ScratchCrawler] Navigating to: ${url}`);

        await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
        await new Promise(r => setTimeout(r, 3000));

        const items = await page.evaluate(() => {
            const results = [];
            const seen = new Set();
            for (const el of document.querySelectorAll('[onclick]')) {
                const onclick = el.getAttribute('onclick') || '';
                const match = onclick.match(/toDetial\(['"](.+?)['"],\s*['"](.+?)['"]\)/);
                if (match) {
                    const id = match[1], name = match[2];
                    if (!seen.has(id)) {
                        seen.add(id);
                        let tier = 10, maxPrize = '', intro = '';
                        let parent = el.parentElement;
                        for (let i = 0; i < 10 && parent; i++) {
                            const text = parent.innerText || '';
                            const faceMatch = text.match(/面值\s*[：:]\s*(\d+)/);
                            const prizeMatch = text.match(/最高奖金\s*[：:]\s*([^\n]+)/);
                            if (faceMatch) tier = parseInt(faceMatch[1]);
                            if (prizeMatch) maxPrize = prizeMatch[1].trim();
                            parent = parent.parentElement;
                        }
                        results.push({
                            id, name, tier, maxPrize, intro,
                            detailUrl: `https://www.lottery.gov.cn/xdgg/cpxq/?id=${id}&c=2`
                        });
                    }
                }
            }
            return results;
        });

        await page.close();
        console.log(`[ScratchCrawler] Found ${items.length} unique items for ${faceValueStr}`);

        // 并发抓取，每批 CONCURRENCY 个
        const results = [];
        const allItems = items.slice(0, 20);
        for (let i = 0; i < allItems.length; i += CONCURRENCY) {
            const batch = allItems.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(
                batch.map(item => crawlDetailPage(browser, item, faceValueStr))
            );
            for (const r of batchResults) {
                if (r) results.push(r);
            }
        }

        return results;
    } finally {
        await browser.close();
    }
}

module.exports = { runAllCrawlers, crawlScratchCards, stitchParts, SCRATCH_IMG_DIR };
