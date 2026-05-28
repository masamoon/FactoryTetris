import BaseMachine from './BaseMachine';
import SplitterMachine from './SplitterMachine';
import { getItemColorKey } from '../../utils/PurityUtils';

const WARM_OR_SPECIAL_COLORS = new Set(['yellow', 'red', 'purple']);

export default class FilterSplitterMachine extends SplitterMachine {
  initMachineProperties() {
    super.initMachineProperties();
    this.id = 'filter-splitter';
    this.name = 'Filter Splitter';
    this.description = 'Routes high-level or warm-colored items to its alternate output';
  }

  getPreferredOutputIndex(itemData) {
    const tier = itemData?.purity || itemData?.level || 1;
    const color = getItemColorKey(itemData, null);
    return tier >= 3 || WARM_OR_SPECIAL_COLORS.has(color) ? 1 : 0;
  }

  tryTransferItem(itemToTransfer, index) {
    const outputs = this.getOutputCoords();
    if (outputs.length === 0) return false;

    const preferredIndex = this.getPreferredOutputIndex(itemToTransfer?.itemData) % outputs.length;
    const routeOrder = [
      preferredIndex,
      ...outputs.map((_output, outputIndex) => outputIndex).filter((i) => i !== preferredIndex),
    ];

    for (const outputIndex of routeOrder) {
      if (this.attemptTransferTo(itemToTransfer, outputs[outputIndex])) {
        if (itemToTransfer.visual) {
          itemToTransfer.visual.destroy();
        }
        this.itemsOnBelt.splice(index, 1);
        return true;
      }
    }

    return false;
  }

  createVisuals() {
    super.createVisuals();
    if (!this.container) return;

    const badge = this.scene.add
      .text(0, 0, 'F', {
        fontFamily: 'Arial Black',
        fontSize: 18,
        color: '#fff3bf',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.container.add(badge);
  }

  static getPreviewSprite(scene, x, y, direction = 'right') {
    const ioPositions = SplitterMachine.getIOPositionsForDirection('filter-splitter', direction);
    const preview = BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: 'filter-splitter',
      shape: [[1], [1]],
      label: 'F',
      inputPos: ioPositions.inputPos,
      outputPos: ioPositions.outputPos,
      direction,
    });

    const filterBadge = scene.add
      .text(10, -10, '>', {
        fontFamily: 'Arial Black',
        fontSize: 11,
        color: '#ffd166',
        stroke: '#000000',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    preview.add(filterBadge);
    return preview;
  }

  static getConfig() {
    return BaseMachine.getStandardConfig({
      id: 'filter-splitter',
      name: 'Filter Splitter',
      description: 'Routes high-level or warm-colored items to its alternate output',
      shape: [[1], [1]],
      inputTypes: ['purity-resource', 'basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['purity-resource', 'basic-resource', 'advanced-resource', 'mega-resource'],
      processingTime: 500,
      defaultDirection: 'right',
      inputCoord: { x: 0, y: 0 },
      outputCoord: { x: 0, y: 0 },
    });
  }
}
