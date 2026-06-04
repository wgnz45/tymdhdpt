// 门户页面活跃状态标志
// StoreClientLayout 隐藏门户时设为 false，释放 CPU 给游戏页面
export let portalActive = true;
export function setPortalActive(v) { portalActive = v; }
