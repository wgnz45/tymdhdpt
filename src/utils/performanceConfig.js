function isBoxDisplayMode({ isBoxMode = false } = {}) {
  return Boolean(isBoxMode);
}

export function isAndroidDevice() {
  return /Android/i.test(navigator.userAgent || '');
}

export function shouldUpdateState(currentValue, nextValue) {
  try {
    return JSON.stringify(currentValue) !== JSON.stringify(nextValue);
  } catch {
    return true;
  }
}

export function getHeartbeatIntervalMs({ isBoxMode = false } = {}) {
  return isBoxDisplayMode({ isBoxMode }) ? 30000 : 15000;
}

export function getHomePollingIntervalMs({ isBoxMode = false } = {}) {
  return isBoxDisplayMode({ isBoxMode }) ? 180000 : 60000;
}

export function getPortalStoreIntervalMs({ isBoxMode = false } = {}) {
  return isBoxDisplayMode({ isBoxMode }) ? 30000 : 10000;
}

export function getPortalAnnouncementsIntervalMs({ isBoxMode = false } = {}) {
  return isBoxDisplayMode({ isBoxMode }) ? 60000 : 15000;
}

export function getPortalSourcesIntervalMs({ isBoxMode = false } = {}) {
  return isBoxDisplayMode({ isBoxMode }) ? 120000 : 30000;
}

export function getNoisePhaseIntervalMs({ isBoxMode = false } = {}) {
  return isBoxDisplayMode({ isBoxMode }) ? 120 : 50;
}
