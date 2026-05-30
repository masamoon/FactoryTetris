import { GAME_CONFIG } from '../config/gameConfig';
import { getLevelColor, getLevelName, getLevelPoints } from '../config/resourceLevels';

export function getItemColorConfig(itemColor) {
  const colorKey = itemColor || GAME_CONFIG.defaultItemColor || 'blue';
  return (
    GAME_CONFIG.itemColors?.[colorKey] ||
    GAME_CONFIG.itemColors?.[GAME_CONFIG.defaultItemColor] ||
    GAME_CONFIG.itemColors?.blue ||
    null
  );
}

export function getItemColorHex(itemColor, fallback = 0x3f8cff) {
  return getItemColorConfig(itemColor)?.color || fallback;
}

export function getItemColorText(itemColor, fallback = '#3f8cff') {
  return getItemColorConfig(itemColor)?.textColor || fallback;
}

export function getItemColorName(itemColor) {
  return getItemColorConfig(itemColor)?.name || itemColor || 'Color';
}

export function getItemColorKey(itemData, fallbackColor = GAME_CONFIG.defaultItemColor || 'blue') {
  if (typeof itemData === 'string') return itemData;
  return itemData?.itemColor || fallbackColor;
}

export function getSourceItemColor(resourceTypeId, fallbackIndex = 0) {
  const cycle = GAME_CONFIG.sourceColorCycle || [GAME_CONFIG.defaultItemColor || 'blue'];
  if (cycle.length > 0) {
    return cycle[fallbackIndex % cycle.length] || GAME_CONFIG.defaultItemColor || 'blue';
  }

  const resourceType = GAME_CONFIG.resourceTypes.find((resource) => resource.id === resourceTypeId);
  return resourceType?.itemColor || GAME_CONFIG.defaultItemColor || 'blue';
}

export function getMixedItemColor() {
  return GAME_CONFIG.mixedItemColor || 'purple';
}

export function getWildcardItemColor() {
  return GAME_CONFIG.wildcardItemColor || 'wild';
}

export function isWildcardItemColor(itemColor) {
  return itemColor === getWildcardItemColor();
}

export function itemColorMatchesDemand(itemColor, demandColor) {
  return !demandColor || itemColor === demandColor || isWildcardItemColor(itemColor);
}

export function getResourceLevel(itemData) {
  return Math.max(1, Math.floor(Number(itemData?.level) || 1));
}

export function createLevelResource(level = 1, itemColor = null) {
  const colorKey = itemColor || GAME_CONFIG.defaultItemColor || 'blue';
  return {
    type: 'level-resource',
    level: getResourceLevel({ level }),
    itemColor: colorKey,
    amount: 1,
  };
}

export function processLevelResource(resource) {
  return {
    type: 'level-resource',
    level: getResourceLevel(resource) + 1,
    itemColor: getItemColorKey(resource),
    amount: resource?.amount || 1,
  };
}

export function getLevelScale(level) {
  return 0.85 + (getResourceLevel({ level }) - 1) * 0.05;
}

export function shouldShowLevelGlow(level) {
  return getResourceLevel({ level }) >= 4;
}

export function shouldShowLevelTrail(level) {
  return getResourceLevel({ level }) >= 3;
}

export function getLevelGlowIntensity(level) {
  if (!shouldShowLevelGlow(level)) return 0;
  return Math.min(0.8, (getResourceLevel({ level }) - 3) * 0.2);
}

export function getLevelDisplayColor(level, time = 0) {
  const numericLevel = getResourceLevel({ level });
  if (numericLevel <= 12) return getLevelColor(numericLevel);

  const hue = (time / 1000) % 1;
  return hslToHex(hue, 1, 0.7);
}

export function getLevelDisplayName(level) {
  return getLevelName(getResourceLevel({ level }));
}

export function getLevelScore(level) {
  return getLevelPoints(getResourceLevel({ level }));
}

function hslToHex(h, s, l) {
  let r;
  let g;
  let b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  const toHex = (x) => {
    const hex = Math.round(x * 255).toString(16);
    return hex.length === 1 ? `0${hex}` : hex;
  };

  return parseInt(`${toHex(r)}${toHex(g)}${toHex(b)}`, 16);
}
