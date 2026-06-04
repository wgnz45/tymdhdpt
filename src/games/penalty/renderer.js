/**
 * 点球大战 Canvas 渲染器 v3
 * SVG 精灵图驱动：守门员和足球使用预渲染 SVG，画质大幅提升
 */
import { COLORS, BALL_RADIUS, GOAL_WIDTH_M, GOAL_HEIGHT_M } from './constants';
import { keeperImg, ballImg, keeperHeadImg } from './sprites';

// ── 粒子系统 ─────────────────────────────────
const particles = [];
export function spawnParticles(x, y, color, count = 20, speed = 3) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const v = speed * (0.5 + Math.random());
        particles.push({
            x, y,
            vx: Math.cos(angle) * v,
            vy: Math.sin(angle) * v - 2,
            life: 1,
            decay: 0.015 + Math.random() * 0.02,
            size: 2 + Math.random() * 4,
            color,
        });
    }
}

function updateAndDrawParticles(ctx, dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.life -= p.decay;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.life, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}

// ── 坐标映射 ─────────────────────────────────

export function goalRect(w, h) {
    const goalW = w * 0.52;
    const goalH = goalW * (GOAL_HEIGHT_M / GOAL_WIDTH_M);
    const left = (w - goalW) / 2;
    const top = h * 0.15;
    return { left, top, width: goalW, height: goalH, right: left + goalW, bottom: top + goalH };
}

export function goalToCanvas(mx, my, w, h) {
    const g = goalRect(w, h);
    const px = g.left + (mx / GOAL_WIDTH_M + 0.5) * g.width;
    const py = g.bottom - (my / GOAL_HEIGHT_M) * g.height;
    return { x: px, y: py };
}

export function canvasToAim(px, py, w, h) {
    const g = goalRect(w, h);
    const aimX = ((px - g.left) / g.width - 0.5) * 2;
    const aimY = 1 - (py - g.top) / g.height;
    return {
        x: Math.max(-1, Math.min(1, aimX)),
        y: Math.max(0, Math.min(1, aimY)),
    };
}

// ── 夜场体育场背景 ───────────────────────────

export function drawGrass(ctx, w, h) {
    const g = goalRect(w, h);
    const grassTop = g.bottom - 2;

    // 夜空渐变
    const skyGrad = ctx.createLinearGradient(0, 0, 0, grassTop);
    skyGrad.addColorStop(0, '#0a1628');
    skyGrad.addColorStop(0.4, '#122040');
    skyGrad.addColorStop(0.7, '#1a3055');
    skyGrad.addColorStop(1, '#1e4a3a');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, w, grassTop);

    // 观众席剪影
    const crowdY = grassTop - g.height * 0.15;
    ctx.fillStyle = '#0d1520';
    ctx.beginPath();
    ctx.moveTo(0, crowdY + 20);
    for (let x = 0; x < w; x += 6) {
        ctx.lineTo(x, crowdY + Math.sin(x * 0.08) * 5 + Math.sin(x * 0.22) * 3);
    }
    ctx.lineTo(w, grassTop);
    ctx.lineTo(0, grassTop);
    ctx.closePath();
    ctx.fill();

    // 观众席彩色点（模拟手机灯光）
    const time = Date.now() * 0.001;
    for (let i = 0; i < 40; i++) {
        const cx = (i * 37 + 13) % w;
        const cy = crowdY + Math.sin(i * 2.3 + time * (0.5 + (i % 3) * 0.3)) * 6 + 10;
        const colors = ['#ff6b6b', '#ffd93d', '#6bcbff', '#ff9ff3', '#54e346'];
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.3 + Math.sin(time * 2 + i) * 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // 泛光灯光晕
    const lampPositions = [w * 0.08, w * 0.92];
    for (const lx of lampPositions) {
        const floodGrad = ctx.createRadialGradient(lx, 0, 0, lx, grassTop * 0.5, w * 0.4);
        floodGrad.addColorStop(0, 'rgba(255,255,220,0.12)');
        floodGrad.addColorStop(0.5, 'rgba(255,255,200,0.04)');
        floodGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = floodGrad;
        ctx.fillRect(0, 0, w, grassTop);
    }

    // 草坪
    const grassGrad = ctx.createLinearGradient(0, grassTop, 0, h);
    grassGrad.addColorStop(0, '#2d8a4e');
    grassGrad.addColorStop(0.3, '#258a42');
    grassGrad.addColorStop(1, '#1a6633');
    ctx.fillStyle = grassGrad;
    ctx.fillRect(0, grassTop, w, h - grassTop);

    // 草坪透视条纹
    const stripeCount = 10;
    for (let i = 0; i < stripeCount; i += 2) {
        const t = i / stripeCount;
        const y1 = grassTop + (h - grassTop) * t;
        const y2 = grassTop + (h - grassTop) * ((i + 1) / stripeCount);
        ctx.fillStyle = 'rgba(50,170,70,0.12)';
        ctx.fillRect(0, y1, w, y2 - y1);
    }

    // 罚球区线（梯形透视）
    const boxW = g.width * 1.6;
    const boxBottom = h * 0.92;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(g.left - g.width * 0.3, g.bottom);
    ctx.lineTo((w - boxW) / 2, boxBottom);
    ctx.lineTo((w + boxW) / 2, boxBottom);
    ctx.lineTo(g.right + g.width * 0.3, g.bottom);
    ctx.stroke();

    // 罚球点
    ctx.beginPath();
    ctx.arc(w / 2, h * 0.78, 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fill();

    // 草坪光泽
    const sheenGrad = ctx.createRadialGradient(w / 2, grassTop + 20, 0, w / 2, grassTop + 20, w * 0.4);
    sheenGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
    sheenGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = sheenGrad;
    ctx.fillRect(0, grassTop, w, h - grassTop);
}

// ── 球门（3D感增强） ─────────────────────────

export function drawGoal(ctx, w, h) {
    const g = goalRect(w, h);

    // 球网深度背景
    const netGrad = ctx.createLinearGradient(g.left, g.top, g.left, g.bottom);
    netGrad.addColorStop(0, 'rgba(30,30,50,0.6)');
    netGrad.addColorStop(1, 'rgba(30,30,50,0.3)');
    ctx.fillStyle = netGrad;
    ctx.fillRect(g.left, g.top, g.width, g.height);

    // 球网菱形格
    ctx.strokeStyle = 'rgba(200,200,210,0.18)';
    ctx.lineWidth = 0.6;
    const cellW = g.width / 20;
    const cellH = g.height / 6;
    for (let row = 0; row <= 6; row++) {
        for (let col = 0; col <= 20; col++) {
            const x = g.left + col * cellW;
            const y = g.top + row * cellH;
            if (col < 20) {
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + cellW / 2, y + cellH / 2);
                ctx.lineTo(x + cellW, y);
                ctx.stroke();
            }
            if (row < 6 && col < 20) {
                ctx.beginPath();
                ctx.moveTo(x + cellW / 2, y + cellH / 2);
                ctx.lineTo(x + cellW, y + cellH);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x + cellW / 2, y + cellH / 2);
                ctx.lineTo(x, y + cellH);
                ctx.stroke();
            }
        }
    }

    // 门柱（金属质感）
    const postW = Math.max(5, g.width * 0.02);
    const drawPost = (x, y, pw, ph) => {
        const pGrad = ctx.createLinearGradient(x, y, x + pw, y);
        pGrad.addColorStop(0, '#e8e8e8');
        pGrad.addColorStop(0.3, '#ffffff');
        pGrad.addColorStop(0.5, '#f0f0f0');
        pGrad.addColorStop(1, '#cccccc');
        ctx.fillStyle = pGrad;
        ctx.fillRect(x, y, pw, ph);
    };

    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    drawPost(g.left - postW / 2, g.top - postW / 2, postW, g.height + postW);
    drawPost(g.right - postW / 2, g.top - postW / 2, postW, g.height + postW);

    // 横梁
    const barGrad = ctx.createLinearGradient(g.left, g.top - postW, g.left, g.top);
    barGrad.addColorStop(0, '#ffffff');
    barGrad.addColorStop(1, '#d0d0d0');
    ctx.fillStyle = barGrad;
    ctx.fillRect(g.left - postW / 2, g.top - postW / 2, g.width + postW, postW);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
}

// ── 守门员（乐小星 SVG + Canvas 动态手臂） ───────
// 乐小星 viewBox = 200×260，Q版比例（头大身小）

const KEEPER_ASPECT = 200 / 260;
// 手臂从身体上部伸出（新身体范围 y=170~230, x=58~142）
const SHOULDER_NX = 58 / 200;          // 左肩 x（身体外缘）
const SHOULDER_NY = 180 / 260;         // 肩膀 y（身体上部）

export function drawKeeper(ctx, w, h, diveX = 0, diveProgress = 0) {
    const g = goalRect(w, h);
    const centerX = g.left + g.width / 2;
    const baseY = g.bottom;

    const keeperH = g.height * 0.92;
    const keeperW = keeperH * KEEPER_ASPECT;

    // 扑救偏移
    const maxDive = g.width * 0.44;
    const dp = diveProgress;
    const offsetX = diveX * maxDive * dp;

    ctx.save();
    ctx.translate(centerX + offsetX, baseY);

    // 扑救倾斜（Q版角色可以倾斜更夸张一点）
    const tilt = dp * diveX * 0.55;
    ctx.rotate(tilt);

    // 脚底阴影
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.beginPath();
    ctx.ellipse(0, 2, keeperW * 0.4, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 肩膀坐标（本地坐标系，脚底为原点）
    const sxL = -keeperW * (0.5 - SHOULDER_NX);
    const sxR = keeperW * (0.5 - SHOULDER_NX);
    const sy = -keeperH * (1 - SHOULDER_NY);

    // Q版手臂：纤细，手是小圆球（不是夸张的大手套）
    const armThick = keeperW * 0.10;
    const foreThick = keeperW * 0.09;
    const gloveR = keeperW * 0.075;

    // ── 手臂角度（跟随扑救方向） ──
    const standAngleL = Math.PI * 0.6;    // 站立：左臂向左下
    const standAngleR = Math.PI * 0.4;    // 站立：右臂向右下

    const eased = dp * dp * (3 - 2 * dp); // smoothstep

    const lerpAngle = (from, to, t) => {
        let diff = to - from;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        return from + diff * t;
    };

    // ★ 手臂跟随身体扑救方向
    let targetAngleL, targetAngleR;
    if (diveX > 0.05) {
        // 向右扑：右臂前导向右上，左臂跟随
        targetAngleR = -Math.PI * 0.25;
        targetAngleL = -Math.PI * 0.4;
    } else if (diveX < -0.05) {
        // 向左扑：左臂前导向左上，右臂跟随
        targetAngleL = -Math.PI * 0.75;
        targetAngleR = -Math.PI * 0.6;
    } else {
        // 原地站：双臂向两侧上方张开
        targetAngleL = -Math.PI * 0.65;
        targetAngleR = -Math.PI * 0.35;
    }

    const angleL = lerpAngle(standAngleL, targetAngleL, eased);
    const angleR = lerpAngle(standAngleR, targetAngleR, eased);

    // Q版手臂长度：站立时小（贴身），扑救时大幅伸长
    const upperLen = keeperH * (0.05 + 0.06 * eased);
    const foreLen = keeperH * (0.04 + 0.06 * eased);

    // ── 画圆管肢体（配描边，匹配乐小星画风） ──
    const drawLimb = (x1, y1, x2, y2, thick, fillColor) => {
        const a = Math.atan2(y2 - y1, x2 - x1);
        const hw = thick / 2;
        ctx.save();
        ctx.translate(x1, y1);
        ctx.rotate(a);
        const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        ctx.beginPath();
        ctx.moveTo(0, -hw);
        ctx.lineTo(len, -hw);
        ctx.arc(len, 0, hw, -Math.PI / 2, Math.PI / 2);
        ctx.lineTo(0, hw);
        ctx.arc(0, 0, hw, Math.PI / 2, -Math.PI / 2);
        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(1, thick * 0.12);
        ctx.stroke();
        ctx.restore();
    };

    // ── 画手套（Q版：简洁圆形，橙色） ──
    const drawGlove = (gx, gy) => {
        const gr = gloveR;
        // 手套主体
        const gGrad = ctx.createRadialGradient(gx - gr * 0.2, gy - gr * 0.2, 0, gx, gy, gr);
        gGrad.addColorStop(0, '#ffb347');
        gGrad.addColorStop(1, '#e06000');
        ctx.fillStyle = gGrad;
        ctx.beginPath();
        ctx.arc(gx, gy, gr, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = Math.max(1, gr * 0.12);
        ctx.stroke();
        // 高光
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.beginPath();
        ctx.ellipse(gx - gr * 0.2, gy - gr * 0.25, gr * 0.35, gr * 0.25, -0.3, 0, Math.PI * 2);
        ctx.fill();
    };

    // ═══ 先画 SVG 身体 ═══
    if (keeperImg.complete && keeperImg.naturalWidth > 0) {
        ctx.drawImage(keeperImg, -keeperW / 2, -keeperH, keeperW, keeperH);
    } else {
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.ellipse(0, -keeperH * 0.7, keeperW * 0.35, keeperH * 0.25, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.stroke();
    }

    // ═══ 画乐小星头部 PNG ═══
    if (keeperHeadImg.complete && keeperHeadImg.naturalWidth > 0) {
        const headW = keeperW * 0.95;
        const headH = headW * (keeperHeadImg.naturalHeight / keeperHeadImg.naturalWidth);
        const headCenterY = -keeperH * 0.68;
        ctx.drawImage(keeperHeadImg, -headW / 2, headCenterY - headH / 2, headW, headH);
    }

    // ═══ 再画手臂（在身体前面） ═══

    // ── 左臂 ──
    const elbowLX = sxL + Math.cos(angleL) * upperLen;
    const elbowLY = sy + Math.sin(angleL) * upperLen;
    const foreAngleL = angleL + (dp > 0.1 ? -0.2 * eased : 0.15);
    const wristLX = elbowLX + Math.cos(foreAngleL) * foreLen;
    const wristLY = elbowLY + Math.sin(foreAngleL) * foreLen;

    drawLimb(sxL, sy, elbowLX, elbowLY, armThick, '#fff');
    drawLimb(elbowLX, elbowLY, wristLX, wristLY, foreThick, '#fff');
    drawGlove(wristLX, wristLY);

    // ── 右臂 ──
    const elbowRX = sxR + Math.cos(angleR) * upperLen;
    const elbowRY = sy + Math.sin(angleR) * upperLen;
    const foreAngleR = angleR + (dp > 0.1 ? 0.2 * eased : -0.15);
    const wristRX = elbowRX + Math.cos(foreAngleR) * foreLen;
    const wristRY = elbowRY + Math.sin(foreAngleR) * foreLen;

    drawLimb(sxR, sy, elbowRX, elbowRY, armThick, '#fff');
    drawLimb(elbowRX, elbowRY, wristRX, wristRY, foreThick, '#fff');
    drawGlove(wristRX, wristRY);

    ctx.restore();
}

// ── 足球（SVG 精灵图 + 旋转） ──────────────

export function drawBall(ctx, x, y, scale = 1, rotation = 0) {
    const r = Math.max(5, BALL_RADIUS * scale * 1.15);
    if (r < 3) return;

    // 地面阴影
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(x + r * 0.08, y + r * 0.85, r * 0.75, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (ballImg.complete && ballImg.naturalWidth > 0) {
        ctx.drawImage(ballImg, -r, -r, r * 2, r * 2);
    } else {
        // 备用：简单圆形
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    ctx.restore();
}

// ── 瞄准准星（呼吸动画环） ───────────────────

export function drawCrosshair(ctx, x, y, w, h, jitterX = 0, jitterY = 0, time = 0) {
    const jx = x + jitterX;
    const jy = y + jitterY;
    const size = Math.min(w, h) * 0.045;
    const pulse = 1 + Math.sin(time * 6) * 0.08;

    // 外圆环
    ctx.strokeStyle = 'rgba(255,60,60,0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(jx, jy, size * pulse, 0, Math.PI * 2);
    ctx.stroke();

    // 内圆环
    ctx.strokeStyle = 'rgba(255,60,60,0.9)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(jx, jy, size * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 十字线（带缺口）
    ctx.strokeStyle = '#ff3333';
    ctx.lineWidth = 2;
    ctx.shadowColor = 'rgba(255,50,50,0.6)';
    ctx.shadowBlur = 6;
    const gap = size * 0.25;
    const len = size * 1.2;

    ctx.beginPath();
    ctx.moveTo(jx - len, jy); ctx.lineTo(jx - gap, jy);
    ctx.moveTo(jx + gap, jy); ctx.lineTo(jx + len, jy);
    ctx.moveTo(jx, jy - len); ctx.lineTo(jx, jy - gap);
    ctx.moveTo(jx, jy + gap); ctx.lineTo(jx, jy + len);
    ctx.stroke();

    // 中心点
    ctx.beginPath();
    ctx.arc(jx, jy, 2, 0, Math.PI * 2);
    ctx.fillStyle = '#ff3333';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // 瞄准引导线（从球到准星）
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 8]);
    ctx.beginPath();
    ctx.moveTo(w / 2, h * 0.75);
    ctx.lineTo(jx, jy);
    ctx.stroke();
    ctx.setLineDash([]);
}

// ── 力度条（圆弧 + 脉冲光效） ────────────────

export function drawPowerBar(ctx, w, h, power, phase, time = 0) {
    if (phase !== 'power') return;

    const barW = w * 0.055;
    const barH = h * 0.5;
    const barX = w - barW - w * 0.05;
    const barY = (h - barH) / 2;
    const r = 6;

    // 背景
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    roundRect(ctx, barX - 4, barY - 4, barW + 8, barH + 8, r + 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(20,20,30,0.8)';
    roundRect(ctx, barX, barY, barW, barH, r);
    ctx.fill();

    // 分区颜色条（从下往上绘制）
    const zones = [
        { from: 0, to: 0.55, color: '#ffcc00', label: '弱' },
        { from: 0.55, to: 0.85, color: '#44cc44', label: '佳' },
        { from: 0.85, to: 1, color: '#ff4444', label: '爆' },
    ];

    for (const z of zones) {
        const zoneTop = barY + barH * (1 - z.to);
        const zoneH = barH * (z.to - z.from);
        ctx.fillStyle = z.color;
        ctx.globalAlpha = 0.15;
        ctx.fillRect(barX + 2, zoneTop, barW - 4, zoneH);
    }
    ctx.globalAlpha = 1;

    // 最佳区间标记
    const sweetTop = barY + barH * (1 - 0.85);
    const sweetBottom = barY + barH * (1 - 0.55);
    ctx.strokeStyle = 'rgba(68,204,68,0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(barX - 8, sweetTop);
    ctx.lineTo(barX + barW + 8, sweetTop);
    ctx.moveTo(barX - 8, sweetBottom);
    ctx.lineTo(barX + barW + 8, sweetBottom);
    ctx.stroke();
    ctx.setLineDash([]);

    // 当前填充
    const fillTop = barY + barH * (1 - power);
    const fillH = barY + barH - fillTop;
    const fillColor = power >= 0.95 ? '#ff4444' : power >= 0.55 ? '#44cc44' : '#ffcc00';

    const fillGrad = ctx.createLinearGradient(barX, fillTop, barX + barW, fillTop);
    fillGrad.addColorStop(0, fillColor);
    fillGrad.addColorStop(0.5, fillColor + 'cc');
    fillGrad.addColorStop(1, fillColor);
    ctx.fillStyle = fillGrad;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(barX + 2, fillTop, barW - 4, fillH);
    ctx.globalAlpha = 1;

    // 脉冲发光边缘
    const glowIntensity = 0.4 + Math.sin(time * 8) * 0.3;
    ctx.shadowColor = fillColor;
    ctx.shadowBlur = 12 * glowIntensity;
    ctx.strokeStyle = fillColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(barX, fillTop);
    ctx.lineTo(barX + barW, fillTop);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // 指示三角
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(barX - 10, fillTop);
    ctx.lineTo(barX - 3, fillTop - 5);
    ctx.lineTo(barX - 3, fillTop + 5);
    ctx.closePath();
    ctx.fill();

    // 百分比
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(w * 0.024)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${Math.round(power * 100)}%`, barX + barW / 2, barY + barH + w * 0.03);

    // 标签
    ctx.font = `bold ${Math.round(w * 0.016)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText('力度', barX + barW / 2, barY - w * 0.018);
}

// ── 计分板（毛玻璃风格） ─────────────────────

export function drawScoreboard(ctx, w, h, playerScore, aiScore, round, maxRounds, phase, isSuddenDeath = false) {
    const panelW = w * 0.42;
    const panelH = h * 0.075;
    const panelX = (w - panelW) / 2;
    const panelY = h * 0.02;

    // 毛玻璃面板
    ctx.fillStyle = 'rgba(10,15,30,0.7)';
    roundRect(ctx, panelX, panelY, panelW, panelH, panelH / 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    roundRect(ctx, panelX, panelY, panelW, panelH, panelH / 2);
    ctx.stroke();

    const fontSize = Math.round(panelH * 0.38);
    const cy = panelY + panelH / 2;

    // 玩家
    ctx.font = `bold ${Math.round(fontSize * 0.85)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('你', panelX + panelW * 0.12, cy);

    ctx.font = `bold ${Math.round(fontSize * 1.6)}px sans-serif`;
    ctx.fillStyle = COLORS.scoreGreen;
    ctx.fillText(String(playerScore), panelX + panelW * 0.3, cy);

    // 分隔符
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(panelX + panelW * 0.46, cy - fontSize * 0.5, 2, fontSize);

    // AI
    ctx.font = `bold ${Math.round(fontSize * 1.6)}px sans-serif`;
    ctx.fillStyle = COLORS.scoreRed;
    ctx.fillText(String(aiScore), panelX + panelW * 0.7, cy);

    ctx.font = `bold ${Math.round(fontSize * 0.85)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fillText('门将', panelX + panelW * 0.88, cy);

    // 轮次
    const roundLabel = isSuddenDeath ? `加时赛 第${round}球` : `第 ${round}/${maxRounds} 球`;
    ctx.font = `${Math.round(fontSize * 0.6)}px sans-serif`;
    ctx.fillStyle = isSuddenDeath ? '#ffd700' : 'rgba(255,255,255,0.4)';
    ctx.fillText(roundLabel, panelX + panelW / 2, panelY + panelH + fontSize * 0.55);
}

// ── 提示文字（底部半透明条） ──────────────────

export function drawHint(ctx, w, h, text, sub = '') {
    if (!text && !sub) return;

    const fontSize = Math.round(w * 0.028);
    const barH = fontSize * (sub ? 3.2 : 2.2);
    const barY = h * 0.58;

    // 半透明条背景
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(ctx, w * 0.2, barY, w * 0.6, barH, 12);
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (text) {
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.fillStyle = '#fff';
        ctx.fillText(text, w / 2, barY + (sub ? barH * 0.35 : barH / 2));
    }

    if (sub) {
        ctx.font = `${Math.round(fontSize * 0.7)}px sans-serif`;
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.fillText(sub, w / 2, barY + barH * 0.7);
    }
}

// ── 射门结果（大字+粒子） ────────────────────

export function drawResultText(ctx, w, h, isGoal, hitPost, saved, timer = 0) {
    const fontSize = Math.round(w * 0.055);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let text, color, subText;
    if (isGoal) {
        text = 'GOAL!';
        subText = '进球得分！';
        color = COLORS.scoreGreen;
    } else if (saved) {
        text = 'SAVED!';
        subText = '守门员扑出';
        color = '#ff8844';
    } else if (hitPost) {
        text = 'POST!';
        subText = '击中门柱';
        color = COLORS.gold;
    } else {
        text = 'MISS!';
        subText = '射偏了';
        color = COLORS.scoreRed;
    }

    // 缩放弹入动画
    const scale = timer < 0.3 ? 0.5 + (timer / 0.3) * 0.5 : 1;
    const alpha = Math.min(1, timer * 3);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(w / 2, h * 0.44);
    ctx.scale(scale, scale);

    // 光晕
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, fontSize * 2);
    glowGrad.addColorStop(0, color + '30');
    glowGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(-fontSize * 2, -fontSize * 2, fontSize * 4, fontSize * 4);

    // 主文字
    ctx.font = `900 ${fontSize}px sans-serif`;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 4;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);

    // 副文字
    ctx.font = `bold ${Math.round(fontSize * 0.4)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(subText, 0, fontSize * 0.7);

    ctx.restore();

    // 进球时自动触发粒子
    if (isGoal && timer > 0.05 && timer < 0.1) {
        spawnParticles(w / 2, h * 0.44, '#44ff88', 30, 5);
        spawnParticles(w / 2, h * 0.44, '#ffd700', 20, 4);
    }
}

// ── 进球球网鼓包动画 ────────────────────────

export function drawNetBulge(ctx, w, h, ballX, ballY, timer) {
    const g = goalRect(w, h);
    // 鼓包大小随时间衰减
    const bulgeR = Math.max(0, 25 * (1 - timer * 0.6));
    if (bulgeR < 2) return;

    const bx = Math.max(g.left + 5, Math.min(g.right - 5, ballX));
    const by = Math.max(g.top + 5, Math.min(g.bottom - 5, ballY));

    // 半透明白色弧形鼓包
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.5 - timer * 0.3);
    const bulgeGrad = ctx.createRadialGradient(bx, by, 0, bx, by, bulgeR);
    bulgeGrad.addColorStop(0, 'rgba(255,255,255,0.6)');
    bulgeGrad.addColorStop(0.5, 'rgba(255,255,255,0.2)');
    bulgeGrad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = bulgeGrad;
    ctx.beginPath();
    ctx.arc(bx, by, bulgeR, 0, Math.PI * 2);
    ctx.fill();

    // 扭曲的网线
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.lineWidth = 0.8;
    const wave = bulgeR * 0.6;
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(bx - bulgeR, by + i * 6);
        ctx.quadraticCurveTo(bx, by + i * 6 + wave, bx + bulgeR, by + i * 6);
        ctx.stroke();
    }
    for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(bx + i * 6, by - bulgeR);
        ctx.quadraticCurveTo(bx + i * 6 + wave * 0.5, by, bx + i * 6, by + bulgeR);
        ctx.stroke();
    }
    ctx.restore();
}

// ── 扑出球弹飞动画 ──────────────────────────

export function drawSaveBounce(ctx, w, h, ballEndX, ballEndY, keeperDiveX, timer) {
    // 球被扑出后向反方向弹飞
    const bounceT = Math.min(1, timer * 1.5);
    const eased = bounceT * bounceT;

    // 弹飞方向：守门员触球方向的反向
    const dirX = keeperDiveX > 0 ? -1 : 1;
    const bx = ballEndX + dirX * eased * 60;
    const by = ballEndY + eased * 40 - (1 - eased) * 20;

    // 球旋转加快
    const rot = timer * 20;

    // 球逐渐变小（飞远）
    const sc = Math.max(0.2, 0.55 - bounceT * 0.35);

    drawBall(ctx, bx, by, sc, rot);
}

// ── 粒子更新入口 ─────────────────────────────
export { updateAndDrawParticles };

// ── 辅助：圆角矩形 ──────────────────────────

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}
