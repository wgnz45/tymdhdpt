import React, { useRef, useState, useCallback, useEffect } from 'react';
import useGameLoop from './useGameLoop';
import {
    PHASE, ROUNDS_PER_SIDE, MAX_SUDDEN_DEATH,
    POWER_SPEED, AIM_TIMEOUT_MS, AIM_JITTER,
    DIFFICULTY, BALL_FLIGHT_DURATION, COLORS,
    GOAL_HEIGHT_M,
} from './constants';
import {
    calculateShot, goalkeeperDecision, interpolateBallFlight,
} from './physics';
import {
    drawGrass, drawGoal, drawKeeper, drawBall,
    drawCrosshair, drawPowerBar, drawScoreboard,
    drawHint, drawResultText, goalRect, canvasToAim, goalToCanvas,
    updateAndDrawParticles, spawnParticles,
    drawNetBulge, drawSaveBounce,
} from './renderer';

/**
 * 点球大战主组件
 * 基于 FIFA/IFAB 规则：5 球制 + 突然死亡
 * 触屏优化：触摸瞄准 + 力度条点击
 */
export default function PenaltyGame({ onBack }) {
    const canvasRef = useRef(null);
    const stateRef = useRef({
        phase: PHASE.INTRO,
        difficulty: DIFFICULTY.NORMAL,

        // 瞄准
        aimX: 0,
        aimY: 0.5,
        aimLocked: false,
        aimStartTime: 0,
        jitterPhase: 0,

        // 力度
        power: 0,
        powerDir: 1,
        powerLocked: false,

        // 弹道
        flightT: 0,
        flightDuration: BALL_FLIGHT_DURATION,
        shot: null,
        keeperDecision: null,
        ballStart: { x: 0, y: 0 },
        ballEnd: { x: 0, y: 0 },

        // 守门员
        keeperDiveX: 0,
        keeperDiveProgress: 0,

        // 比分
        playerScore: 0,
        aiScore: 0,
        round: 1,
        totalRounds: ROUNDS_PER_SIDE,
        isSuddenDeath: false,
        roundResults: [],     // [{goal: bool}]

        // 结果展示
        resultTimer: 0,
        resultShown: false,
        isGoal: false,

        // 触摸
        isTouching: false,

        // 动画时间
        gameTime: 0,
        ballRotation: 0,
        screenShake: 0,
    });

    const [uiPhase, setUiPhase] = useState(PHASE.INTRO);
    const [scores, setScores] = useState({ player: 0, ai: 0 });
    const [round, setRound] = useState(1);
    const [totalRounds, setTotalRounds] = useState(ROUNDS_PER_SIDE);
    const [finalResult, setFinalResult] = useState(null);

    // ── 触摸事件 ──────────────────────────────

    const getPointerPos = useCallback((e) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        return {
            x: touch.clientX - rect.left,
            y: touch.clientY - rect.top,
        };
    }, []);

    const handlePointerDown = useCallback((e) => {
        e.preventDefault();
        const s = stateRef.current;

        if (s.phase === PHASE.INTRO) {
            // 开始游戏
            s.phase = PHASE.AIM;
            s.aimStartTime = performance.now();
            setUiPhase(PHASE.AIM);
            return;
        }

        if (s.phase === PHASE.AIM) {
            s.isTouching = true;
            const pos = getPointerPos(e);
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const aim = canvasToAim(pos.x, pos.y, rect.width, rect.height);
            s.aimX = aim.x;
            s.aimY = aim.y;
            return;
        }

        if (s.phase === PHASE.POWER && !s.powerLocked) {
            // 锁定力度 → 射门
            s.powerLocked = true;
            shootBall(s);
            return;
        }

        if (s.phase === PHASE.RESULT && s.resultTimer > 1.5) {
            nextRound(s);
            return;
        }

        if (s.phase === PHASE.SUMMARY) {
            // 再来一局
            resetGame(s);
            return;
        }
    }, [getPointerPos]);

    const handlePointerMove = useCallback((e) => {
        e.preventDefault();
        const s = stateRef.current;
        if (s.phase === PHASE.AIM && s.isTouching) {
            const pos = getPointerPos(e);
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();
            const aim = canvasToAim(pos.x, pos.y, rect.width, rect.height);
            s.aimX = aim.x;
            s.aimY = aim.y;
        }
    }, [getPointerPos]);

    const handlePointerUp = useCallback((e) => {
        e.preventDefault();
        const s = stateRef.current;
        if (s.phase === PHASE.AIM && s.isTouching) {
            s.isTouching = false;
            // 确认瞄准，进入力度阶段
            s.phase = PHASE.POWER;
            s.power = 0;
            s.powerDir = 1;
            s.powerLocked = false;
            setUiPhase(PHASE.POWER);
        }
    }, []);

    // ── 射门逻辑 ──────────────────────────────

    const shootBall = useCallback((s) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const w = rect.width, h = rect.height;

        // 计算弹道
        const shot = calculateShot(s.aimX, s.aimY, s.power);
        const keeper = goalkeeperDecision(shot, s.difficulty);

        s.shot = shot;
        s.keeperDecision = keeper;

        // 球的起点（罚球点位置）
        s.ballStart = { x: w / 2, y: h * 0.75 };

        // 球的终点
        if (shot.isOnTarget || shot.hitPost) {
            const end = goalToCanvas(shot.x, shot.y, w, h);
            s.ballEnd = end;
        } else {
            // 偏出：球飞向球门外
            const g = goalRect(w, h);
            s.ballEnd = {
                x: shot.x > 0 ? g.right + 50 : g.left - 50,
                y: shot.y > GOAL_HEIGHT_M ? g.top - 80 : g.bottom + 30,
            };
        }

        // 守门员扑救方向 — 使用归一化方向，精确匹配球的落点
        s.keeperDiveX = keeper.normalizedDiveX;
        s.keeperDiveProgress = 0;

        s.flightT = 0;
        s.flightDuration = shot.flightTime;
        s.isGoal = shot.isOnTarget && !keeper.saved;

        s.phase = PHASE.FLIGHT;
        setUiPhase(PHASE.FLIGHT);
    }, []);

    const nextRound = useCallback((s) => {
        const isGoal = s.isGoal;
        s.roundResults.push({ goal: isGoal });

        if (isGoal) s.playerScore++;

        // AI 也踢一球（简化：概率进球）
        const aiGoalProb = s.isSuddenDeath ? 0.5 : 0.55;
        const aiScored = Math.random() < aiGoalProb;
        if (aiScored) s.aiScore++;

        setScores({ player: s.playerScore, ai: s.aiScore });

        // 判断比赛是否结束
        const remaining = s.totalRounds - s.round;
        const pCanWin = s.playerScore + remaining + 1 > s.aiScore;
        const aCanWin = s.aiScore + remaining + 1 > s.playerScore;

        if (s.round >= s.totalRounds) {
            if (s.playerScore !== s.aiScore) {
                // 常规赛/突然死亡赛决出胜负
                s.phase = PHASE.SUMMARY;
                setUiPhase(PHASE.SUMMARY);
                setFinalResult({
                    win: s.playerScore > s.aiScore,
                    playerScore: s.playerScore,
                    aiScore: s.aiScore,
                    isSuddenDeath: s.isSuddenDeath,
                });
                return;
            }
            if (!s.isSuddenDeath) {
                // 进入突然死亡
                s.isSuddenDeath = true;
                s.totalRounds += MAX_SUDDEN_DEATH;
                setTotalRounds(s.totalRounds);
            } else if (s.playerScore === s.aiScore) {
                // 突然死亡中继续
                s.totalRounds += 1;
                setTotalRounds(s.totalRounds);
            }
        } else if (s.isSuddenDeath && s.playerScore !== s.aiScore) {
            // 突然死亡中一轮结束就判胜负
            s.phase = PHASE.SUMMARY;
            setUiPhase(PHASE.SUMMARY);
            setFinalResult({
                win: s.playerScore > s.aiScore,
                playerScore: s.playerScore,
                aiScore: s.aiScore,
                isSuddenDeath: true,
            });
            return;
        }

        // 提前判负/判胜
        if (!pCanWin) {
            s.phase = PHASE.SUMMARY;
            setUiPhase(PHASE.SUMMARY);
            setFinalResult({ win: false, playerScore: s.playerScore, aiScore: s.aiScore });
            return;
        }
        if (!aCanWin) {
            s.phase = PHASE.SUMMARY;
            setUiPhase(PHASE.SUMMARY);
            setFinalResult({ win: true, playerScore: s.playerScore, aiScore: s.aiScore });
            return;
        }

        // 下一轮
        s.round++;
        setRound(s.round);
        s.phase = PHASE.AIM;
        s.aimStartTime = performance.now();
        s.aimLocked = false;
        s.resultShown = false;
        s.resultTimer = 0;
        setUiPhase(PHASE.AIM);
    }, []);

    const resetGame = useCallback((s) => {
        s.phase = PHASE.INTRO;
        s.playerScore = 0;
        s.aiScore = 0;
        s.round = 1;
        s.totalRounds = ROUNDS_PER_SIDE;
        s.isSuddenDeath = false;
        s.roundResults = [];
        s.aimX = 0;
        s.aimY = 0.5;
        s.resultShown = false;
        s.resultTimer = 0;
        s.ballRotation = 0;
        s.screenShake = 0;
        setUiPhase(PHASE.INTRO);
        setScores({ player: 0, ai: 0 });
        setRound(1);
        setTotalRounds(ROUNDS_PER_SIDE);
        setFinalResult(null);
    }, []);

    // ── Canvas 绑定触摸事件 ───────────────────

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const opts = { passive: false };
        canvas.addEventListener('touchstart', handlePointerDown, opts);
        canvas.addEventListener('touchmove', handlePointerMove, opts);
        canvas.addEventListener('touchend', handlePointerUp, opts);
        canvas.addEventListener('mousedown', handlePointerDown);
        canvas.addEventListener('mousemove', handlePointerMove);
        canvas.addEventListener('mouseup', handlePointerUp);
        return () => {
            canvas.removeEventListener('touchstart', handlePointerDown);
            canvas.removeEventListener('touchmove', handlePointerMove);
            canvas.removeEventListener('touchend', handlePointerUp);
            canvas.removeEventListener('mousedown', handlePointerDown);
            canvas.removeEventListener('mousemove', handlePointerMove);
            canvas.removeEventListener('mouseup', handlePointerUp);
        };
    }, [handlePointerDown, handlePointerMove, handlePointerUp]);

    // ── 主渲染循环 ────────────────────────────

    const draw = useCallback((ctx, w, h, dt) => {
        const s = stateRef.current;

        // 全局时间
        s.gameTime += dt;
        s.jitterPhase += dt * 4;

        // 屏幕震动衰减
        if (s.screenShake > 0) s.screenShake *= 0.9;

        // 应用屏幕震动
        if (s.screenShake > 0.5) {
            ctx.save();
            ctx.translate(
                (Math.random() - 0.5) * s.screenShake,
                (Math.random() - 0.5) * s.screenShake
            );
        }

        // ── 绘制场景 ──
        drawGrass(ctx, w, h);
        drawGoal(ctx, w, h);

        // ── 阶段逻辑 ──
        if (s.phase === PHASE.INTRO) {
            drawKeeper(ctx, w, h, 0, 0);
            drawBall(ctx, w / 2, h * 0.75, 1, s.gameTime * 0.5);
            drawIntroScreen(ctx, w, h, s.gameTime);
            if (s.screenShake > 0.5) ctx.restore();
            updateAndDrawParticles(ctx, dt);
            return;
        }

        if (s.phase === PHASE.AIM) {
            drawKeeper(ctx, w, h, 0, 0);
            drawBall(ctx, w / 2, h * 0.75, 1, 0);

            // 准星（带晃动）
            const g = goalRect(w, h);
            const cx = g.left + (s.aimX / 2 + 0.5) * g.width;
            const cy = g.top + (1 - s.aimY) * g.height;
            const jx = Math.sin(s.jitterPhase * 2.7) * AIM_JITTER * w;
            const jy = Math.cos(s.jitterPhase * 3.1) * AIM_JITTER * h;
            drawCrosshair(ctx, cx, cy, w, h, jx, jy, s.gameTime);

            // 瞄准超时倒计时
            const elapsed = performance.now() - s.aimStartTime;
            const remaining = Math.max(0, AIM_TIMEOUT_MS - elapsed);
            if (remaining <= 0 && !s.aimLocked) {
                s.power = 0.3 + Math.random() * 0.3;
                s.powerLocked = true;
                shootBall(s);
            } else {
                drawHint(ctx, w, h, '触摸球门选择方向', `松手确认 (${(remaining / 1000).toFixed(1)}s)`);
            }

            drawScoreboard(ctx, w, h, s.playerScore, s.aiScore, s.round, s.totalRounds, s.phase, s.isSuddenDeath);
            if (s.screenShake > 0.5) ctx.restore();
            updateAndDrawParticles(ctx, dt);
            return;
        }

        if (s.phase === PHASE.POWER) {
            drawKeeper(ctx, w, h, 0, 0);
            drawBall(ctx, w / 2, h * 0.75, 1, 0);

            // 力度条摆动
            if (!s.powerLocked) {
                s.power += s.powerDir * POWER_SPEED * dt;
                if (s.power >= 1) { s.power = 1; s.powerDir = -1; }
                if (s.power <= 0) { s.power = 0; s.powerDir = 1; }
            }

            // 准星（固定+呼吸）
            const g = goalRect(w, h);
            const cx = g.left + (s.aimX / 2 + 0.5) * g.width;
            const cy = g.top + (1 - s.aimY) * g.height;
            drawCrosshair(ctx, cx, cy, w, h, 0, 0, s.gameTime);
            drawPowerBar(ctx, w, h, s.power, 'power', s.gameTime);
            drawHint(ctx, w, h, '点击确认力度！', '');
            drawScoreboard(ctx, w, h, s.playerScore, s.aiScore, s.round, s.totalRounds, s.phase, s.isSuddenDeath);
            if (s.screenShake > 0.5) ctx.restore();
            updateAndDrawParticles(ctx, dt);
            return;
        }

        if (s.phase === PHASE.FLIGHT) {
            s.flightT += dt;
            const t = Math.min(1, s.flightT / s.flightDuration);

            // 球旋转
            s.ballRotation += dt * 15;

            // 守门员扑救动画（手臂跟随扑救方向）
            s.keeperDiveProgress = Math.min(1, s.keeperDiveProgress + dt * 3);
            drawKeeper(ctx, w, h, s.keeperDiveX, s.keeperDiveProgress);

            // 球飞行
            const ball = interpolateBallFlight(t, s.ballStart.x, s.ballStart.y, s.ballEnd.x, s.ballEnd.y);
            drawBall(ctx, ball.x, ball.y, ball.scale, s.ballRotation);

            drawScoreboard(ctx, w, h, s.playerScore, s.aiScore, s.round, s.totalRounds, s.phase, s.isSuddenDeath);

            if (t >= 1) {
                s.phase = PHASE.RESULT;
                s.resultTimer = 0;
                s.screenShake = s.isGoal ? 12 : (s.shot.hitPost ? 8 : (s.keeperDecision.saved ? 5 : 0));
                setUiPhase(PHASE.RESULT);
            }
            if (s.screenShake > 0.5) ctx.restore();
            updateAndDrawParticles(ctx, dt);
            return;
        }

        if (s.phase === PHASE.RESULT) {
            s.resultTimer += dt;
            drawKeeper(ctx, w, h, s.keeperDiveX, 1);

            if (s.isGoal) {
                // 进球：球停在网中 + 球网鼓包动画
                drawBall(ctx, s.ballEnd.x, s.ballEnd.y, 0.55, s.ballRotation);
                drawNetBulge(ctx, w, h, s.ballEnd.x, s.ballEnd.y, s.resultTimer);
            } else if (s.keeperDecision.saved) {
                // 扑出：球弹飞动画
                drawSaveBounce(ctx, w, h, s.ballEnd.x, s.ballEnd.y, s.keeperDiveX, s.resultTimer);
            }
            // 射偏/中柱不画球（球已飞出画面）

            drawResultText(ctx, w, h, s.isGoal, s.shot.hitPost, s.keeperDecision.saved, s.resultTimer);
            drawScoreboard(ctx, w, h, s.playerScore, s.aiScore, s.round, s.totalRounds, s.phase, s.isSuddenDeath);

            if (s.resultTimer > 1.5) {
                drawHint(ctx, w, h, '', '点击继续');
            }
            if (s.screenShake > 0.5) ctx.restore();
            updateAndDrawParticles(ctx, dt);
            return;
        }

        if (s.phase === PHASE.SUMMARY) {
            drawKeeper(ctx, w, h, 0, 0);
            drawSummaryScreen(ctx, w, h, s, s.gameTime);
            if (s.screenShake > 0.5) ctx.restore();
            updateAndDrawParticles(ctx, dt);
            return;
        }

        if (s.screenShake > 0.5) ctx.restore();
        updateAndDrawParticles(ctx, dt);
    }, [shootBall]);

    useGameLoop(canvasRef, draw);

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 9999,
            background: '#000', touchAction: 'none',
            userSelect: 'none', WebkitUserSelect: 'none',
        }}>
            {onBack && (
                <button
                    onClick={onBack}
                    style={{
                        position: 'absolute', top: 16, left: 16, zIndex: 10001,
                        background: 'rgba(0,0,0,0.45)', color: '#fff',
                        border: '1px solid rgba(255,255,255,0.15)',
                        borderRadius: 20, padding: '6px 18px',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer',
                        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
                        letterSpacing: 1,
                    }}
                >
                    ‹ 返回
                </button>
            )}
            <canvas
                ref={canvasRef}
                style={{ width: '100%', height: '100%', display: 'block' }}
            />
        </div>
    );
}

// ── 开始界面 ──────────────────────────────────

function drawIntroScreen(ctx, w, h, time = 0) {
    // 渐变遮罩
    const overlayGrad = ctx.createLinearGradient(0, 0, 0, h);
    overlayGrad.addColorStop(0, 'rgba(5,10,25,0.75)');
    overlayGrad.addColorStop(0.5, 'rgba(5,10,25,0.6)');
    overlayGrad.addColorStop(1, 'rgba(5,10,25,0.8)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;

    // 装饰光环
    const ringPulse = 1 + Math.sin(time * 2) * 0.05;
    ctx.strokeStyle = 'rgba(255,215,0,0.15)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, h * 0.26, w * 0.1 * ringPulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,215,0,0.08)';
    ctx.beginPath();
    ctx.arc(cx, h * 0.26, w * 0.14 * ringPulse, 0, Math.PI * 2);
    ctx.stroke();

    // 足球图标
    ctx.font = `${Math.round(w * 0.06)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚽', cx, h * 0.26);

    // 标题
    ctx.font = `900 ${Math.round(w * 0.05)}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 3;
    ctx.strokeText('点球大战', cx, h * 0.37);
    ctx.fillText('点球大战', cx, h * 0.37);

    // 副标题
    ctx.font = `500 ${Math.round(w * 0.018)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,215,0,0.7)';
    ctx.fillText('PENALTY SHOOTOUT  ·  FIFA RULES', cx, h * 0.43);

    // 分隔线
    const lineW = w * 0.25;
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - lineW, h * 0.47);
    ctx.lineTo(cx + lineW, h * 0.47);
    ctx.stroke();

    // 规则说明
    ctx.font = `${Math.round(w * 0.016)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    const rules = [
        '每方 5 球，平局进入加时赛',
        '触摸球门选择射门方向',
        '点击锁定射门力度',
        '力度 55%-85% 为最佳区间',
    ];
    rules.forEach((text, i) => {
        ctx.fillText(text, cx, h * 0.52 + i * h * 0.045);
    });

    // 开始按钮（呼吸脉冲）
    const btnW = w * 0.28;
    const btnH = h * 0.075;
    const btnX = cx - btnW / 2;
    const btnY = h * 0.76;
    const btnPulse = 1 + Math.sin(time * 3) * 0.02;

    ctx.save();
    ctx.translate(cx, btnY + btnH / 2);
    ctx.scale(btnPulse, btnPulse);
    ctx.translate(-cx, -(btnY + btnH / 2));

    // 按钮光晕
    ctx.shadowColor = 'rgba(68,255,136,0.4)';
    ctx.shadowBlur = 20;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#22c55e');
    btnGrad.addColorStop(1, '#16a34a');
    ctx.fillStyle = btnGrad;

    drawRoundRect(ctx, btnX, btnY, btnW, btnH, btnH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = `bold ${Math.round(w * 0.024)}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText('开始比赛', cx, btnY + btnH / 2);

    ctx.restore();
}

// ── 结算界面 ──────────────────────────────────

function drawSummaryScreen(ctx, w, h, s, time = 0) {
    // 深色渐变遮罩
    const overlayGrad = ctx.createLinearGradient(0, 0, 0, h);
    overlayGrad.addColorStop(0, 'rgba(5,10,25,0.8)');
    overlayGrad.addColorStop(1, 'rgba(5,10,25,0.85)');
    ctx.fillStyle = overlayGrad;
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const win = s.playerScore > s.aiScore;

    // 奖杯/表情
    ctx.font = `${Math.round(w * 0.07)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(win ? '🏆' : '😔', cx, h * 0.2);

    // 结果大字
    ctx.font = `900 ${Math.round(w * 0.045)}px sans-serif`;
    ctx.fillStyle = win ? COLORS.gold : '#aaa';
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 2;
    ctx.strokeText(win ? '恭喜获胜！' : '遗憾落败', cx, h * 0.3);
    ctx.fillText(win ? '恭喜获胜！' : '遗憾落败', cx, h * 0.3);

    // 比分面板
    const panelW = w * 0.4;
    const panelH = h * 0.12;
    const panelX = cx - panelW / 2;
    const panelY = h * 0.37;

    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    drawRoundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    drawRoundRect(ctx, panelX, panelY, panelW, panelH, 16);
    ctx.stroke();

    const scoreFontSize = Math.round(w * 0.06);
    ctx.font = `900 ${scoreFontSize}px sans-serif`;
    const pcy = panelY + panelH / 2;
    ctx.fillStyle = COLORS.scoreGreen;
    ctx.fillText(String(s.playerScore), cx - panelW * 0.22, pcy);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.font = `bold ${Math.round(scoreFontSize * 0.6)}px sans-serif`;
    ctx.fillText('–', cx, pcy);
    ctx.font = `900 ${scoreFontSize}px sans-serif`;
    ctx.fillStyle = COLORS.scoreRed;
    ctx.fillText(String(s.aiScore), cx + panelW * 0.22, pcy);

    // 标签
    ctx.font = `${Math.round(w * 0.014)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText('你', cx - panelW * 0.22, panelY + panelH + w * 0.018);
    ctx.fillText('门将', cx + panelW * 0.22, panelY + panelH + w * 0.018);

    if (s.isSuddenDeath) {
        ctx.font = `bold ${Math.round(w * 0.016)}px sans-serif`;
        ctx.fillStyle = COLORS.gold;
        ctx.fillText('加时赛', cx, panelY + panelH + w * 0.04);
    }

    // 射门记录
    const recordY = h * 0.62;
    ctx.font = `${Math.round(w * 0.013)}px sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fillText('射门记录', cx, recordY - w * 0.02);

    const dotSize = Math.min(w * 0.025, 14);
    const dotGap = dotSize * 2;
    const totalDotsW = (s.roundResults.length - 1) * dotGap;
    const dotStartX = cx - totalDotsW / 2;

    s.roundResults.forEach((r, i) => {
        const dx = dotStartX + i * dotGap;
        ctx.beginPath();
        ctx.arc(dx, recordY + dotSize, dotSize * 0.6, 0, Math.PI * 2);
        ctx.fillStyle = r.goal ? COLORS.scoreGreen : 'rgba(255,80,80,0.6)';
        ctx.fill();
        if (r.goal) {
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.round(dotSize * 0.7)}px sans-serif`;
            ctx.fillText('✓', dx, recordY + dotSize);
        } else {
            ctx.fillStyle = '#fff';
            ctx.font = `bold ${Math.round(dotSize * 0.7)}px sans-serif`;
            ctx.fillText('✕', dx, recordY + dotSize);
        }
    });

    // 再来一局按钮（呼吸脉冲）
    const btnW = w * 0.28;
    const btnH = h * 0.065;
    const btnX = cx - btnW / 2;
    const btnY = h * 0.78;
    const btnPulse = 1 + Math.sin(time * 3) * 0.015;

    ctx.save();
    ctx.translate(cx, btnY + btnH / 2);
    ctx.scale(btnPulse, btnPulse);
    ctx.translate(-cx, -(btnY + btnH / 2));

    ctx.shadowColor = 'rgba(99,102,241,0.4)';
    ctx.shadowBlur = 15;

    const btnGrad = ctx.createLinearGradient(btnX, btnY, btnX + btnW, btnY + btnH);
    btnGrad.addColorStop(0, '#6366f1');
    btnGrad.addColorStop(1, '#4f46e5');
    ctx.fillStyle = btnGrad;
    drawRoundRect(ctx, btnX, btnY, btnW, btnH, btnH / 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.font = `bold ${Math.round(w * 0.02)}px sans-serif`;
    ctx.fillStyle = '#fff';
    ctx.fillText('再来一局', cx, btnY + btnH / 2);

    ctx.restore();
}

// ── 辅助绘制函数 ─────────────────────────────

function drawRoundRect(ctx, x, y, w, h, r) {
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
