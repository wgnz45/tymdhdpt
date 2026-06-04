/**
 * 点球大战游戏常量
 * 基于 FIFA/IFAB 规则设计
 */

// 球门尺寸（米），FIFA 标准: 7.32m × 2.44m
export const GOAL_WIDTH_M = 7.32;
export const GOAL_HEIGHT_M = 2.44;
export const PENALTY_DISTANCE_M = 11;

// 游戏阶段
export const PHASE = {
    INTRO: 'intro',           // 开始界面
    AIM: 'aim',               // 瞄准阶段
    POWER: 'power',           // 力度阶段
    FLIGHT: 'flight',         // 弹道飞行
    RESULT: 'result',         // 本球结果
    SUMMARY: 'summary',       // 总结算
};

// 比赛规则
export const ROUNDS_PER_SIDE = 5;    // 常规每方5球
export const MAX_SUDDEN_DEATH = 10;  // 突然死亡最多10轮

// 力度条
export const POWER_SPEED = 1.2;      // 力度条摆动速度 (周期/秒)
export const POWER_MIN = 0;
export const POWER_MAX = 1;
export const POWER_SWEET_LOW = 0.55;  // 最佳力度区间下界
export const POWER_SWEET_HIGH = 0.85; // 最佳力度区间上界
export const POWER_OVER = 0.95;       // 过力阈值

// 瞄准
export const AIM_TIMEOUT_MS = 4000;   // 瞄准超时（毫秒）
export const AIM_JITTER = 0.015;      // 准星晃动幅度

// 守门员 AI 难度
export const DIFFICULTY = {
    EASY:   { catchRate: 0.25, reactionSpeed: 0.3, name: '简单' },
    NORMAL: { catchRate: 0.40, reactionSpeed: 0.5, name: '普通' },
    HARD:   { catchRate: 0.60, reactionSpeed: 0.7, name: '困难' },
};

// 弹道
export const BALL_FLIGHT_DURATION = 0.7; // 球飞行时间（秒）
export const BALL_RADIUS = 20;           // 球渲染半径（像素）— 近处大，远处按 scale 缩小

// 颜色主题
export const COLORS = {
    grass: '#2d8a4e',
    grassStripe: '#33994f',
    goalPost: '#ffffff',
    goalNet: 'rgba(200,200,200,0.4)',
    ball: '#ffffff',
    ballOutline: '#333333',
    crosshair: '#ff3333',
    crosshairShadow: 'rgba(0,0,0,0.3)',
    powerBarBg: 'rgba(0,0,0,0.3)',
    powerWeak: '#ffcc00',
    powerGood: '#44cc44',
    powerOver: '#ff4444',
    keeper: '#ffcc00',     // 守门员颜色
    keeperGloves: '#44aaff',
    uiBg: 'rgba(0,0,0,0.6)',
    uiText: '#ffffff',
    gold: '#ffd700',
    scoreGreen: '#44ff88',
    scoreRed: '#ff5555',
};
