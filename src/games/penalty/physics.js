/**
 * 点球弹道物理 + 守门员 AI
 *
 * aimX: -1(左)~1(右), aimY: 0(地面)~1(横梁)
 * power: 0~1
 */
import {
    GOAL_WIDTH_M, GOAL_HEIGHT_M, PENALTY_DISTANCE_M,
    POWER_SWEET_LOW, POWER_SWEET_HIGH, POWER_OVER,
    BALL_FLIGHT_DURATION,
} from './constants';

/**
 * 计算球的最终落点（球门坐标系）
 * @returns {{ x: number, y: number, isOnTarget: boolean, hitPost: boolean, flightTime: number }}
 */
export function calculateShot(aimX, aimY, power) {
    const halfW = GOAL_WIDTH_M / 2;
    const goalH = GOAL_HEIGHT_M;

    // 基础落点
    let targetX = aimX * halfW;
    let targetY = aimY * goalH;

    // 力度影响
    const isSweet = power >= POWER_SWEET_LOW && power <= POWER_SWEET_HIGH;
    const isOver = power >= POWER_OVER;
    const isWeak = power < 0.3;

    // 散布计算：力度不在最佳区间时散布增大
    let spread = 0.08;
    if (isOver) spread = 0.6;        // 过力：大散布（可能飞天）
    else if (isWeak) spread = 0.35;  // 弱力：中散布
    else if (!isSweet) spread = 0.2;

    const randX = (Math.random() - 0.5) * 2 * spread * halfW;
    const randY = (Math.random() - 0.5) * 2 * spread * goalH;

    let finalX = targetX + randX;
    let finalY = targetY + randY;

    // 过力：球容易打高
    if (isOver) {
        finalY += (Math.random() * 0.4 + 0.2) * goalH;
    }

    // 弱力：球速慢，高度偏低
    if (isWeak) {
        finalY = Math.max(0, finalY * 0.5);
    }

    // 判定
    const isInGoalX = Math.abs(finalX) <= halfW;
    const isInGoalY = finalY >= 0 && finalY <= goalH;
    const isOnTarget = isInGoalX && isInGoalY;

    // 中柱判定
    const postMargin = 0.12;
    const hitLeftPost = Math.abs(finalX + halfW) < postMargin && finalY >= 0 && finalY <= goalH;
    const hitRightPost = Math.abs(finalX - halfW) < postMargin && finalY >= 0 && finalY <= goalH;
    const hitCrossbar = Math.abs(finalY - goalH) < postMargin && isInGoalX;
    const hitPost = hitLeftPost || hitRightPost || hitCrossbar;

    return {
        x: finalX,
        y: finalY,
        isOnTarget,
        hitPost,
        flightTime: BALL_FLIGHT_DURATION * (isWeak ? 1.5 : 1),
        power,
    };
}

/**
 * 守门员 AI 扑救决策
 * @param {{ x: number, y: number }} shot - 球的最终落点
 * @param {object} difficulty - 难度配置
 * @returns {{ diveX: number, diveY: number, saved: boolean }}
 */
export function goalkeeperDecision(shot, difficulty) {
    const { catchRate, reactionSpeed } = difficulty;

    // 守门员猜测方向（有偏向球的方向的概率）
    const guessCorrect = Math.random() < (catchRate + reactionSpeed * 0.2);

    let diveX, diveY;
    if (guessCorrect) {
        // 猜对方向：朝球的方向扑（加小随机偏移）
        diveX = shot.x + (Math.random() - 0.5) * 0.6;
        diveY = Math.min(shot.y + (Math.random() - 0.5) * 0.4, GOAL_HEIGHT_M);
    } else {
        // 猜错：随机方向
        diveX = (Math.random() - 0.5) * GOAL_WIDTH_M;
        diveY = Math.random() * GOAL_HEIGHT_M * 0.7;
    }

    // 扑救成功判定：守门员手臂到球的距离
    const dx = Math.abs(diveX - shot.x);
    const dy = Math.abs(diveY - shot.y);
    const reachDistance = Math.sqrt(dx * dx + dy * dy);

    // 守门员臂展约 2 米，但需要考虑反应时间
    const effectiveReach = 1.2 * reactionSpeed;
    const saved = shot.isOnTarget && reachDistance < effectiveReach;

    // 归一化扑救方向（-1 到 1），供渲染使用
    const normalizedDiveX = Math.max(-1, Math.min(1, diveX / (GOAL_WIDTH_M / 2)));

    return { diveX, diveY, saved, normalizedDiveX };
}

/**
 * 球飞行插值（用于动画）
 * @param {number} t - 0~1 飞行进度
 * @param {{ x: number, y: number }} start - 起始位置（画布坐标）
 * @param {{ x: number, y: number }} end - 终点位置（画布坐标）
 * @returns {{ x: number, y: number, scale: number }}
 */
export function interpolateBallFlight(t, startX, startY, endX, endY) {
    // 缓动：先慢后快（模拟透视感）
    const eased = t * t;

    const x = startX + (endX - startX) * eased;
    // Y 轴加一个抛物线弧度
    const arcHeight = -150 * t * (1 - t); // 最高点在中间
    const baseY = startY + (endY - startY) * eased;
    const y = baseY + arcHeight;

    // 球随距离缩小（近大远小）
    const scale = 1 - eased * 0.6;

    return { x, y, scale: Math.max(0.2, scale) };
}
