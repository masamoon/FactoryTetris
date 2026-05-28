import { GRID_CONFIG } from '../config/gameConfig';
import {
  BOARD_OBSTACLE_TYPES,
  BOARD_TEMPLATE_SEQUENCE,
  BOARD_TEMPLATES,
  BOARD_TILE_TYPES,
} from '../config/boardConfig';

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
    const loanerUndergrounds = [];
    const addBlocker = (x, y, obstacleType = BOARD_OBSTACLE_TYPES.WALL) => {
      x = mirrorCellX(x);
      if (x <= 0 || x >= width - 1 || y < 0 || y >= height) return;
      const key = `${x},${y}`;
      if (blockers.some((cell) => `${cell.x},${cell.y}` === key)) return;
      if (specialTiles.some((cell) => `${cell.x},${cell.y}` === key)) return;
      blockers.push({ x, y, obstacleType });
    };
    const addSpecialTile = (x, y, type) => {
      x = mirrorCellX(x);
      if (x <= 0 || x >= width - 1 || y < 0 || y >= height) return;
      const key = `${x},${y}`;
      if (blockers.some((cell) => `${cell.x},${cell.y}` === key)) return;
      if (specialTiles.some((cell) => `${cell.x},${cell.y}` === key)) return;
      specialTiles.push({ x, y, type });
    };
    const addLoanerUnderground = (x, y, direction, label = 'Loaner tunnel') => {
      if (direction === 'right') {
        x = this.clamp(x, 1, width - 5);
      } else if (direction === 'down') {
        y = this.clamp(y, 0, height - 4);
        x = this.clamp(x, 1, width - 2);
      }
      loanerUndergrounds.push({
        id: `loaner-underground-${loanerUndergrounds.length + 1}`,
        x,
        y,
        direction,
        label,
      });
    };

    if (round <= 2) {
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
      addLoanerUnderground(mirrorCellX(gateX), laneY - 1, 'down', 'Lane crossing');
      const laneOffset = rng() < 0.5 ? 2 : 3;
      return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
        blockers,
        specialTiles,
        loanerUndergrounds,
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
      addLoanerUnderground(mirrorCellX(baffleX) - 1, midY, 'right', 'Crossflow tunnel');
      const sourceRows = this.shuffleRows(this.uniqueRows([upperGate, lowerGate], height), rng);
      const deliveryRows = this.shuffleRows([...sourceRows], rng);
      return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
        blockers,
        specialTiles,
        loanerUndergrounds,
        sourceRows,
        deliveryRows,
      });
    }

    if (templateId === BOARD_TEMPLATES.TOLL_MAZE.id) {
      const spineY = this.clamp(midY + this.randomInt(rng, -1, 1), 2, height - 3);
      const gateA = this.clamp(midX - 3 + this.randomInt(rng, -1, 1), 2, width - 5);
      const gateB = this.clamp(midX + 3 + this.randomInt(rng, -1, 1), 4, width - 3);
      for (let x = 2; x < width - 2; x++) {
        if (Math.abs(x - gateA) <= 0 || Math.abs(x - gateB) <= 0) continue;
        const type = x % 3 === 0 ? BOARD_OBSTACLE_TYPES.SCRAP : BOARD_OBSTACLE_TYPES.WALL;
        addBlocker(x, spineY, type);
      }
      for (let y = 1; y < height - 1; y++) {
        if (Math.abs(y - spineY) <= 1) continue;
        const toothX = y % 2 === 0 ? gateA - 1 : gateB + 1;
        addBlocker(toothX, y, BOARD_OBSTACLE_TYPES.LOCKED);
      }
      for (const x of this.uniqueColumns([gateA - 1, gateA, gateB, gateB + 1], width)) {
        addSpecialTile(x, spineY, BOARD_TILE_TYPES.TAXED);
      }
      addSpecialTile(gateA, spineY - 1, BOARD_TILE_TYPES.POWER);
      addSpecialTile(gateB, spineY + 1, BOARD_TILE_TYPES.QUALITY);
      addLoanerUnderground(mirrorCellX(gateA - 1), spineY - 2, 'right', 'Toll bypass');
      return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
        blockers,
        specialTiles,
        loanerUndergrounds,
        sourceRows: this.shuffleRows(this.uniqueRows([spineY - 3, spineY + 2, midY], height), rng),
        deliveryRows: this.shuffleRows(
          this.uniqueRows([spineY + 3, spineY - 2, height - 2], height),
          rng
        ),
      });
    }

    if (templateId === BOARD_TEMPLATES.TUNNEL_WORKS.id) {
      const baffleA = this.clamp(midX - 3 + this.randomInt(rng, -1, 1), 2, width - 5);
      const baffleB = this.clamp(midX + 3 + this.randomInt(rng, -1, 1), 4, width - 3);
      const upperGate = this.clamp(midY - 2 + this.randomInt(rng, -1, 1), 1, height - 3);
      const lowerGate = this.clamp(midY + 2 + this.randomInt(rng, -1, 1), 2, height - 2);
      for (let y = 1; y < height - 1; y++) {
        if (y !== upperGate) addBlocker(baffleA, y, BOARD_OBSTACLE_TYPES.LOCKED);
        if (y !== lowerGate) addBlocker(baffleB, y, BOARD_OBSTACLE_TYPES.SCRAP);
      }
      for (let x = 3; x < width - 3; x += 3) {
        if (Math.abs(x - baffleA) <= 1 || Math.abs(x - baffleB) <= 1) continue;
        addBlocker(x, midY, BOARD_OBSTACLE_TYPES.WALL);
      }
      addSpecialTile(baffleA - 1, upperGate, BOARD_TILE_TYPES.QUALITY);
      addSpecialTile(baffleB + 1, lowerGate, BOARD_TILE_TYPES.POWER);
      addSpecialTile(midX, midY - 1, BOARD_TILE_TYPES.TAXED);
      addSpecialTile(midX, midY + 1, BOARD_TILE_TYPES.TAXED);
      addLoanerUnderground(mirrorCellX(baffleA - 1), upperGate, 'right', 'Upper service tunnel');
      addLoanerUnderground(mirrorCellX(baffleB - 1), lowerGate, 'right', 'Lower service tunnel');
      addLoanerUnderground(mirrorCellX(midX), midY - 1, 'down', 'Drop tunnel');
      return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
        blockers,
        specialTiles,
        loanerUndergrounds,
        sourceRows: this.shuffleRows(this.uniqueRows([upperGate, lowerGate, 1], height), rng),
        deliveryRows: this.shuffleRows(
          this.uniqueRows([lowerGate, upperGate, height - 2], height),
          rng
        ),
      });
    }

    if (templateId === BOARD_TEMPLATES.FURNACE_ROWS.id) {
      const rowA = this.clamp(midY - 2 + this.randomInt(rng, -1, 0), 1, height - 4);
      const rowB = this.clamp(midY + 2 + this.randomInt(rng, 0, 1), 3, height - 2);
      const gateA = this.clamp(midX - 2 + this.randomInt(rng, -1, 1), 2, width - 4);
      const gateB = this.clamp(midX + 2 + this.randomInt(rng, -1, 1), 3, width - 3);
      for (let x = 2; x < width - 2; x++) {
        if (Math.abs(x - gateA) > 0) addBlocker(x, rowA, BOARD_OBSTACLE_TYPES.HEAT);
        if (Math.abs(x - gateB) > 0) addBlocker(x, rowB, BOARD_OBSTACLE_TYPES.HEAT);
      }
      for (const x of this.uniqueColumns([gateA - 1, gateA + 1, gateB - 1, gateB + 1], width)) {
        addSpecialTile(x, midY, BOARD_TILE_TYPES.TAXED);
      }
      addSpecialTile(gateA, rowA - 1, BOARD_TILE_TYPES.POWER);
      addSpecialTile(gateB, rowB + 1, BOARD_TILE_TYPES.QUALITY);
      addBlocker(midX, midY, BOARD_OBSTACLE_TYPES.SCRAP);
      addBlocker(midX + 1, midY, BOARD_OBSTACLE_TYPES.LOCKED);
      addLoanerUnderground(mirrorCellX(gateA), rowA - 1, 'down', 'Vent shaft');
      addLoanerUnderground(mirrorCellX(gateB - 2), rowB, 'right', 'Furnace bypass');
      return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
        blockers,
        specialTiles,
        loanerUndergrounds,
        sourceRows: this.shuffleRows(this.uniqueRows([rowA - 1, midY, rowB + 1], height), rng),
        deliveryRows: this.shuffleRows(this.uniqueRows([rowB + 1, rowA - 1, 1], height), rng),
      });
    }

    const islandShiftX = this.randomInt(rng, -1, 1);
    const islandRows = this.uniqueRows(
      [midY - 2 + this.randomInt(rng, -1, 0), midY + 2 + this.randomInt(rng, 0, 1)],
      height
    );
    for (const centerY of islandRows) {
      const islandX = this.clamp(midX - 1 + islandShiftX, 2, width - 4);
      addBlocker(islandX, centerY, BOARD_OBSTACLE_TYPES.SCRAP);
      addBlocker(islandX + 1, centerY, BOARD_OBSTACLE_TYPES.SCRAP);
      addBlocker(islandX, centerY + 1, BOARD_OBSTACLE_TYPES.WALL);
      addBlocker(islandX + 1, centerY + 1, BOARD_OBSTACLE_TYPES.WALL);
    }
    const tileShiftY = this.randomInt(rng, -1, 1);
    addSpecialTile(midX - 2 + islandShiftX, midY + tileShiftY, BOARD_TILE_TYPES.POWER);
    addSpecialTile(midX + 1 + islandShiftX, midY - tileShiftY, BOARD_TILE_TYPES.QUALITY);
    addSpecialTile(midX + 2 + islandShiftX, midY - 1, BOARD_TILE_TYPES.TAXED);
    addSpecialTile(midX + 2 + islandShiftX, midY + 1, BOARD_TILE_TYPES.TAXED);
    addLoanerUnderground(mirrorCellX(midX - 2 + islandShiftX), midY, 'right', 'Island bypass');
    return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
      blockers,
      specialTiles,
      loanerUndergrounds,
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
    if (round === 3) {
      return BOARD_TEMPLATES.SPLIT_LANES.id;
    }

    if (round > 1 && round % 4 === 0) {
      if (round >= 8) {
        const advancedBossTemplates = [
          BOARD_TEMPLATES.TOLL_MAZE.id,
          BOARD_TEMPLATES.TUNNEL_WORKS.id,
          BOARD_TEMPLATES.FURNACE_ROWS.id,
        ];
        return advancedBossTemplates[(Math.floor(round / 4) - 2) % advancedBossTemplates.length];
      }
      return BOARD_TEMPLATES.SPLIT_LANES.id;
    }

    const unlockedTemplates =
      round <= 4
        ? [BOARD_TEMPLATES.SPLIT_LANES.id, BOARD_TEMPLATES.CROSSFLOW_GATE.id]
        : round < 8
          ? [
              BOARD_TEMPLATES.SPLIT_LANES.id,
              BOARD_TEMPLATES.CROSSFLOW_GATE.id,
              BOARD_TEMPLATES.FACTORY_ISLANDS.id,
            ]
          : BOARD_TEMPLATE_SEQUENCE;
    const fallbackId = unlockedTemplates[(round - 2) % unlockedTemplates.length];
    return rng() < 0.55 ? this.pick(unlockedTemplates, rng) : fallbackId;
  }

  createBoardFromTemplate(template, round, overrides = {}) {
    return {
      ...template,
      round,
      blockers: overrides.blockers || [],
      specialTiles: overrides.specialTiles || [],
      loanerUndergrounds: overrides.loanerUndergrounds || [],
      sourceRows: overrides.sourceRows || [],
      deliveryRows: overrides.deliveryRows || [],
    };
  }

  uniqueRows(rows, height) {
    return [...new Set(rows.map((row) => this.clamp(row, 0, height - 1)))];
  }

  uniqueColumns(columns, width) {
    return [...new Set(columns.map((column) => this.clamp(column, 1, width - 2)))];
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
