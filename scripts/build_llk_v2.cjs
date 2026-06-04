const fs = require('fs');
let html = fs.readFileSync('lianliankan.html', 'utf8');

// 1. CSS background → bright sky
html = html.replace('background:#2a1642;', 'background:#87CEEB;');

// 2. TYPES → macaron palette
html = html.replace("color:'#E53935', accent:'#B71C1C'", "color:'#FF8A8A', accent:'#E87070'");
html = html.replace("color:'#7C3AED', accent:'#5B21B6'", "color:'#B8A9E8', accent:'#9B88D6'");
html = html.replace("color:'#2563EB', accent:'#1D4ED8'", "color:'#7EC8E3', accent:'#5CAFC9'");
html = html.replace("color:'#EA580C', accent:'#C2410C'", "color:'#FFB87A', accent:'#E89E60'");
html = html.replace("color:'#16A34A', accent:'#15803D'", "color:'#7EDBA6', accent:'#5CC48A'");
html = html.replace("color:'#F59E0B', accent:'#D97706'", "color:'#FFE066', accent:'#E6C84D'");
html = html.replace("color:'#E91E9C', accent:'#C2185B'", "color:'#FF9ECE', accent:'#E680B5'");

// 3. Button click positions
html = html.replace("if(mx>=16&&mx<=186&&my>=400&&my<=440)", "if(mx>=22&&mx<=182&&my>=380&&my<=420)");
html = html.replace("if(mx>=16&&mx<=186&&my>=455&&my<=495)", "if(mx>=22&&mx<=182&&my>=435&&my<=475)");

// 4. Replace buildCache function
const bcStart = html.indexOf('function buildCache(){');
const bcEnd = html.indexOf('setTimeout(buildCache,200);') + 'setTimeout(buildCache,200);'.length;
const newBuildCache = `function buildCache(){
    tileCV.length=0;const S=80;
    for(let i=0;i<TYPES.length;i++){
        const cv=document.createElement('canvas');cv.width=S;cv.height=S;
        const c=cv.getContext('2d'),t=TYPES[i],im=imgs[i];
        const p=3,r=18,w=S-p*2,h=S-p*2;
        c.save();
        c.fillStyle='rgba(0,0,0,.10)';rr(c,p+2,p+4,w,h,r);c.fill();
        const g=c.createRadialGradient(S*.38,S*.32,0,S/2,S/2,S*.58);
        g.addColorStop(0,lighten(t.color,55));g.addColorStop(.65,t.color);g.addColorStop(1,t.accent);
        c.fillStyle=g;rr(c,p,p,w,h,r);c.fill();
        c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=1.8;rr(c,p+1.5,p+1.5,w-3,h-3,r-1);c.stroke();
        c.fillStyle='rgba(255,255,255,.4)';
        c.beginPath();c.ellipse(S*.44,p+h*.19,w*.33,h*.11,-.1,0,Math.PI*2);c.fill();
        c.fillStyle='rgba(255,255,255,.1)';
        c.beginPath();c.ellipse(S*.52,S-p-h*.15,w*.22,h*.06,0,0,Math.PI*2);c.fill();
        c.restore();
        if(im&&im.complete&&im.naturalWidth>0){
            const isz=S*.68;
            const iw=isz,ih=isz*(im.naturalHeight/im.naturalWidth);
            c.drawImage(im,(S-iw)/2,(S-ih)/2,iw,ih);
        }else{
            c.fillStyle='#fff';c.font='bold '+Math.floor(S*.26)+'px "Noto Sans SC",sans-serif';
            c.textAlign='center';c.textBaseline='middle';c.fillText(t.name,S/2,S/2);
        }
        tileCV.push(cv);
    }
    cacheReady=true;
}
setTimeout(buildCache,200);`;
html = html.substring(0, bcStart) + newBuildCache + html.substring(bcEnd);

// 5. Replace entire rendering section
const renderStart = html.indexOf('/* ====== \\u7ed8\\u5236 ====== */') !== -1
    ? html.indexOf('/* ====== \\u7ed8\\u5236 ====== */')
    : html.indexOf('/* ====== \u7ed8\u5236 ====== */');
if (renderStart === -1) {
    console.error('Could not find render section marker');
    process.exit(1);
}
const rafLine = 'requestAnimationFrame(draw);';
const rafIdx = html.indexOf(rafLine, renderStart);
if (rafIdx === -1) {
    console.error('Could not find requestAnimationFrame');
    process.exit(1);
}
const renderEnd = rafIdx + rafLine.length;

const newRender = fs.readFileSync('new_render.js', 'utf8')
    .replace(/^\/\/.*\n/gm, '')  // remove JS comments starting with //
    .replace(/^\s*\n/gm, '');     // remove blank lines

html = html.substring(0, renderStart) + newRender + '\n' + rafLine + html.substring(renderEnd);

fs.writeFileSync('lianliankan.html', html, 'utf8');
console.log('Done! lianliankan.html rebuilt with new park-style UI.');
