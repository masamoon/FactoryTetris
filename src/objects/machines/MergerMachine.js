import ConveyorMachine from './ConveyorMachine';
import BaseMachine from './BaseMachine';

/**
 * Merger Machine
 * Combines items from multiple input paths into one output path.
 */
export default class MergerMachine extends ConveyorMachine {
  constructor(scene, config) {
    super(scene, config);
  }

  initMachineProperties() {
    super.initMachineProperties();
    this.id = 'merger';
    this.name = 'Merger';
    this.description = 'Combines items from multiple paths';
    this.shape = [[1], [1]]; // 2x1 vertical shape (by default for 'right' direction) to be a 2-lane block
    this.processingTime = 500;
  }

  /**
   * Calculates the target coordinate for all inputs.
   */
  getTransferTargetCoords() {
    if (!this.grid) return null;

    let targetX = this.gridX;
    let targetY = this.gridY;

    // Merger (2 cells vertical) pushes forward from its origin cell
    switch (this.direction) {
      case 'right':
        targetX += 1;
        break;
      case 'down':
        targetY += 1;
        break;
      case 'left':
        targetX -= 1;
        break;
      case 'up':
        targetY -= 1;
        break;
    }

    if (
      !this.grid ||
      targetX < 0 ||
      targetX >= this.grid.width ||
      targetY < 0 ||
      targetY >= this.grid.height
    ) {
      return null;
    }

    return { x: targetX, y: targetY };
  }

  /**
   * Overridden to pull from multiple directions.
   */
  tryExtractFromSource() {
    // A merger pulls from all adjacent cells that are NOT its output cell
    // and are adjacent to THE MACHINE'S cells.
    const machineCells = [];
    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
    for (let r = 0; r < rotatedShape.length; r++) {
      for (let c = 0; c < rotatedShape[r].length; c++) {
        if (rotatedShape[r][c] === 1) {
          machineCells.push({ x: this.gridX + c, y: this.gridY + r });
        }
      }
    }

    const outputCoords = this.getTransferTargetCoords();

    // Check all 4 neighbors of each machine cell
    for (const cell of machineCells) {
      const neighbors = [
        { x: cell.x + 1, y: cell.y },
        { x: cell.x - 1, y: cell.y },
        { x: cell.x, y: cell.y + 1 },
        { x: cell.x, y: cell.y - 1 },
      ];

      for (const neighbor of neighbors) {
        // Skip if this neighbor IS the output target
        if (outputCoords && neighbor.x === outputCoords.x && neighbor.y === outputCoords.y) {
          continue;
        }

        // Skip if this neighbor IS part of the machine itself
        if (machineCells.some((mc) => mc.x === neighbor.x && mc.y === neighbor.y)) {
          continue;
        }

        if (
          this.grid &&
          neighbor.x >= 0 &&
          neighbor.x < this.grid.width &&
          neighbor.y >= 0 &&
          neighbor.y < this.grid.height
        ) {
          const sourceCell = this.grid.getCell(neighbor.x, neighbor.y);
          if (!sourceCell || !sourceCell.object) continue;

          let extractedItem = null;

          // Handle Nodes (ResourceNode, UpgradeNode)
          if (
            (sourceCell.type === 'node' || sourceCell.type === 'upgrade-node') &&
            typeof sourceCell.object.extractResource === 'function'
          ) {
            extractedItem = sourceCell.object.extractResource();
          }
          // Handle other machines/objects that use getItemForTransfer (legacy or specific logic)
          else if (typeof sourceCell.object.getItemForTransfer === 'function') {
            extractedItem = sourceCell.object.getItemForTransfer(cell);
          }

          if (extractedItem) {
            if (this.acceptItem(extractedItem)) {
              if (typeof sourceCell.object.completeTransfer === 'function') {
                sourceCell.object.completeTransfer(extractedItem, cell);
              }
              return true; // Extracted one item
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Overridden createVisuals to show a multi-cell machine.
   */
  createVisuals() {
    if (this.isPreview) return;
    if (!this.grid) return;

    const cellSize = this.grid.cellSize;
    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
    const shapeWidth = rotatedShape[0].length;
    const shapeHeight = rotatedShape.length;

    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;

    const topLeftPos = this.grid.gridToWorldTopLeft(this.gridX, this.gridY);
    this.container = this.scene.add.container(
      topLeftPos.x + visualCenterX,
      topLeftPos.y + visualCenterY
    );
    this.itemVisualsGroup = this.scene.add.group();

    const machineColor = 0xff88aa; // Matching MACHINE_COLORS.merger

    for (let r = 0; r < shapeHeight; r++) {
      for (let c = 0; c < shapeWidth; c++) {
        if (rotatedShape[r][c] === 1) {
          const partCenterX = c * cellSize + cellSize / 2 - visualCenterX;
          const partCenterY = r * cellSize + cellSize / 2 - visualCenterY;

          // Base
          const part = this.scene.add.rectangle(
            partCenterX,
            partCenterY,
            cellSize - 4,
            cellSize - 4,
            machineColor
          );
          part.setStrokeStyle(1, 0x333333);
          this.container.add(part);

          // Label
          this.container.add(
            this.scene.add
              .text(partCenterX, partCenterY, 'm', {
                fontFamily: 'Arial',
                fontSize: 12,
                color: '#ffffff',
                alpha: 0.5,
              })
              .setOrigin(0.5)
          );
        }
      }
    }

    // Main Label
    this.container.add(
      this.scene.add
        .text(0, 0, 'M', {
          fontFamily: 'Arial Black',
          fontSize: 22,
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5)
    );

    // --- Explicit Direction Arrow ---
    const arrowSize = cellSize * 0.4;
    this.directionIndicator = this.scene.add
      .triangle(
        0,
        0,
        -arrowSize * 0.75,
        -arrowSize * 0.7,
        -arrowSize * 0.75,
        arrowSize * 0.7,
        arrowSize * 0.75,
        0,
        0xffffff
      )
      .setOrigin(0.5, 0.5);
    this.container.add(this.directionIndicator);

    // Fix the rotation: 0=Right, PI/2=Down, PI=Left, 3PI/2=Up
    switch (this.direction) {
      case 'right':
        this.directionIndicator.rotation = 0;
        break;
      case 'down':
        this.directionIndicator.rotation = Math.PI / 2;
        break;
      case 'left':
        this.directionIndicator.rotation = Math.PI;
        break;
      case 'up':
        this.directionIndicator.rotation = (3 * Math.PI) / 2;
        break;
    }

    this.addPlacementAnimation();
  }

  /**
   * Get a preview sprite for the machine selection panel
   */
  static getPreviewSprite(scene, x, y, direction = 'right') {
    const shape = [[1], [1]]; // 2x1 vertical
    const ioPositions = MergerMachine.getIOPositionsForDirection('merger', direction);

    return BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: 'merger',
      shape: shape,
      label: 'M',
      inputPos: ioPositions.inputPos,
      outputPos: ioPositions.outputPos,
      direction: direction,
    });
  }

  /**
   * Get input and output positions for each direction
   * @param {string} machineId - The machine ID
   * @param {string} direction - The direction
   * @returns {Object} An object with inputPos and outputPos coordinates
   */
  static getIOPositionsForDirection(machineId, direction) {
    let inputPos, outputPos;
    switch (direction) {
      case 'right':
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 0, y: 0 };
        break;
      case 'down':
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 0, y: 0 };
        break;
      case 'left':
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 0, y: 0 };
        break;
      case 'up':
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 0, y: 0 };
        break;
      default:
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 0, y: 0 };
    }
    return { inputPos, outputPos };
  }

  /**
   * Get standard configuration for this machine type
   */
  static getConfig() {
    return BaseMachine.getStandardConfig({
      id: 'merger',
      name: 'Merger',
      description: 'Combines two input paths into one',
      shape: [[1], [1]],
      inputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      processingTime: 500,
      defaultDirection: 'right',
      inputCoord: { x: 0, y: 0 },
      outputCoord: { x: 0, y: 0 },
    });
  }
}
