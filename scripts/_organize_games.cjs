const fs = require('fs');
const path = require('path');

// ========== 连连看 ==========
const llkDir = 'e:/CJDLT/games/lianliankan';
fs.mkdirSync(llkDir, { recursive: true });
let llkHtml = fs.readFileSync('e:/CJDLT/lianliankan.html', 'utf8');
llkHtml = llkHtml.replace(/'ChatGPT Image 2026年4月30日 14_02_36\.png'/g, "'bg.png'");
llkHtml = llkHtml.replace(/'image\.png'/g, "'lexiaoxing.png'");
llkHtml = llkHtml.replace(/'连连看素材\//g, "'");
fs.writeFileSync(path.join(llkDir, 'index.html'), llkHtml);

fs.copyFileSync('e:/CJDLT/ChatGPT Image 2026年4月30日 14_02_36.png', path.join(llkDir, 'bg.png'));
fs.copyFileSync('e:/CJDLT/lexiaoxing.png', path.join(llkDir, 'lexiaoxing.png'));

const llkAssets = fs.readdirSync('e:/CJDLT/连连看素材');
for (const f of llkAssets) {
    fs.copyFileSync(`e:/CJDLT/连连看素材/${f}`, path.join(llkDir, f));
}
console.log('lianliankan: OK, files:', fs.readdirSync(llkDir).length);

// ========== 消消乐 ==========
const xxlDir = 'e:/CJDLT/games/xiaoxiaole';
fs.mkdirSync(xxlDir, { recursive: true });
fs.copyFileSync('e:/CJDLT/xiaoxiaole.html', path.join(xxlDir, 'index.html'));

const xxlAssets = [
    '橙色圆形.png', '红色爱心.png', '紫色三角形.png', '绿色五边形.png',
    '黄色五角星.png', '蓝色五角星.png', '乐小星棋子.png', '消消乐背景.png',
    '道具锤子.png', '道具交换.png', '道具魔法.png', '道具刷新.png',
    '音量开.png', '音量关.png'
];
for (const f of xxlAssets) {
    fs.copyFileSync(`e:/CJDLT/${f}`, path.join(xxlDir, f));
}
console.log('xiaoxiaole: OK, files:', fs.readdirSync(xxlDir).length);

// ========== 小鸟 ==========
const birdDir = 'e:/CJDLT/games/flappy-bird';
fs.mkdirSync(birdDir, { recursive: true });
let birdHtml = fs.readFileSync('e:/CJDLT/flappy-bird.html', 'utf8');
birdHtml = birdHtml.replace(/img\.src = '小鸟素材\/' \+ f;/g, "img.src = f;");
birdHtml = birdHtml.replace(/img\.src = '小鸟海报\/' \+ f;/g, "img.src = f;");
birdHtml = birdHtml.replace(/img\.src = '管道\/' \+ f;/g, "img.src = f;");
fs.writeFileSync(path.join(birdDir, 'index.html'), birdHtml);

fs.copyFileSync('e:/CJDLT/乐小星小鸟版.png', path.join(birdDir, '乐小星小鸟版.png'));
fs.copyFileSync('e:/CJDLT/小鸟背景.png', path.join(birdDir, '小鸟背景.png'));

const birdAssets = fs.readdirSync('e:/CJDLT/小鸟素材');
for (const f of birdAssets) {
    fs.copyFileSync(`e:/CJDLT/小鸟素材/${f}`, path.join(birdDir, f));
}
const posterAssets = fs.readdirSync('e:/CJDLT/小鸟海报');
for (const f of posterAssets) {
    fs.copyFileSync(`e:/CJDLT/小鸟海报/${f}`, path.join(birdDir, f));
}
const pipeAssets = fs.readdirSync('e:/CJDLT/管道');
for (const f of pipeAssets) {
    fs.copyFileSync(`e:/CJDLT/管道/${f}`, path.join(birdDir, f));
}
console.log('flappy-bird: OK, files:', fs.readdirSync(birdDir).length);

// ========== 验证路径替换 ==========
const llkNew = fs.readFileSync(path.join(llkDir, 'index.html'), 'utf8');
console.log('lianliankan bg path:', llkNew.includes("'bg.png'") ? 'OK' : 'MISS');
console.log('lianliankan lexiaoxing path:', llkNew.includes("'lexiaoxing.png'") ? 'OK' : 'MISS');
console.log('lianliankan 连连看素材:', !llkNew.includes("连连看素材") ? 'CLEAN' : 'STILL HAS PREFIX');

const birdNew = fs.readFileSync(path.join(birdDir, 'index.html'), 'utf8');
console.log('flappy-bird 小鸟素材:', !birdNew.includes("小鸟素材/") ? 'CLEAN' : 'STILL HAS PREFIX');
console.log('flappy-bird 小鸟海报:', !birdNew.includes("小鸟海报/") ? 'CLEAN' : 'STILL HAS PREFIX');
console.log('flappy-bird 管道:', !birdNew.includes("管道/") ? 'CLEAN' : 'STILL HAS PREFIX');
