import { GRID_CONFIG } from '../config/gameConfig';
import { BOARD_TEMPLATE_SEQUENCE, BOARD_TEMPLATES, BOARD_TILE_TYPES } from '../config/boardConfig';

const TEMPLATE_BY_ID = Object.values(BOARD_TEMPLATES).reduce((lookup, template) => {
  lookup[template.id] = template;
  return lookup;
}, {});

export default class BoardGenerator {
  constructor(options = {}) {
    this.gridConfig = options.gridConfig || GRID_CONFIG;
  }

  createRoundBoard(round = 1, options = {}) {
    const width = options.width || this.gridConfig.width;
    const height = options.height || this.gridConfig.height;
    const midX = Math.floor(width / 2);
    const midY = Math.floor(height / 2);
    const blockers = [];
    const specialTiles = [];
    const addBlocker = (x, y) => {
      if (x <= 0 || x >= width - 1 || y < 0 || y >= height) return;
      const key = `${x},${y}`;
      if (blockers.some((cell) => `${cell.x},${cell.y}` === key)) return;
      if (specialTiles.some((cell) => `${cell.x},${cell.y}` === key)) return;
      blockers.push({ x, y });
    };
    const addSpecialTile = (x, y, type) => {
      if (x <= 0 || x >= width - 1 || y < 0 || y >= height) return;
      const key = `${x},${y}`;
      if (blockers.some((cell) => `${cell.x},${cell.y}` === key)) return;
      if (specialTiles.some((cell) => `${cell.x},${cell.y}` === key)) return;
      specialTiles.push({ x, y, type });
    };

    if (round <= 1) {
      addSpecialTile(midX - 1, midY, BOARD_TILE_TYPES.POWER);
      return this.createBoardFromTemplate(BOARD_TEMPLATES.OPEN_FLOOR, round, {
        blockers,
        specialTiles,
        sourceRows: [midY],
        deliveryRows: [midY],
      });
    }

    const templateId = BOARD_TEMPLATE_SEQUENCE[(round - 2) % BOARD_TEMPLATE_SEQUENCE.length];
    if (templateId === BOARD_TEMPLATES.SPLIT_LANES.id) {
      const gateX = midX;
      for (let x = 2; x < width - 2; x++) {
        if (Math.abs(x - gateX) <= 1) continue;
        addBlocker(x, midY);
      }
      addSpecialTile(gateX - 1, midY - 1, BOARD_TILE_TYPES.QUALITY);
      addSpecialTile(gateX + 1, midY + 1, BOARD_TILE_TYPES.QUALITY);
      addSpecialTile(gateX, midY, BOARD_TILE_TYPES.TAXED);
      return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
        blockers,
        specialTiles,
        sourceRows: this.uniqueRows([midY - 2, midY + 2], height),
        deliveryRows: this.uniqueRows([midY - 2, midY + 2], height),
      });
    }

    if (templateId === BOARD_TEMPLATES.CROSSFLOW_GATE.id) {
      const gateRows = new Set(this.uniqueRows([2, height - 3], height));
      for (let y = 1; y < height - 1; y++) {
        if (gateRows.has(y)) continue;
        addBlocker(midX, y);
      }
      addSpecialTile(midX - 1, 2, BOARD_TILE_TYPES.POWER);
      addSpecialTile(midX + 1, height - 3, BOARD_TILE_TYPES.QUALITY);
      addSpecialTile(midX - 1, midY, BOARD_TILE_TYPES.TAXED);
      return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
        blockers,
        specialTiles,
        sourceRows: this.uniqueRows([2, height - 3], height),
        deliveryRows: this.uniqueRows([height - 3, 2], height),
      });
    }

    for (const centerY of this.uniqueRows([midY - 2, midY + 2], height)) {
      addBlocker(midX - 1, centerY);
      addBlocker(midX, centerY);
      addBlocker(midX - 1, centerY + 1);
      addBlocker(midX, centerY + 1);
    }
    addSpecialTile(midX - 2, midY, BOARD_TILE_TYPES.POWER);
    addSpecialTile(midX + 1, midY, BOARD_TILE_TYPES.QUALITY);
    addSpecialTile(midX + 2, midY - 1, BOARD_TILE_TYPES.TAXED);
    addSpecialTile(midX + 2, midY + 1, BOARD_TILE_TYPES.TAXED);
    return this.createBoardFromTemplate(TEMPLATE_BY_ID[templateId], round, {
      blockers,
      specialTiles,
      sourceRows: this.uniqueRows([1, height - 2, midY], height),
      deliveryRows: this.uniqueRows([midY, 1, height - 2], height),
    });
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

  clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }
}
