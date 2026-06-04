import { useState } from 'react';

function detectLowPerformance() {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/i.test(ua);
  // Android TV / 平板 / 机顶盒统一走低性能模式
  // 这些设备 GPU 弱、内存少，backdrop-blur / 复杂阴影 / 装饰动画都会卡顿
  if (isAndroid) return true;
  // 非 Android 也检查低内存
  if (navigator.deviceMemory && navigator.deviceMemory <= 4) return true;
  return false;
}

export function usePerformanceMode() {
  const [isLowPerf] = useState(() => detectLowPerformance());
  return isLowPerf;
}
