import ConveyorMachine from './ConveyorMachine';
import BaseMachine from './BaseMachine';

/**
 * Splitter Machine
 * Distributes items between two output paths in a round-robin fashion.
 */
export default class SplitterMachine extends ConveyorMachine {
  constructor(scene, config) {
    super(scene, config);
    this.outputIndex = 0; // 0 or 1 for round-robin
  }

  initMachineProperties() {
    super.initMachineProperties();
    this.id = 'splitter';
    this.name = 'Splitter';
    this.description = 'Distributes items between two output paths';
    this.shape = [[1], [1]]; // 2x1 vertical shape (by default for 'right' direction) to be a 2-lane block
    this.processingTime = 500; // Faster than standard machines
  }

  /**
   * Calculates the coordinates of the two possible output cells.
   * @returns {Array<{x: number, y: number}>} Array of target coordinates.
   */
  getOutputCoords() {
    if (!this.grid) return [];

    // Get rotated shape to find the actual grid positions of the two cells
    const rotatedShape = this.grid.getRotatedShape(this.shape, this.direction);
    const cells = [];
    for (let r = 0; r < rotatedShape.length; r++) {
      for (let c = 0; c < rotatedShape[r].length; c++) {
        if (rotatedShape[r][c] === 1) {
          cells.push({ x: this.gridX + c, y: this.gridY + r });
        }
      }
    }

    // Each cell pushes "forward" relative to the machine's direction
    const targets = cells.map((cell) => {
      let tx = cell.x;
      let ty = cell.y;
      switch (this.direction) {
        case 'right':
          tx += 1;
          break;
        case 'down':
          ty += 1;
          break;
        case 'left':
          tx -= 1;
          break;
        case 'up':
          ty -= 1;
          break;
      }
      return { x: tx, y: ty };
    });

    return targets;
  }

  /**
   * Overridden tryTransferItem to handle splitting logic.
   */
  tryTransferItem(itemToTransfer, index) {
    const outputs = this.getOutputCoords();
    if (outputs.length === 0) return false;

    // Try round-robin distribution
    const startIndex = this.outputIndex;
    for (let i = 0; i < outputs.length; i++) {
      const idx = (startIndex + i) % outputs.length;
      const targetCoords = outputs[idx];

      if (this.attemptTransferTo(itemToTransfer, targetCoords)) {
        // Successful transfer, update round-robin index for NEXT item
        this.outputIndex = (idx + 1) % outputs.length;

        // Remove item from belt
        if (itemToTransfer.visual) {
          itemToTransfer.visual.destroy();
        }
        this.itemsOnBelt.splice(index, 1);
        return true;
      }
    }

    return false; // Both outputs blocked or invalid
  }

  /**
   * Helper to attempt transfer to a specific coordinate.
   */
  attemptTransferTo(itemToTransfer, coords) {
    if (
      !this.grid ||
      coords.x < 0 ||
      coords.x >= this.grid.width ||
      coords.y < 0 ||
      coords.y >= this.grid.height
    ) {
      return false;
    }

    const targetCell = this.grid.getCell(coords.x, coords.y);
    if (!targetCell || !targetCell.object) return false;

    const targetEntity = targetCell.object;
    if (
      typeof targetEntity.acceptItem === 'function' &&
      typeof targetEntity.canAcceptInput === 'function'
    ) {
      if (targetEntity.canAcceptInput(itemToTransfer.itemData.type)) {
        return targetEntity.acceptItem(itemToTransfer.itemData);
      }
    }
    return false;
  }

  /**
   * Overridden createVisuals to show a multi-cell machine with belt indicators.
   */
  createVisuals() {
    if (this.isPreview) return;
    if (!this.grid) return;

    // --- Container Setup (Center of Shape) ---
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

    // Draw each cell in the shape
    const machineColor = 0xaa88ff; // Matching MACHINE_COLORS.splitter

    for (let r = 0; r < shapeHeight; r++) {
      for (let c = 0; c < shapeWidth; c++) {
        if (rotatedShape[r][c] === 1) {
          const partCenterX = c * cellSize + cellSize / 2 - visualCenterX;
          const partCenterY = r * cellSize + cellSize / 2 - visualCenterY;

          // Base rectangle
          const part = this.scene.add.rectangle(
            partCenterX,
            partCenterY,
            cellSize - 4,
            cellSize - 4,
            machineColor
          );
          part.setStrokeStyle(1, 0x333333);
          this.container.add(part);

          // Add a small 's' label on each cell
          const label = this.scene.add
            .text(partCenterX, partCenterY, 's', {
              fontFamily: 'Arial',
              fontSize: 12,
              color: '#ffffff',
              alpha: 0.5,
            })
            .setOrigin(0.5);
          this.container.add(label);

          // Add belt line indicator
          const isVertical = this.direction === 'up' || this.direction === 'down';
          const beltWidth = isVertical ? 4 : cellSize - 12;
          const beltHeight = isVertical ? cellSize - 12 : 4;

          const beltIndicator = this.scene.add.rectangle(
            partCenterX,
            partCenterY,
            beltWidth,
            beltHeight,
            0x666666
          );
          this.container.add(beltIndicator);
        }
      }
    }

    // Add a primary 'S' label in the middle
    const mainLabel = this.scene.add
      .text(0, 0, 'S', {
        fontFamily: 'Arial Black',
        fontSize: 22,
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);
    this.container.add(mainLabel);

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
    const ioPositions = SplitterMachine.getIOPositionsForDirection('splitter', direction);

    return BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: 'splitter',
      shape: shape,
      label: 'S',
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
    // For Splitter (2 cells), we define primary I/O cell positions relative to top-left
    let inputPos, outputPos;
    switch (direction) {
      case 'right': // vertical [[1],[1]]
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 0, y: 0 };
        break;
      case 'down': // horizontal [[1,1]]
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 0, y: 0 };
        break;
      case 'left': // vertical [[1],[1]]
        inputPos = { x: 0, y: 0 };
        outputPos = { x: 0, y: 0 };
        break;
      case 'up': // horizontal [[1,1]]
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
      id: 'splitter',
      name: 'Splitter',
      description: 'Distributes items between two output paths',
      shape: [[1], [1]], // 2x1 vertical block
      inputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      outputTypes: ['basic-resource', 'advanced-resource', 'mega-resource'],
      processingTime: 500,
      defaultDirection: 'right',
      inputCoord: { x: 0, y: 0 },
      outputCoord: { x: 0, y: 0 },
    });
  }
}
