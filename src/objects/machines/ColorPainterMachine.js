import BaseMachine from './BaseMachine';
import ConveyorMachine from './ConveyorMachine';
import { GAME_CONFIG } from '../../config/gameConfig';
import { UPGRADE_PACKAGE_TYPE } from '../../config/upgrades.js';
import { getItemColorHex, getItemColorName } from '../../utils/PurityUtils';

const DIRECTION_PAINT_COLORS = {
  right: 'blue',
  down: 'yellow',
  left: 'red',
  up: 'green',
};

export default class ColorPainterMachine extends ConveyorMachine {
  initMachineProperties() {
    super.initMachineProperties();
    this.id = 'painter';
    this.name = 'Color Painter';
    this.description = 'Recolors passing items based on facing direction';
    this.processingTime = 700;
    this.inputTypes = [
      'purity-resource',
      'basic-resource',
      'advanced-resource',
      'mega-resource',
      UPGRADE_PACKAGE_TYPE,
    ];
    this.outputTypes = [
      'purity-resource',
      'basic-resource',
      'advanced-resource',
      'mega-resource',
      UPGRADE_PACKAGE_TYPE,
    ];
  }

  getPaintColorKey(direction = this.direction) {
    return DIRECTION_PAINT_COLORS[direction] || GAME_CONFIG.defaultItemColor || 'blue';
  }

  paintItem(itemData) {
    if (!itemData || itemData.type === UPGRADE_PACKAGE_TYPE) {
      return itemData;
    }

    const paintColor = this.getPaintColorKey();
    const colorHistory = Array.isArray(itemData.colorHistory) ? [...itemData.colorHistory] : [];
    if (itemData.itemColor && colorHistory[colorHistory.length - 1] !== itemData.itemColor) {
      colorHistory.push(itemData.itemColor);
    }
    if (colorHistory[colorHistory.length - 1] !== paintColor) {
      colorHistory.push(paintColor);
    }

    const routeTags = Array.isArray(itemData.routeTags) ? [...itemData.routeTags] : [];
    ['painter', `paint:${paintColor}`].forEach((tag) => {
      if (!routeTags.includes(tag)) routeTags.push(tag);
    });

    return {
      ...itemData,
      itemColor: paintColor,
      colorHistory,
      routeTags,
      paintedBy: this.uid,
    };
  }

  addItemVisual(itemData) {
    return super.addItemVisual(this.paintItem(itemData));
  }

  createVisuals() {
    super.createVisuals();
    this.refreshPainterVisuals();
  }

  update(time, delta) {
    super.update(time, delta);
    this.refreshPainterVisuals();
  }

  refreshPainterVisuals() {
    if (!this.container || !this.grid) return;

    const paintColor = this.getPaintColorKey();
    const paintHex = getItemColorHex(paintColor, 0x3f8cff);
    const base = this.container.list.find(
      (part) =>
        part.type === 'Rectangle' &&
        part !== this.progressBar &&
        part !== this.progressFill &&
        part.width >= this.grid.cellSize - 10
    );
    if (base) {
      base.fillColor = paintHex;
      base.setAlpha(0.95);
    }

    if (!this.paintSwatch) {
      this.paintSwatch = this.scene.add.circle(9, -9, 5, paintHex, 1);
      this.paintSwatch.setStrokeStyle(1.5, 0xffffff, 0.95);
      this.container.add(this.paintSwatch);
    } else {
      this.paintSwatch.setFillStyle(paintHex, 1);
    }
  }

  showTooltip() {
    super.showTooltip();
    if (!this.tooltip?.text) return;

    const colorName = getItemColorName(this.getPaintColorKey());
    this.tooltip.text.setText(
      `${this.name} (${this.direction})\n\nPaints passing items ${colorName}.\nRotate to choose the output color.`
    );
  }

  static getConfig() {
    return {
      id: 'painter',
      name: 'Color Painter',
      description: 'Recolors passing items by direction',
      shape: [[1]],
      inputTypes: [
        'purity-resource',
        'basic-resource',
        'advanced-resource',
        'mega-resource',
        UPGRADE_PACKAGE_TYPE,
      ],
      outputTypes: [
        'purity-resource',
        'basic-resource',
        'advanced-resource',
        'mega-resource',
        UPGRADE_PACKAGE_TYPE,
      ],
      processingTime: 700,
      direction: 'right',
    };
  }

  static getIOPositionsForDirection(_machineId, _direction) {
    const pos = { x: 0, y: 0 };
    return { inputPos: pos, outputPos: pos };
  }

  static getPreviewSprite(scene, x, y, direction = 'right') {
    const paintColor = DIRECTION_PAINT_COLORS[direction] || GAME_CONFIG.defaultItemColor || 'blue';
    const preview = BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: 'painter',
      shape: [[1]],
      label: 'P',
      inputPos: { x: 0, y: 0 },
      outputPos: { x: 0, y: 0 },
      direction,
    });

    const swatch = scene.add.circle(10, -10, 5, getItemColorHex(paintColor, 0x3f8cff), 1);
    swatch.setStrokeStyle(1, 0xffffff, 0.95);
    preview.add(swatch);
    return preview;
  }
}
