import { GRID_CONFIG } from '../config/gameConfig';
import { BOARD_TEMPLATE_SEQUENCE, BOARD_TEMPLATES, BOARD_TILE_TYPES } from '../config/boardConfig';

const TEMPLATE_BY_ID = Object.values(BOARD_TEMPLATES).reduce((lookup, template) => {
  lookup[template.id] = template;
  return lookup;
}, {});

export default class BoardGenerator {
  constructor(options = {}) {
    this.gridConfig = options.gridConfig || GRID_CONFIG;
    this.runSeed =
      options.runSeed ||
      `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
  }

  createRoundBoard(round = 1, options = {}) {
    const width = options.width || this.gridConfig.width;
    const height = options.height || this.gridConfig.height;
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    const rng = this.createRoundRng(round);
    const mirrorX = rng() < 0.5;
    const mirrorCellX = (x) => (mirrorX ? width - 1 - x : x);
    const blockers = [];
    const specialTiles = [];
    const addBlocker = (x, y) => {
      x = mirrorCellX(x);
      if (x <= 0 || x >= width - 1 || y < 0 || y >= height) return;
      const key = `${x},${y}`;
      if (blockers.some((cell) => `${cell.x},${cell.y}` === key)) return;
      if (specialTiles.some((cell) => `${cell.x},${cell.y}` === key)) return;
      blockers.push({ x, y });
    };
    const addSpecialTile = (x, y, type) => {
      x = mirrorCellX(x);
      if (x <= 0 || x >= width - 1 || y < 0 || y >= height) return;
      const key = `${x},${y}`;
      if (blockers.some((cell) => `${cell.x},${cell.y}` === key)) return;
      if (specialTiles.some((cell) => `${cell.x},${cell.y}` === key)) return;
      specialTiles.push({ x, y, type });
    };

    if (round <= 1) {
      const starterTileX = this.clamp(midX - 1 + this.randomInt(rng, -1, 1), 1, width - 2);
      addSpecialTile(starterTileX, midY, BOARD_TILE_TYPES.POWER);
      return this.createBoardFromTemplate(BOARD_TEMPLATES.OPEN_FLOOR, round, {
        blockers,
        specialTiles,
        sourceRows: [midY],
        deliveryRows: [midY],
      });
    }

    const templateId = this.pickTemplateId(round, rng);
    if (templateId === BOARD_TEMPLATES.SPLIT_LANES.id) {
      const laneY = this.clamp(midY + this.randomInt(rng, -1, 1), 2, height - 3);
      const gateX = this.clamp(midX + this.randomInt(rng, -2, 2), 3, width - 4);
      const gateHalfWidth = rng() < 0.35 ? 0 : 1;
      for (let x = 2; x < width - 2; x++) {
        if (Math.abs(x - gateX) <= gateHalfWidth) continue;
        addBlocker(x, laneY);
      }
      addSpecialTile(gateX - 1, laneY - 1, BOARD_TILE_TYPES.QUALITY);
      addSpecialTile(gateX + 1, laneY + 1, BOARD_TILE_TYPES.QUALITY);
      addSpecialTile(gateX, laneY, BOARD_TILE_TYPES.TAXED);
      const laneOffset = rng() < 0.5 ? 2 : 3;
      return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
        blockers,
        specialTiles,
        sourceRows: this.shuffleRows(
          this.uniqueRows([laneY - laneOffset, laneY + laneOffset], height),
          rng
        ),
        deliveryRows: this.shuffleRows(
          this.uniqueRows([laneY - laneOffset, laneY + laneOffset], height),
          rng
        ),
      });
    }

    if (templateId === BOARD_TEMPLATES.CROSSFLOW_GATE.id) {
      const upperGate = this.clamp(2 + this.randomInt(rng, 0, 1), 1, height - 3);
      const lowerGate = this.clamp(height - 3 - this.randomInt(rng, 0, 1), 2, height - 2);
      const baffleX = this.clamp(midX + this.randomInt(rng, -1, 1), 2, width - 3);
      const gateRows = new Set(this.uniqueRows([upperGate, lowerGate], height));
      for (let y = 1; y < height - 1; y++) {
        if (gateRows.has(y)) continue;
        addBlocker(baffleX, y);
      }
      addSpecialTile(baffleX - 1, upperGate, BOARD_TILE_TYPES.POWER);
      addSpecialTile(baffleX + 1, lowerGate, BOARD_TILE_TYPES.QUALITY);
      addSpecialTile(baffleX - 1, midY + this.randomInt(rng, -1, 1), BOARD_TILE_TYPES.TAXED);
      const sourceRows = this.shuffleRows(this.uniqueRows([upperGate, lowerGate], height), rng);
      const deliveryRows = this.shuffleRows([...sourceRows], rng);
      return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
        blockers,
        specialTiles,
        sourceRows,
        deliveryRows,
      });
    }

    const islandShiftX = this.randomInt(rng, -1, 1);
    const islandRows = this.uniqueRows(
      [midY - 2 + this.randomInt(rng, -1, 0), midY + 2 + this.randomInt(rng, 0, 1)],
      height
    );
    for (const centerY of islandRows) {
      const islandX = this.clamp(midX - 1 + islandShiftX, 2, width - 4);
      addBlocker(islandX, centerY);
      addBlocker(islandX + 1, centerY);
      addBlocker(islandX, centerY + 1);
      addBlocker(islandX + 1, centerY + 1);
    }
    const tileShiftY = this.randomInt(rng, -1, 1);
    addSpecialTile(midX - 2 + islandShiftX, midY + tileShiftY, BOARD_TILE_TYPES.POWER);
    addSpecialTile(midX + 1 + islandShiftX, midY - tileShiftY, BOARD_TILE_TYPES.QUALITY);
    addSpecialTile(midX + 2 + islandShiftX, midY - 1, BOARD_TILE_TYPES.TAXED);
    addSpecialTile(midX + 2 + islandShiftX, midY + 1, BOARD_TILE_TYPES.TAXED);
    return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
      blockers,
      specialTiles,
      sourceRows: this.shuffleRows(
        this.uniqueRows([1, height - 2, midY + tileShiftY], height),
        rng
      ),
      deliveryRows: this.shuffleRows(
        this.uniqueRows([midY - tileShiftY, 1, height - 2], height),
        rng
      ),
    });
  }

  pickTemplateId(round, rng) {
    if (round > 1 && round % 4 === 0) {
      return BOARD_TEMPLATE_SEQUENCE[(Math.floor(round / 4) - 1) % BOARD_TEMPLATE_SEQUENCE.length];
    }

    const unlockedTemplates =
      round <= 3
        ? [BOARD_TEMPLATES.SPLIT_LANES.id, BOARD_TEMPLATES.CROSSFLOW_GATE.id]
        : BOARD_TEMPLATE_SEQUENCE;
    const fallbackId = BOARD_TEMPLATE_SEQUENCE[(round - 2) % BOARD_TEMPLATE_SEQUENCE.length];
    return rng() < 0.55 ? this.pick(unlockedTemplates, rng) : fallbackId;
  }

  createBoardFromTemplate(template, round, overrides = {}) {
    return {
      ...template,
      round,
      blockers: overrides.blockers || [],
      specialTiles: overrides.specialTiles || [],
      sourceRows: overrides.sourceRows || [],
      deliveryRows: overrides.deliveryRows || [],
    };
  }

  uniqueRows(rows, height) {
    return [...new Set(rows.map((row) => this.clamp(row, 0, height - 1)))];
  }

  shuffleRows(rows, rng) {
    const shuffled = [...rows];
    for (let index = shuffled.length - 1; index > 0; index--) {
      const swapIndex = this.randomInt(rng, 0, index);
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  pick(items, rng) {
    return items[this.randomInt(rng, 0, items.length - 1)];
  }

  randomInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  createRoundRng(round) {
    let seed = this.hashSeed(`${this.runSeed}:${round}`);
    return () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  hashSeed(value) {
    let hash = 2166136261;
    const text = String(value);
    for (let index = 0; index < text.length; index++) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
