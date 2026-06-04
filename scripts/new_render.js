// This file contains the new rendering code for lianliankan
// It will be inserted by the build script

/* ====== 绘制 ====== */
let _clouds=[],_bals=[],_stars=[],_cityH=[],_bgOk=false;
function initBg(){
    _clouds=[];for(let i=0;i<7;i++)_clouds.push({x:Math.random()*DW,y:22+Math.random()*105,w:55+Math.random()*85,sp:.06+Math.random()*.1});
    const bc=['#FF8A8A','#7EC8E3','#FFE066','#B8A9E8','#7EDBA6'];
    _bals=[];for(let i=0;i<5;i++)_bals.push({x:55+Math.random()*(DW-110),y:35+Math.random()*150,col:bc[i],ph:Math.random()*6.28});
    _stars=[];for(let i=0;i<25;i++)_stars.push({x:Math.random()*DW,y:Math.random()*DH*.55,sz:1+Math.random()*2.5,ph:Math.random()*6.28});
    _cityH=[];for(let i=0;i<28;i++)_cityH.push(10+Math.random()*50);
    _bgOk=true;
}
function drawCloud(x,y,w){
    const h=w*.38;ctx.beginPath();
    ctx.arc(x,y,h*.5,0,Math.PI*2);ctx.arc(x+w*.25,y-h*.28,h*.6,0,Math.PI*2);
    ctx.arc(x+w*.55,y-h*.15,h*.5,0,Math.PI*2);ctx.arc(x+w*.8,y+h*.05,h*.4,0,Math.PI*2);
    ctx.arc(x+w*.4,y+h*.18,h*.45,0,Math.PI*2);ctx.fill();
}
function drawBalloon(x,y,col){
    ctx.fillStyle=col;ctx.beginPath();ctx.ellipse(x,y,10,14,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.ellipse(x-3,y-5,3,5,-.3,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.1)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x,y+14);ctx.quadraticCurveTo(x+3,y+26,x-2,y+38);ctx.stroke();
}
function drawStar4(x,y,r){
    ctx.beginPath();for(let i=0;i<8;i++){const a=i*Math.PI/4-Math.PI/8,d=i%2===0?r:r*.35;i===0?ctx.moveTo(x+Math.cos(a)*d,y+Math.sin(a)*d):ctx.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}ctx.closePath();ctx.fill();
}

function drawBg(){
    if(!_bgOk)initBg();const t=Date.now()/1000;
    // 蓝天
    const sky=ctx.createLinearGradient(0,0,0,DH);
    sky.addColorStop(0,'#5CB8FF');sky.addColorStop(.25,'#7ECBFF');sky.addColorStop(.5,'#ADE0FF');sky.addColorStop(.7,'#CCF0FF');sky.addColorStop(1,'#E0F7FF');
    ctx.fillStyle=sky;ctx.fillRect(0,0,DW,DH);
    // 彩虹
    ctx.save();ctx.globalAlpha=.16;
    const rc=['#FF8A8A','#FFB87A','#FFE066','#7EDBA6','#7EC8E3','#B8A9E8'];
    for(let i=0;i<rc.length;i++){ctx.strokeStyle=rc[i];ctx.lineWidth=8;ctx.beginPath();ctx.arc(DW*.83,DH*1.0,240+i*10,Math.PI*.92,Math.PI*1.52);ctx.stroke();}
    ctx.restore();
    // 白云
    ctx.fillStyle='rgba(255,255,255,.8)';
    for(const c of _clouds){c.x+=c.sp;if(c.x>DW+c.w)c.x=-c.w;drawCloud(c.x,c.y,c.w);}
    // 远景城市剪影
    ctx.fillStyle='rgba(170,195,220,.18)';
    const cw=DW/_cityH.length;
    for(let i=0;i<_cityH.length;i++){rr(ctx,i*cw+1,DH*.63-_cityH[i],cw-2,_cityH[i]+8,2);ctx.fill();}
    // 草地丘陵
    const grass=ctx.createLinearGradient(0,DH*.6,0,DH);
    grass.addColorStop(0,'#8BC34A');grass.addColorStop(.12,'#7CB342');grass.addColorStop(.45,'#6DA832');grass.addColorStop(1,'#5E9628');
    ctx.fillStyle=grass;
    ctx.beginPath();ctx.moveTo(0,DH*.67);
    ctx.quadraticCurveTo(DW*.18,DH*.61,DW*.42,DH*.645);
    ctx.quadraticCurveTo(DW*.68,DH*.675,DW,DH*.635);
    ctx.lineTo(DW,DH);ctx.lineTo(0,DH);ctx.fill();
    // 草地光泽
    ctx.fillStyle='rgba(255,255,255,.06)';
    ctx.beginPath();ctx.moveTo(0,DH*.665);
    ctx.quadraticCurveTo(DW*.25,DH*.6,DW*.5,DH*.64);
    ctx.quadraticCurveTo(DW*.75,DH*.67,DW,DH*.63);
    ctx.lineTo(DW,DH*.65);ctx.quadraticCurveTo(DW*.75,DH*.69,DW*.5,DH*.66);
    ctx.quadraticCurveTo(DW*.25,DH*.62,0,DH*.68);ctx.fill();
    // 小路
    ctx.fillStyle='rgba(200,180,140,.12)';
    ctx.beginPath();ctx.moveTo(DW*.48,DH*.66);ctx.quadraticCurveTo(DW*.46,DH*.8,DW*.44,DH);
    ctx.lineTo(DW*.52,DH);ctx.quadraticCurveTo(DW*.54,DH*.8,DW*.52,DH*.66);ctx.fill();
    // 气球
    for(const b of _bals){drawBalloon(b.x,b.y+Math.sin(t*.6+b.ph)*9,b.col);}
    // 漂浮星星
    for(const s of _stars){ctx.globalAlpha=.2+.3*Math.sin(t*1.8+s.ph);ctx.fillStyle='#fff';drawStar4(s.x,s.y,s.sz);}
    ctx.globalAlpha=1;
    // 浮动光斑
    ctx.globalAlpha=.035;
    const lc=['#FFE066','#FF9ECE','#7EC8E3','#B8A9E8','#7EDBA6'];
    for(let i=0;i<8;i++){ctx.fillStyle=lc[i%lc.length];ctx.beginPath();ctx.arc(100+i*110,DH*.25+Math.sin(t*.4+i)*35,18+i*4,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
}

function drawTile(r,c,hl,isH){
    const type=board[r][c];if(!type)return;
    if(!cacheReady)buildCache();
    let tx=bx+c*tw,ty=by+r*th;
    const isShk=shakeT.some(s=>s.r===r&&s.c===c);
    if(isShk){tx+=(Math.random()-.5)*4;ty+=(Math.random()-.5)*4;}
    if(cacheReady&&tileCV[type-1])ctx.drawImage(tileCV[type-1],tx,ty,tw,th);
    if(hl||isH){
        ctx.save();
        ctx.strokeStyle=hl?'#FFD700':'#7EDBA6';ctx.lineWidth=hl?3:2.5;
        ctx.shadowColor=hl?'#FFD700':'#7EDBA6';ctx.shadowBlur=16;
        rr(ctx,tx+2,ty+2,tw-4,th-4,16);ctx.stroke();
        ctx.restore();
    }
}

function drawBoard(){
    ctx.fillStyle='rgba(255,255,255,.15)';
    rr(ctx,bx-6,by-6,(COLS+2)*tw+12,(ROWS+2)*th+12,18);ctx.fill();
    for(let r=1;r<=ROWS;r++)for(let c=1;c<=COLS;c++){
        if(!board[r][c])continue;
        const hl=sel&&sel.r===r&&sel.c===c;
        const isH=hintP&&hintT>0&&((r===hintP.r1&&c===hintP.c1)||(r===hintP.r2&&c===hintP.c2));
        drawTile(r,c,hl,isH);
    }
}

function drawLine(){
    if(!linePath||lineT<=0){linePath=null;return;}lineT--;
    ctx.save();ctx.strokeStyle='#FFD700';ctx.lineWidth=3;ctx.shadowColor='#FFD700';ctx.shadowBlur=12;
    ctx.setLineDash([6,4]);ctx.beginPath();
    for(let i=0;i<linePath.length;i++){const px=bx+linePath[i].c*tw+tw/2,py=by+linePath[i].r*th+th/2;i===0?ctx.moveTo(px,py):ctx.lineTo(px,py);}
    ctx.stroke();ctx.setLineDash([]);ctx.restore();
}

function drawPanel(){
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.08)';ctx.shadowBlur=20;ctx.shadowOffsetY=4;
    const pg=ctx.createLinearGradient(12,12,12,DH-24);
    pg.addColorStop(0,'rgba(255,255,255,.82)');pg.addColorStop(1,'rgba(220,238,255,.72)');
    ctx.fillStyle=pg;rr(ctx,12,12,180,DH-24,20);ctx.fill();
    ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1.5;rr(ctx,12,12,180,DH-24,20);ctx.stroke();
    ctx.restore();

    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle='#4088CC';ctx.font='900 24px "Noto Sans SC",sans-serif';
    ctx.fillText('\u4f53\u5f69\u8fde\u8fde\u770b',102,42);
    ctx.strokeStyle='rgba(65,136,204,.15)';ctx.lineWidth=1;
    ctx.beginPath();ctx.moveTo(28,60);ctx.lineTo(176,60);ctx.stroke();

    ctx.fillStyle='rgba(65,130,195,.45)';ctx.font='12px "Noto Sans SC",sans-serif';ctx.fillText('\u5f97\u5206',102,82);
    ctx.fillStyle='#333';ctx.font='bold 32px "Noto Sans SC",sans-serif';ctx.fillText(score,102,112);

    const tc=timeLeft<=10?'#FF6B6B':timeLeft<=30?'#FFB347':'#4088CC';
    ctx.fillStyle='rgba(65,130,195,.45)';ctx.font='12px "Noto Sans SC",sans-serif';ctx.fillText('\u5269\u4f59\u65f6\u95f4',102,148);
    ctx.fillStyle=tc;ctx.font='bold 38px "Noto Sans SC",sans-serif';ctx.fillText(timeLeft+'s',102,184);

    ctx.fillStyle='rgba(65,130,195,.45)';ctx.font='12px "Noto Sans SC",sans-serif';ctx.fillText('\u5269\u4f59\u914d\u5bf9',102,224);
    ctx.fillStyle='#333';ctx.font='bold 20px "Noto Sans SC",sans-serif';ctx.fillText(remP+' / '+totP,102,250);
    ctx.fillStyle='rgba(0,0,0,.06)';rr(ctx,24,268,156,8,4);ctx.fill();
    const pct=1-remP/Math.max(totP,1);
    const pg2=ctx.createLinearGradient(24,0,180,0);pg2.addColorStop(0,'#7EC8E3');pg2.addColorStop(1,'#7EDBA6');
    ctx.fillStyle=pg2;rr(ctx,24,268,156*pct,8,4);ctx.fill();

    if(comboT>0&&combo>1){ctx.fillStyle='#FFB347';ctx.font='bold 18px "Noto Sans SC",sans-serif';ctx.fillText('\u8fde\u51fb x'+combo+'!',102,302);}

    drawBtn(22,380,160,40,'\u63d0\u793a','#FFB347','#F09A30');
    drawBtn(22,435,160,40,'\u91cd\u6392','#7EC8E3','#5CAFC9');

    ctx.fillStyle='rgba(65,130,195,.2)';ctx.font='11px "Noto Sans SC",sans-serif';
    ctx.fillText('\u4e2d\u56fd\u4f53\u80b2\u5f69\u7968',102,DH-28);
}

function drawBtn(x,y,w,h,text,c1,c2){
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.12)';ctx.shadowBlur=8;ctx.shadowOffsetY=3;
    const g=ctx.createLinearGradient(x,y,x,y+h);g.addColorStop(0,c1);g.addColorStop(1,c2);
    ctx.fillStyle=g;rr(ctx,x,y,w,h,h/2);ctx.fill();
    ctx.shadowBlur=0;
    ctx.fillStyle='rgba(255,255,255,.35)';
    rr(ctx,x+4,y+2,w-8,h*.38,h/2);ctx.fill();
    ctx.restore();
    ctx.fillStyle='#fff';ctx.font='bold 15px "Noto Sans SC",sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,x+w/2,y+h/2+1);
}

function drawReady(){
    drawBg();
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.08)';ctx.shadowBlur=24;ctx.shadowOffsetY=6;
    ctx.fillStyle='rgba(255,255,255,.85)';rr(ctx,DW/2-235,DH/2-130,470,260,24);ctx.fill();
    ctx.restore();
    ctx.strokeStyle='rgba(255,255,255,.75)';ctx.lineWidth=1.5;rr(ctx,DW/2-235,DH/2-130,470,260,24);ctx.stroke();
    ctx.fillStyle='#3580C0';ctx.font='900 48px "Noto Sans SC",sans-serif';
    ctx.fillText('\u4f53\u5f69\u8fde\u8fde\u770b',DW/2,DH/2-68);
    ctx.fillStyle='rgba(65,130,195,.5)';ctx.font='16px "Noto Sans SC",sans-serif';
    ctx.fillText('\u5339\u914d\u76f8\u540c\u7684\u4f53\u5f69\u56fe\u6807 \u00b7 \u8fde\u7ebf\u4e0d\u8d85\u8fc7\u4e24\u4e2a\u62d0\u89d2',DW/2,DH/2-18);
    for(let i=0;i<TYPES.length;i++){
        const px=DW/2-(TYPES.length-1)*32+i*64;
        ctx.fillStyle=TYPES[i].color;rr(ctx,px-18,DH/2+16,36,36,10);ctx.fill();
        if(cacheReady&&tileCV[i])ctx.drawImage(tileCV[i],px-16,DH/2+18,32,32);
    }
    const pulse=.45+Math.sin(Date.now()/400)*.4;
    ctx.fillStyle='rgba(53,128,192,'+pulse+')';ctx.font='20px "Noto Sans SC",sans-serif';
    ctx.fillText('\u70b9\u51fb\u5c4f\u5e55\u5f00\u59cb\u6e38\u620f',DW/2,DH/2+92);
    ctx.fillStyle='rgba(65,130,195,.18)';ctx.font='12px "Noto Sans SC",sans-serif';
    ctx.fillText('\u4e2d\u56fd\u4f53\u80b2\u5f69\u7968 \u00b7 \u516c\u76ca\u4f53\u5f69 \u4e50\u5584\u4eba\u751f',DW/2,DH-25);
}

function drawResult(){
    ctx.fillStyle='rgba(0,0,0,.28)';ctx.fillRect(0,0,DW,DH);
    const px=DW/2-180,py=DH/2-130,pw=360,ph=260;
    ctx.save();
    ctx.shadowColor='rgba(0,0,0,.1)';ctx.shadowBlur=24;ctx.shadowOffsetY=6;
    ctx.fillStyle='rgba(255,255,255,.92)';rr(ctx,px,py,pw,ph,20);ctx.fill();
    ctx.restore();
    ctx.strokeStyle=state==='win'?'#7EDBA6':'#FF8A8A';ctx.lineWidth=2;rr(ctx,px,py,pw,ph,20);ctx.stroke();
    ctx.textAlign='center';ctx.textBaseline='middle';
    if(state==='win'){
        ctx.fillStyle='#3580C0';ctx.font='bold 36px "Noto Sans SC",sans-serif';
        ctx.fillText('\u606d\u559c\u901a\u5173!',DW/2,py+55);
        ctx.fillStyle='#333';ctx.font='bold 24px "Noto Sans SC",sans-serif';ctx.fillText('\u6700\u7ec8\u5f97\u5206: '+score,DW/2,py+110);
        ctx.fillStyle='rgba(65,130,195,.5)';ctx.font='14px "Noto Sans SC",sans-serif';ctx.fillText('(\u542b\u65f6\u95f4\u5956\u52b1 '+timeLeft*5+' \u5206)',DW/2,py+145);
    }else{
        ctx.fillStyle='#FF6B6B';ctx.font='bold 36px "Noto Sans SC",sans-serif';ctx.fillText('\u65f6\u95f4\u5230!',DW/2,py+55);
        ctx.fillStyle='#333';ctx.font='bold 24px "Noto Sans SC",sans-serif';ctx.fillText('\u5f97\u5206: '+score,DW/2,py+110);
    }
    ctx.fillStyle='rgba(65,130,195,.4)';ctx.font='14px "Noto Sans SC",sans-serif';ctx.fillText('\u70b9\u51fb\u5c4f\u5e55\u8fd4\u56de',DW/2,py+210);
}

function drawParticles(){
    for(let i=particles.length-1;i>=0;i--){const p=particles[i];p.x+=p.vx;p.y+=p.vy;p.vy+=.08;p.life-=p.dec;
        if(p.life<=0){particles.splice(i,1);continue;}
        ctx.globalAlpha=p.life;ctx.fillStyle=p.col;ctx.beginPath();ctx.arc(p.x,p.y,p.sz*p.life,0,Math.PI*2);ctx.fill();}
    ctx.globalAlpha=1;
}

function draw(){
    ctx.save();ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle='#87CEEB';ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.translate(ox,oy);ctx.scale(sc,sc);
    if(state==='ready')drawReady();
    else{drawBg();drawBoard();drawLine();drawPanel();drawParticles();if(state==='win'||state==='lose')drawResult();}
    ctx.restore();
    if(comboT>0)comboT--;if(comboT<=0)combo=0;if(hintT>0)hintT--;
    requestAnimationFrame(draw);
}

function rr(c,x,y,w,h,r){c.beginPath();c.moveTo(x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h-r);c.quadraticCurveTo(x+w,y+h,x+w-r,y+h);c.lineTo(x+r,y+h);c.quadraticCurveTo(x,y+h,x,y+h-r);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.closePath();}
function lighten(hex,p){const n=parseInt(hex.replace('#',''),16);return'rgb('+Math.min(255,(n>>16)+p)+','+Math.min(255,((n>>8)&0xff)+p)+','+Math.min(255,(n&0xff)+p)+')';}
