export const DEFAULT_GAME_SETTINGS = {
  audioVolume: 0.8,
  muted: false,
  inputMode: 'desktop',
  showTutorialTips: true,
};

const STORAGE_KEY = 'gridforge.settings';
const META_STORAGE_KEY = 'gridforge.metaUnlocks';

export const DEFAULT_META_UNLOCKS = {
  undergroundBelts: false,
};

function normalizeSettings(settings = {}) {
  const audioVolume = Number(settings.audioVolume);
  const inputMode = settings.inputMode === 'touch' ? 'touch' : 'desktop';

  return {
    ...DEFAULT_GAME_SETTINGS,
    ...settings,
    audioVolume: Number.isFinite(audioVolume)
      ? Math.min(1, Math.max(0, audioVolume))
      : DEFAULT_GAME_SETTINGS.audioVolume,
    muted: Boolean(settings.muted),
    inputMode,
    showTutorialTips: settings.showTutorialTips !== false,
  };
}

export function loadGameSettings() {
  if (typeof globalThis.localStorage === 'undefined') {
    return { ...DEFAULT_GAME_SETTINGS };
  }

  try {
    const stored = globalThis.localStorage.getItem(STORAGE_KEY);
    return normalizeSettings(stored ? JSON.parse(stored) : DEFAULT_GAME_SETTINGS);
  } catch (_error) {
    return { ...DEFAULT_GAME_SETTINGS };
  }
}

export function saveGameSettings(patch) {
  const settings = normalizeSettings({
    ...loadGameSettings(),
    ...patch,
  });

  if (typeof globalThis.localStorage !== 'undefined') {
    try {
      globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (_error) {
      // Settings still apply for this session when storage is unavailable.
    }
  }

  return settings;
}

export function resetGameSettings() {
  if (typeof globalThis.localStorage !== 'undefined') {
    try {
      globalThis.localStorage.removeItem(STORAGE_KEY);
    } catch (_error) {
      // Ignore storage failures and return defaults.
    }
  }

  return { ...DEFAULT_GAME_SETTINGS };
}

function normalizeMetaUnlocks(unlocks = {}) {
  return {
    ...DEFAULT_META_UNLOCKS,
    ...unlocks,
    undergroundBelts: Boolean(unlocks.undergroundBelts),
  };
}

export function loadMetaUnlocks() {
  if (typeof globalThis.localStorage === 'undefined') {
    return { ...DEFAULT_META_UNLOCKS };
  }

  try {
    const stored = globalThis.localStorage.getItem(META_STORAGE_KEY);
    return normalizeMetaUnlocks(stored ? JSON.parse(stored) : DEFAULT_META_UNLOCKS);
  } catch (_error) {
    return { ...DEFAULT_META_UNLOCKS };
  }
}

export function saveMetaUnlocks(patch) {
  const unlocks = normalizeMetaUnlocks({
    ...loadMetaUnlocks(),
    ...patch,
  });

  if (typeof globalThis.localStorage !== 'undefined') {
    try {
      globalThis.localStorage.setItem(META_STORAGE_KEY, JSON.stringify(unlocks));
    } catch (_error) {
      // The current session can still use the unlock if persistence fails.
    }
  }

  return unlocks;
}
