const fs = require('fs');
const path = require('path');

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>体彩消消乐</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap');

*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;font-family:"PingFang SC","Microsoft YaHei","Noto Sans SC",sans-serif;touch-action:none;user-select:none}

body{
  background: linear-gradient(135deg, #AEE1FF 0%, #C9E4FF 30%, #FFE0F0 70%, #FFD6E7 100%);
  display:flex;align-items:center;justify-content:center;
  min-height:100vh;
}

/* ===== 云朵动画 ===== */
.clouds{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;overflow:hidden;z-index:0}
.cloud{position:absolute;background:rgba(255,255,255,.45);border-radius:50%}
.cloud::before,.cloud::after{content:'';position:absolute;background:inherit;border-radius:50%}
.c1{width:120px;height:50px;top:8%;left:-150px;animation:drift 35s linear infinite}
.c1::before{width:60px;height:60px;top:-30px;left:20px}
.c1::after{width:80px;height:55px;top:-25px;left:50px}
.c2{width:100px;height:40px;top:15%;left:-120px;animation:drift 45s linear infinite 8s}
.c2::before{width:50px;height:50px;top:-25px;left:15px}
.c2::after{width:65px;height:45px;top:-20px;left:40px}
.c3{width:90px;height:35px;top:5%;left:-100px;animation:drift 50s linear infinite 15s}
.c3::before{width:45px;height:45px;top:-22px;left:12px}
.c3::after{width:55px;height:38px;top:-18px;left:35px}
.c4{width:80px;height:32px;top:22%;left:-100px;animation:drift 40s linear infinite 22s}
.c4::before{width:40px;height:40px;top:-20px;left:10px}
.c4::after{width:50px;height:35px;top:-16px;left:30px}
@keyframes drift{0%{transform:translateX(0)}100%{transform:translateX(calc(100vw + 300px))}}

/* ===== 彩虹 ===== */
.rainbow{position:fixed;top:-60px;right:40px;width:200px;height:100px;border-radius:100px 100px 0 0;
  background:conic-gradient(from 180deg at 50% 100%,rgba(255,0,0,.08),rgba(255,165,0,.08),rgba(255,255,0,.08),rgba(0,128,0,.08),rgba(0,0,255,.08),rgba(75,0,130,.08),rgba(238,130,238,.08),transparent 70%);
  z-index:0;pointer-events:none}

/* ===== 主容器 ===== */
.game-wrap{
  position:relative;z-index:1;
  width:min(96vw,1280px);height:min(90vh,720px);
  display:flex;align-items:stretch;gap:16px;
  padding:12px;
}

/* ===== 左侧角色区 ===== */
.left-panel{
  width:20%;min-width:200px;
  display:flex;flex-direction:column;align-items:center;
  justify-content:space-between;
  padding:16px 8px;
}

.logo-area{text-align:center;margin-bottom:8px}
.logo-area .logo-icon{font-size:28px;margin-bottom:4px}
.logo-area .logo-cn{font-size:14px;font-weight:900;background:linear-gradient(90deg,#E53935,#FF6F00);-webkit-background-clip:text;-webkit-text-fill-color:transparent;letter-spacing:2px}
.logo-area .logo-en{font-size:8px;color:#999;letter-spacing:1px;margin-top:2px}

/* 乐小星IP */
.lxx-area{
  position:relative;display:flex;flex-direction:column;align-items:center;flex:1;justify-content:center;
}
.lxx-img{
  width:120px;height:120px;
  filter:drop-shadow(0 6px 12px rgba(0,0,0,.12));
  animation:float 3s ease-in-out infinite;
}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
.lxx-base{
  width:90px;height:22px;margin-top:-8px;
  background:radial-gradient(ellipse,#FFB6C1 0%,#FF91A4 60%,transparent 100%);
  border-radius:50%;opacity:.6;
}
.speech-bubble{
  position:relative;background:rgba(255,255,255,.92);
  border-radius:16px;padding:8px 14px;margin-top:12px;
  font-size:13px;font-weight:700;color:#E056A0;
  box-shadow:0 3px 12px rgba(0,0,0,.08);
  max-width:160px;text-align:center;
}
.speech-bubble::after{
  content:'';position:absolute;top:-8px;left:50%;transform:translateX(-50%);
  border:8px solid transparent;border-bottom-color:rgba(255,255,255,.92);border-top:none;
}

.balloon{
  position:absolute;left:-10px;top:30px;
  width:60px;height:75px;
  background:radial-gradient(circle at 40% 30%,#FFE0F0,#FFB6C1);
  border-radius:50% 50% 50% 50% / 45% 45% 55% 55%;
  box-shadow:inset -3px -3px 8px rgba(0,0,0,.06),0 2px 8px rgba(255,182,193,.3);
  display:flex;align-items:center;justify-content:center;
  font-size:8px;font-weight:700;color:#E056A0;text-align:center;line-height:1.2;
  animation:float 4s ease-in-out infinite 1s;
}
.balloon::after{content:'';position:absolute;bottom:-16px;left:50%;width:1px;height:16px;background:#ccc}

.lxx-tag{
  background:linear-gradient(135deg,#FFB6C1,#FF91A4);
  color:#fff;font-size:13px;font-weight:700;
  padding:6px 20px;border-radius:20px;
  box-shadow:0 3px 10px rgba(255,105,135,.3);
  cursor:pointer;transition:transform .2s,box-shadow .2s;
  margin-bottom:8px;
}
.lxx-tag:hover{transform:translateY(-2px);box-shadow:0 5px 15px rgba(255,105,135,.4)}

/* ===== 中间棋盘 ===== */
.board-area{
  flex:1;display:flex;align-items:center;justify-content:center;
  position:relative;
}
.board-container{
  position:relative;
  background:linear-gradient(180deg,rgba(45,55,90,.92) 0%,rgba(35,42,72,.95) 100%);
  border-radius:24px;
  padding:12px;
  border:3px solid #FFB6C1;
  box-shadow:0 8px 32px rgba(0,0,0,.15),inset 0 2px 8px rgba(255,182,193,.2);
}
.board-star{
  position:absolute;top:-16px;left:50%;transform:translateX(-50%);
  font-size:28px;filter:drop-shadow(0 2px 6px rgba(255,217,102,.5));
  z-index:2;
}
#gameCanvas{display:block;border-radius:16px;cursor:pointer}

/* ===== 右侧面板 ===== */
.right-panel{
  width:18%;min-width:160px;
  display:flex;flex-direction:column;gap:12px;
  padding:8px 4px;
}

.info-card{
  background:linear-gradient(135deg,rgba(255,255,255,.92),rgba(255,240,245,.9));
  border-radius:18px;padding:14px 12px;text-align:center;
  box-shadow:0 4px 16px rgba(0,0,0,.06),inset 0 1px 3px rgba(255,255,255,.5);
  border:1.5px solid rgba(255,182,193,.25);
  position:relative;
}
.info-card .card-star{position:absolute;top:-10px;left:50%;transform:translateX(-50%);font-size:18px}
.info-card .card-title{font-size:13px;color:#888;font-weight:700;margin-bottom:6px}
.info-card .card-value{font-size:32px;font-weight:900;color:#3580C0}
.info-card .card-value.warning{color:#FF6B6B}
.info-card .card-sub{font-size:11px;color:#aaa;margin-top:4px}

/* 抽奖球 */
.lottery-area{
  margin-top:auto;
  display:flex;flex-direction:column;align-items:center;gap:8px;
}
.lottery-ball{
  width:80px;height:80px;border-radius:50%;
  background:radial-gradient(circle at 35% 30%,rgba(255,255,255,.7),rgba(255,255,255,.1) 50%,rgba(200,220,255,.15));
  border:2px solid rgba(255,255,255,.35);
  box-shadow:0 4px 20px rgba(0,0,0,.08),inset 0 -4px 12px rgba(0,0,0,.04);
  display:flex;align-items:center;justify-content:center;
  position:relative;overflow:hidden;
  backdrop-filter:blur(4px);
}
.ball-inner{display:flex;gap:4px;align-items:center}
.ball-num{
  width:20px;height:20px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  font-size:10px;font-weight:900;color:#fff;
}
.ball-num.r{background:linear-gradient(135deg,#FF6B6B,#E05555)}
.ball-num.b{background:linear-gradient(135deg,#6EC1FF,#3B8FD9)}
.ball-num.g{background:linear-gradient(135deg,#7ED957,#4CAF50)}
.lottery-label{font-size:10px;color:#888;font-weight:700;letter-spacing:1px}

.side-btns{display:flex;flex-direction:column;gap:6px;width:100%}
.side-btn{
  padding:7px 0;border-radius:14px;border:none;font-size:12px;font-weight:700;color:#fff;cursor:pointer;
  transition:transform .2s,box-shadow .2s;text-align:center;
}
.side-btn:hover{transform:translateY(-1px);box-shadow:0 4px 12px rgba(0,0,0,.15)}
.side-btn.orange{background:linear-gradient(135deg,#FFA94D,#E88A2D)}
.side-btn.blue{background:linear-gradient(135deg,#6EC1FF,#3B8FD9)}
.side-btn.pink{background:linear-gradient(135deg,#FFB6C1,#FF91A4)}

/* ===== Overlay ===== */
.overlay{
  position:fixed;top:0;left:0;width:100%;height:100%;z-index:100;
  display:flex;align-items:center;justify-content:center;
  background:rgba(30,40,70,.35);backdrop-filter:blur(4px);
  transition:opacity .3s;
}
.overlay.hidden{display:none;opacity:0}
.overlay-card{
  background:linear-gradient(135deg,rgba(255,255,255,.96),rgba(255,245,250,.95));
  border-radius:28px;padding:36px 44px;text-align:center;
  box-shadow:0 12px 48px rgba(0,0,0,.12);
  border:2px solid rgba(255,182,193,.2);
  max-width:480px;width:90%;
  position:relative;
}
.overlay-title{
  font-size:36px;font-weight:900;
  background:linear-gradient(90deg,#3580C0,#5AA8E0,#3580C0);
  -webkit-background-clip:text;-webkit-text-fill-color:transparent;
  margin-bottom:8px;
}
.overlay-divider{
  width:80%;height:1px;margin:12px auto;
  background:linear-gradient(90deg,transparent,rgba(100,180,240,.3),transparent);
}
.overlay-rules{text-align:left;margin:12px 0 20px;padding:0 8px}
.overlay-rules p{
  font-size:13px;color:#555;margin:6px 0;line-height:1.6;
}
.overlay-rules p::before{content:'✦ ';color:#FFB6C1}
.start-btn{
  background:linear-gradient(135deg,#7ED957,#5CB830);
  color:#fff;font-size:17px;font-weight:700;
  padding:12px 48px;border-radius:24px;border:none;cursor:pointer;
  box-shadow:0 4px 16px rgba(92,184,48,.3);
  transition:transform .2s,box-shadow .2s;
}
.start-btn:hover{transform:translateY(-2px) scale(1.02);box-shadow:0 6px 20px rgba(92,184,48,.4)}
.result-score{font-size:28px;font-weight:900;color:#3580C0;margin:8px 0}
.result-detail{font-size:13px;color:#888;margin:4px 0}
.retry-btn{
  background:linear-gradient(135deg,#6EC1FF,#3B8FD9);
  color:#fff;font-size:15px;font-weight:700;
  padding:10px 36px;border-radius:20px;border:none;cursor:pointer;
  box-shadow:0 4px 14px rgba(59,143,217,.3);
  transition:transform .2s;margin-top:12px;
}
.retry-btn:hover{transform:translateY(-2px)}

.footer-text{
  position:fixed;bottom:10px;left:50%;transform:translateX(-50%);
  font-size:11px;color:rgba(100,100,140,.35);z-index:1;
}
</style>
</head>
<body>

<!-- 背景装饰 -->
<div class="clouds">
  <div class="cloud c1"></div><div class="cloud c2"></div>
  <div class="cloud c3"></div><div class="cloud c4"></div>
</div>
<div class="rainbow"></div>

<!-- 主容器 -->
<div class="game-wrap">

  <!-- 左侧角色区 -->
  <div class="left-panel">
    <div class="logo-area">
      <div class="logo-icon">🎱</div>
      <div class="logo-cn">中国体育彩票</div>
      <div class="logo-en">CHINA SPORTS LOTTERY</div>
    </div>
    <div class="lxx-area">
      <div class="balloon">公益体彩<br>乐善人生</div>
      <img class="lxx-img" src="image.png" onerror="this.style.display='none'" alt="乐小星">
      <div class="lxx-base"></div>
      <div class="speech-bubble">一起加油 益起精彩！</div>
    </div>
    <div class="lxx-tag">乐小星</div>
  </div>

  <!-- 中间棋盘 -->
  <div class="board-area">
    <div class="board-container">
      <div class="board-star">⭐</div>
      <canvas id="gameCanvas"></canvas>
    </div>
  </div>

  <!-- 右侧面板 -->
  <div class="right-panel">
    <div class="info-card">
      <div class="card-star">⭐</div>
      <div class="card-title">关卡</div>
      <div class="card-value" id="levelNum">01</div>
    </div>
    <div class="info-card">
      <div class="card-title">目标</div>
      <div style="font-size:28px;font-weight:900;color:#FFD966">⭐ <span id="targetNum">16</span></div>
    </div>
    <div class="info-card">
      <div class="card-title">步数</div>
      <div class="card-value" id="movesNum">20</div>
      <div class="card-sub">剩余步数</div>
    </div>
    <div class="info-card">
      <div class="card-title">得分</div>
      <div class="card-value" id="scoreNum">0</div>
    </div>
    <div class="lottery-area">
      <div class="lottery-ball">
        <div class="ball-inner">
          <div class="ball-num r">3</div>
          <div class="ball-num b">5</div>
          <div class="ball-num g">8</div>
        </div>
      </div>
      <div class="lottery-label">超级大乐透</div>
      <div class="side-btns">
        <button class="side-btn orange">公益</button>
        <button class="side-btn blue">责任</button>
        <button class="side-btn pink">公信</button>
      </div>
    </div>
  </div>
</div>

<!-- 开始画面 -->
<div class="overlay" id="readyOverlay">
  <div class="overlay-card">
    <div class="overlay-title">体彩消消乐</div>
    <div class="overlay-divider"></div>
    <div class="overlay-rules">
      <p>拖拽相邻方块进行交换</p>
      <p>3个或以上相同方块连线即可消除</p>
      <p>消除后上方方块下落，空位填充新方块</p>
      <p>连锁消除触发倍率加成</p>
      <p>3消=30分 4消=60分 5消=100分</p>
      <p>限 20 步，尽可能获得高分</p>
    </div>
    <button class="start-btn" onclick="startGame()">开始游戏</button>
  </div>
</div>

<!-- 结算画面 -->
<div class="overlay hidden" id="resultOverlay">
  <div class="overlay-card">
    <div class="overlay-title" id="resultTitle">步数用尽!</div>
    <div class="overlay-divider"></div>
    <div class="result-score" id="resultScore">得分: 0</div>
    <div class="result-detail" id="resultChain">最高连锁: 0 连</div>
    <div class="result-detail" id="resultTotal">总连锁次数: 0</div>
    <button class="retry-btn" onclick="restartGame()">再来一局</button>
  </div>
</div>

<div class="footer-text">中国体育彩票 · 公益体彩 乐善人生</div>

<script>
/* =====================================================
   体彩消消乐 — 游戏引擎
   ===================================================== */

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

/* === 游戏常量 === */
const COLS = 8, ROWS = 8, MAX_MOVES = 20;
const CELL = 56;  // 每格像素
canvas.width = COLS * CELL;
canvas.height = ROWS * CELL;
const tw = CELL, th = CELL;

/* === 棋子类型 === */
const TYPES = [
  { name:'黄星',   color:'#FFD966', light:'#FFF0A0', dark:'#E6B800' },
  { name:'蓝星',   color:'#6EC1FF', light:'#A8DDFF', dark:'#3B8FD9' },
  { name:'红心',   color:'#FFB6C1', light:'#FFD6DD', dark:'#FF6B8A' },
  { name:'绿五边', color:'#7ED957', light:'#A8F080', dark:'#4CAF50' },
  { name:'紫水滴', color:'#C8A2FF', light:'#DFC4FF', dark:'#9B6FD0' },
  { name:'橙圆',   color:'#FFA94D', light:'#FFCA80', dark:'#E88A2D' }
];

/* === 游戏状态 === */
let board = [], sel = null, score = 0, movesLeft = MAX_MOVES;
let state = 'ready';
let chainCount = 0, maxChain = 0, totalChains = 0;
let isAnimating = false;

/* === 动画 === */
let animPhase = '', animTimer = 0;
let swapAnim = null, removeAnim = null, dropAnim = null;
let animDrops = [], animFills = [], animRemoves = [];
let particles = [], scorePopups = [];
let tileCV = [], cacheReady = false;

/* === 音频 === */
let _ac;
function ensA(){ if(!_ac) _ac = new (window.AudioContext||window.webkitAudioContext)(); if(_ac.state==='suspended') _ac.resume(); }
function beep(freq,dur,type,vol){
  ensA();if(!_ac)return;
  try{const o=_ac.createOscillator(),g=_ac.createGain();
  o.type=type||'sine';o.frequency.value=freq;
  g.gain.setValueAtTime(vol||.08,_ac.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,_ac.currentTime+dur);
  o.connect(g);g.connect(_ac.destination);o.start();o.stop(_ac.currentTime+dur);}catch(e){}
}
const sndMatch=()=>{beep(660,.1,'sine',.08);setTimeout(()=>beep(880,.12,'sine',.08),80)};
const sndSel=()=>beep(440,.06,'sine',.06);
const sndSwap=()=>{beep(520,.06,'sine',.06);setTimeout(()=>beep(580,.06,'sine',.06),50)};
const sndFail=()=>beep(200,.15,'square',.06);
const sndDrop=()=>beep(350,.06,'sine',.05);
const sndChain=()=>{beep(700,.1,'sine',.1);setTimeout(()=>beep(900,.12,'sine',.1),100);setTimeout(()=>beep(1100,.15,'sine',.1),200)};

/* =====================================================
   棋子缓存 — 6种软糖几何形状
   ===================================================== */
function buildCache(){
  tileCV = [];
  const S = CELL;

  function shapePath(c, cx, cy, sz, name){
    c.beginPath();
    switch(name){
      case '黄星': // 五角星
        for(let k=0;k<5;k++){
          const oa=Math.PI*2*k/5-Math.PI/2;
          const ia=oa+Math.PI/5;
          const ox=cx+sz*Math.cos(oa),oy=cy+sz*Math.sin(oa);
          const ix=cx+sz*.42*Math.cos(ia),iy=cy+sz*.42*Math.sin(ia);
          k===0?c.moveTo(ox,oy):c.lineTo(ox,oy);
          c.lineTo(ix,iy);
        }
        c.closePath();break;
      case '蓝星': // 四角星
        for(let k=0;k<4;k++){
          const oa=Math.PI*2*k/4-Math.PI/2;
          const ia=oa+Math.PI/4;
          const ox=cx+sz*Math.cos(oa),oy=cy+sz*Math.sin(oa);
          const ix=cx+sz*.36*Math.cos(ia),iy=cy+sz*.36*Math.sin(ia);
          k===0?c.moveTo(ox,oy):c.lineTo(ox,oy);
          c.lineTo(ix,iy);
        }
        c.closePath();break;
      case '红心':{ // 爱心
        const hs=sz*.95;
        c.moveTo(cx,cy+hs*.78);
        c.bezierCurveTo(cx-hs*1.3,cy+.05*hs, cx-hs*.7,cy-hs*1.05, cx,cy-hs*.35);
        c.bezierCurveTo(cx+hs*.7,cy-hs*1.05, cx+hs*1.3,cy+.05*hs, cx,cy+hs*.78);
        break;}
      case '绿五边': // 五边形
        for(let k=0;k<5;k++){
          const a=Math.PI*2*k/5-Math.PI/2;
          const px=cx+sz*Math.cos(a),py=cy+sz*Math.sin(a);
          k===0?c.moveTo(px,py):c.lineTo(px,py);
        }
        c.closePath();break;
      case '紫水滴':{ // 水滴形
        c.moveTo(cx,cy-sz);
        c.bezierCurveTo(cx+sz*.65,cy-sz*.35, cx+sz*.85,cy+sz*.25, cx,cy+sz*.9);
        c.bezierCurveTo(cx-sz*.85,cy+sz*.25, cx-sz*.65,cy-sz*.35, cx,cy-sz);
        break;}
      case '橙圆': // 圆形
        c.arc(cx,cy,sz*.88,0,Math.PI*2);break;
    }
  }

  for(let i=0;i<TYPES.length;i++){
    const cv=document.createElement('canvas');cv.width=S;cv.height=S;
    const c=cv.getContext('2d'),t=TYPES[i];
    const cx=S/2,cy=S/2,sz=S*.42;

    // 阴影
    c.save();
    c.shadowColor='rgba(0,0,0,.2)';c.shadowBlur=5;c.shadowOffsetX=1;c.shadowOffsetY=3;
    shapePath(c,cx,cy,sz,t.name);
    c.fillStyle='rgba(0,0,0,.01)';c.fill();
    c.restore();

    // 主体渐变
    const bg=c.createRadialGradient(cx-sz*.25,cy-sz*.25,0,cx+sz*.1,cy+sz*.1,sz*1.15);
    bg.addColorStop(0,t.light);bg.addColorStop(.5,t.color);bg.addColorStop(1,t.dark);
    c.save();shapePath(c,cx,cy,sz,t.name);c.fillStyle=bg;c.fill();c.restore();

    // 顶部高光
    c.save();shapePath(c,cx,cy,sz,t.name);c.clip();
    const hl=c.createLinearGradient(cx,cy-sz,cx,cy+sz*.15);
    hl.addColorStop(0,'rgba(255,255,255,.6)');hl.addColorStop(1,'rgba(255,255,255,0)');
    c.fillStyle=hl;c.fillRect(0,0,S,S);c.restore();

    // 高光点
    c.save();c.fillStyle='rgba(255,255,255,.65)';
    c.beginPath();c.ellipse(cx-sz*.2,cy-sz*.3,sz*.18,sz*.09,-.2,0,Math.PI*2);c.fill();c.restore();

    // 柔和边缘
    c.save();shapePath(c,cx,cy,sz,t.name);
    c.strokeStyle='rgba(255,255,255,.3)';c.lineWidth=1.2;c.stroke();c.restore();

    tileCV.push(cv);
  }
  cacheReady=true;
}
buildCache();

/* =====================================================
   游戏逻辑
   ===================================================== */
function genBoard(){
  board=[];
  for(let r=0;r<ROWS;r++){
    board[r]=[];
    for(let c=0;c<COLS;c++){
      let type;
      do{ type=Math.floor(Math.random()*TYPES.length)+1; }
      while(wouldMatch(r,c,type));
      board[r][c]=type;
    }
  }
}

function wouldMatch(r,c,type){
  if(c>=2&&board[r][c-1]===type&&board[r][c-2]===type) return true;
  if(r>=2&&board[r-1]&&board[r-1][c]===type&&board[r-2]&&board[r-2][c]===type) return true;
  return false;
}

function findMatches(){
  const matches=new Set();
  for(let r=0;r<ROWS;r++){
    for(let c=0;c<COLS-2;c++){
      if(board[r][c]===0)continue;
      let len=1;
      while(c+len<COLS&&board[r][c+len]===board[r][c])len++;
      if(len>=3) for(let k=0;k<len;k++) matches.add(r+','+(c+k));
      c+=len-1;
    }
  }
  for(let c=0;c<COLS;c++){
    for(let r=0;r<ROWS-2;r++){
      if(board[r][c]===0)continue;
      let len=1;
      while(r+len<ROWS&&board[r+len][c]===board[r][c])len++;
      if(len>=3) for(let k=0;k<len;k++) matches.add((r+k)+','+c);
      r+=len-1;
    }
  }
  return matches;
}

function doSwap(r1,c1,r2,c2){
  const tmp=board[r1][c1];board[r1][c1]=board[r2][c2];board[r2][c2]=tmp;
}

function analyzeMatches(matches){
  const cells=[];
  matches.forEach(k=>{const [r,c]=k.split(',').map(Number);cells.push([r,c]);});
  const groups=[],used=new Set();
  // horizontal
  for(let r=0;r<ROWS;r++){
    const rowCells=cells.filter(([cr,cc])=>cr===r).sort((a,b)=>a[1]-b[1]);
    let i=0;
    while(i<rowCells.length){
      if(used.has(rowCells[i][0]+','+rowCells[i][1])){i++;continue;}
      let end=i;
      while(end+1<rowCells.length&&rowCells[end+1][1]===rowCells[end][1]+1)end++;
      const g=rowCells.slice(i,end+1);
      if(g.length>=3){const grp={len:g.length,cells:g,dir:'h'};groups.push(grp);g.forEach(([r,c])=>used.add(r+','+c));}
      i=end+1;
    }
  }
  // vertical
  for(let c=0;c<COLS;c++){
    const colCells=cells.filter(([cr,cc])=>cc===c).sort((a,b)=>a[0]-b[0]);
    let i=0;
    while(i<colCells.length){
      if(used.has(colCells[i][0]+','+colCells[i][1])){i++;continue;}
      let end=i;
      while(end+1<colCells.length&&colCells[end+1][0]===colCells[end][0]+1)end++;
      const g=colCells.slice(i,end+1);
      if(g.length>=3){const grp={len:g.length,cells:g,dir:'v'};groups.push(grp);g.forEach(([r,c])=>used.add(r+','+c));}
      i=end+1;
    }
  }
  if(groups.length===0&&cells.length>0){
    cells.forEach(([r,c])=>{if(!used.has(r+','+c)){groups.push({len:1,cells:[[r,c]],dir:'s'});used.add(r+','+c);}});
  }
  return groups;
}

function removeAndScore(matches){
  const matchGroups=analyzeMatches(matches);
  let totalAdd=0;
  const centers=[];
  matchGroups.forEach(g=>{
    const base=g.len===3?30:g.len===4?60:100;
    const chainMul=1+chainCount*0.5;
    const pts=Math.floor(base*chainMul);
    totalAdd+=pts;
    let sx=0,sy=0;
    g.cells.forEach(([r,c])=>{sx+=c*tw+tw/2;sy+=r*th+th/2;});
    centers.push({x:sx/g.cells.length,y:sy/g.cells.length,pts,g});
  });
  score+=totalAdd;
  // particles
  matches.forEach(key=>{
    const [r,c]=key.split(',').map(Number);
    const type=board[r][c];
    if(type>0) emit(c*tw+tw/2,r*th+th/2,TYPES[type-1].color,6);
  });
  // score popup
  if(centers.length>0){
    const main=centers[0];
    let text='+'+totalAdd;
    if(chainCount>0) text+=' x'+(1+chainCount*0.5).toFixed(1);
    scorePopups.push({x:main.x,y:main.y,text,col:'#fff',sz:16,phase:'float',floatT:0,floatDur:70});
    if(chainCount>0){
      scorePopups.push({x:main.x,y:main.y+16,text:chainCount+'连锁!',col:'#FFD966',sz:14,phase:'float',floatT:0,floatDur:90});
    }
  }
  // remove cells
  matches.forEach(key=>{const [r,c]=key.split(',').map(Number);board[r][c]=0;});
  return totalAdd;
}

function dropTiles(){
  const drops=[];
  for(let c=0;c<COLS;c++){
    let emptyRow=ROWS-1;
    for(let r=ROWS-1;r>=0;r--){
      if(board[r][c]!==0){
        if(r!==emptyRow){board[emptyRow][c]=board[r][c];board[r][c]=0;drops.push({c,fromR:r,toR:emptyRow});}
        emptyRow--;
      }
    }
  }
  return drops;
}

function fillBoard(){
  const fills=[];
  for(let c=0;c<COLS;c++){
    let count=0;
    for(let r=0;r<ROWS;r++){
      if(board[r][c]===0){board[r][c]=Math.floor(Math.random()*TYPES.length)+1;count++;fills.push({c,r,fromR:-count});}
    }
  }
  return fills;
}

/* === 动画控制 === */
function startSwapAnim(r1,c1,r2,c2,cb){isAnimating=true;animPhase='swap';animTimer=0;swapAnim={r1,c1,r2,c2,cb,dur:12};sndSwap();}
function startRemoveAnim(matches,cb){animPhase='remove';animTimer=0;animRemoves=[];matches.forEach(k=>{const [r,c]=k.split(',').map(Number);animRemoves.push({r,c,t:0});});removeAnim={matches,cb,dur:15};}
function startDropAnim(drops,fills,cb){animPhase='drop';animTimer=0;animDrops=drops.map(d=>({...d,t:0}));animFills=fills.map(f=>({...f,t:0}));dropAnim={cb,dur:12};}

function processAfterRemove(){
  chainCount++;
  if(chainCount>maxChain) maxChain=chainCount;
  totalChains++;
  const drops=dropTiles();
  const fills=fillBoard();
  if(drops.length>0||fills.length>0){
    startDropAnim(drops,fills,()=>{
      const newMatches=findMatches();
      if(newMatches.size>0){
        if(chainCount<=1)sndMatch();else sndChain();
        startRemoveAnim(newMatches,()=>{removeAndScore(newMatches);processAfterRemove();});
      }else{
        chainCount=0;isAnimating=false;
        if(!hasValidMove())reshuffleBoard();
        checkEndCondition();
      }
    });
  }else{
    chainCount=0;isAnimating=false;
    if(!hasValidMove())reshuffleBoard();
    checkEndCondition();
  }
}

function trySwap(r1,c1,r2,c2){
  if(isAnimating)return;
  doSwap(r1,c1,r2,c2);
  const matches=findMatches();
  if(matches.size>0){
    movesLeft--;
    chainCount=0;isAnimating=true;sndMatch();
    startRemoveAnim(matches,()=>{removeAndScore(matches);processAfterRemove();});
  }else{
    doSwap(r1,c1,r2,c2);sndFail();
  }
  sel=null;
}

function hasValidMove(){
  for(let r=0;r<ROWS;r++)for(let c=0;c<COLS;c++){
    if(c+1<COLS){doSwap(r,c,r,c+1);if(findMatches().size>0){doSwap(r,c,r,c+1);return true;}doSwap(r,c,r,c+1);}
    if(r+1<ROWS){doSwap(r,c,r+1,c);if(findMatches().size>0){doSwap(r,c,r+1,c);return true;}doSwap(r,c,r+1,c);}
  }
  return false;
}

function reshuffleBoard(){let tries=0;do{genBoard();tries++;}while(!hasValidMove()&&tries<100);}

function checkEndCondition(){
  if(movesLeft<=0){
    state='lose';
    document.getElementById('resultTitle').textContent='步数用尽!';
    document.getElementById('resultScore').textContent='得分: '+score;
    document.getElementById('resultChain').textContent='最高连锁: '+maxChain+' 连';
    document.getElementById('resultTotal').textContent='总连锁次数: '+totalChains;
    document.getElementById('resultOverlay').classList.remove('hidden');
    sndFail();
  }
}

/* =====================================================
   输入处理 — 拖拽交换
   ===================================================== */
let dragStart=null,dragging=false;

function getPos(e){
  const rect=canvas.getBoundingClientRect();
  const scaleX=canvas.width/rect.width,scaleY=canvas.height/rect.height;
  return {x:(e.clientX-rect.left)*scaleX,y:(e.clientY-rect.top)*scaleY};
}

function s2b(px,py){
  const c=Math.floor(px/tw),r=Math.floor(py/th);
  if(r>=0&&r<ROWS&&c>=0&&c<COLS&&board[r][c]>0) return {r,c};
  return null;
}

function onPointerDown(px,py){
  ensA();
  if(state!=='playing'||isAnimating)return;
  const cell=s2b(px,py);
  if(cell){dragStart={px,py,r:cell.r,c:cell.c};sel=cell;sndSel();dragging=false;}
  else{sel=null;dragStart=null;}
}

function onPointerMove(px,py){
  if(!dragStart||isAnimating)return;
  const dx=px-dragStart.px,dy=py-dragStart.py;
  const dist=Math.sqrt(dx*dx+dy*dy);
  if(dist>tw*0.3){
    dragging=true;
    let tr=dragStart.r,tc=dragStart.c;
    if(Math.abs(dx)>Math.abs(dy)) tc+=dx>0?1:-1;
    else tr+=dy>0?1:-1;
    if(tr>=0&&tr<ROWS&&tc>=0&&tc<COLS) trySwap(dragStart.r,dragStart.c,tr,tc);
    dragStart=null;sel=null;
  }
}

function onPointerUp(){dragStart=null;dragging=false;}

canvas.addEventListener('mousedown',e=>{e.preventDefault();const p=getPos(e);onPointerDown(p.x,p.y);});
canvas.addEventListener('mousemove',e=>{if(dragStart){const p=getPos(e);onPointerMove(p.x,p.y);}});
canvas.addEventListener('mouseup',e=>{onPointerUp();});
canvas.addEventListener('touchstart',e=>{e.preventDefault();const t=e.touches[0];const p=getPos(t);onPointerDown(p.x,p.y);},{passive:false});
canvas.addEventListener('touchmove',e=>{e.preventDefault();if(e.touches.length){const t=e.touches[0];const p=getPos(t);onPointerMove(p.x,p.y);}},{passive:false});
canvas.addEventListener('touchend',e=>{e.preventDefault();onPointerUp();},{passive:false});

/* =====================================================
   粒子 & 弹出分数
   ===================================================== */
function emit(x,y,col,n){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,sp=1+Math.random()*3;particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-1.5,life:1,dec:.015+Math.random()*.02,sz:2+Math.random()*4,col});}}

function drawParticles(){
  for(let i=particles.length-1;i>=0;i--){
    const p=particles[i];
    p.x+=p.vx;p.y+=p.vy;p.vy+=.06;p.life-=p.dec;
    if(p.life<=0){particles.splice(i,1);continue;}
    ctx.save();ctx.globalAlpha=p.life;
    ctx.fillStyle=p.col;
    ctx.beginPath();ctx.arc(p.x,p.y,p.sz*p.life,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
}

function drawScorePopups(){
  for(let i=scorePopups.length-1;i>=0;i--){
    const s=scorePopups[i];
    s.floatT++;
    const prog=s.floatT/s.floatDur;
    if(prog>=1){scorePopups.splice(i,1);continue;}
    const y=s.y-30*prog;
    const alpha=1-prog*.7;
    ctx.save();ctx.globalAlpha=alpha;
    ctx.fillStyle=s.col;ctx.font='bold '+s.sz+'px "Noto Sans SC",sans-serif';
    ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.shadowColor='rgba(0,0,0,.3)';ctx.shadowBlur=3;
    ctx.fillText(s.text,s.x,y);
    ctx.restore();
  }
}

/* =====================================================
   棋盘绘制
   ===================================================== */
function drawBoard(){
  // 棋盘格背景
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    const even=(r+c)%2===0;
    ctx.fillStyle=even?'rgba(55,65,100,.6)':'rgba(45,55,85,.65)';
    ctx.fillRect(c*tw,r*th,tw,th);
    // 内嵌阴影效果
    ctx.fillStyle='rgba(0,0,0,.06)';
    ctx.fillRect(c*tw,r*th+th-2,tw,2);
    ctx.fillStyle='rgba(255,255,255,.03)';
    ctx.fillRect(c*tw,r*th,tw,2);
  }

  // 绘制棋子
  for(let r=0;r<ROWS;r++) for(let c=0;c<COLS;c++){
    if(!board[r][c]||board[r][c]<=0)continue;
    const hl=sel&&sel.r===r&&sel.c===c;
    drawTile(r,c,hl);
  }
}

function drawTile(r,c,hl){
  let type=board[r][c];
  if(!type||type<=0)return;

  let tx=c*tw, ty=r*th;

  // drop动画偏移
  if(animPhase==='drop'){
    const drop=animDrops.find(d=>d.c===c&&d.toR===r);
    if(drop){
      const prog=Math.min(animTimer/dropAnim.dur,1);
      const ease=1-Math.pow(1-prog,3);
      ty=(drop.fromR+(drop.toR-drop.fromR)*ease)*th;
    }
    const fill=animFills.find(f=>f.c===c&&f.r===r);
    if(fill){
      const prog=Math.min(animTimer/dropAnim.dur,1);
      const ease=1-Math.pow(1-prog,3);
      ty=(fill.fromR+(fill.r-fill.fromR)*ease)*th;
    }
  }

  // remove动画缩放
  let scale=1,alpha=1;
  if(animPhase==='remove'){
    const rem=animRemoves.find(a=>a.r===r&&a.c===c);
    if(rem){
      const prog=Math.min(animTimer/removeAnim.dur,1);
      scale=1-prog*.6;alpha=1-prog;
    }
  }

  ctx.save();
  ctx.globalAlpha=alpha;
  if(scale!==1){
    const cx=tx+tw/2,cy=ty+th/2;
    ctx.translate(cx,cy);ctx.scale(scale,scale);ctx.translate(-cx,-cy);
  }

  // 绘制缓存棋子
  if(cacheReady&&tileCV[type-1]) ctx.drawImage(tileCV[type-1],tx,ty,tw,th);

  // 选中高亮
  if(hl){
    const cx=tx+tw/2,cy=ty+th/2;
    ctx.shadowColor='#FFD700';ctx.shadowBlur=14;
    ctx.strokeStyle='#FFD700';ctx.lineWidth=2.5;
    ctx.beginPath();ctx.arc(cx,cy,tw*.42,0,Math.PI*2);ctx.stroke();
    ctx.globalAlpha=.1+.08*Math.sin(Date.now()/200);
    ctx.fillStyle='#FFD700';
    ctx.beginPath();ctx.arc(cx,cy,tw*.46,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

/* === 动画更新 (已修复: 先清状态再调callback) === */
function updateAnim(){
  if(animPhase==='swap'&&swapAnim){
    animTimer++;
    if(animTimer>=swapAnim.dur){const cb=swapAnim.cb;swapAnim=null;animPhase='';if(cb)cb();}
  }
  if(animPhase==='remove'&&removeAnim){
    animTimer++;
    if(animTimer>=removeAnim.dur){const cb=removeAnim.cb;removeAnim=null;animPhase='';if(cb)cb();}
  }
  if(animPhase==='drop'&&dropAnim){
    animTimer++;
    if(animTimer>=dropAnim.dur){const cb=dropAnim.cb;dropAnim=null;animPhase='';if(cb)cb();}
  }
}

/* =====================================================
   UI更新
   ===================================================== */
function updateUI(){
  const movesEl=document.getElementById('movesNum');
  movesEl.textContent=movesLeft;
  movesEl.className='card-value'+(movesLeft<=5?' warning':'');
  document.getElementById('scoreNum').textContent=score;
}

/* =====================================================
   主循环
   ===================================================== */
function draw(){
  if(state!=='ready'){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    updateAnim();
    drawBoard();
    drawParticles();
    drawScorePopups();
    updateUI();
  }
  requestAnimationFrame(draw);
}
requestAnimationFrame(draw);

/* =====================================================
   游戏控制
   ===================================================== */
function startGame(){
  ensA();
  genBoard();
  score=0;movesLeft=MAX_MOVES;
  scorePopups=[];particles=[];
  chainCount=0;maxChain=0;totalChains=0;
  state='playing';sel=null;isAnimating=false;
  swapAnim=null;removeAnim=null;dropAnim=null;
  document.getElementById('readyOverlay').classList.add('hidden');
  updateUI();
}

function restartGame(){
  document.getElementById('resultOverlay').classList.add('hidden');
  startGame();
}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, 'xiaoxiaole.html'), html, 'utf8');
console.log('Done! Written xiaoxiaole.html');
