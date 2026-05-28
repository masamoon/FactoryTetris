import BaseMachine from './BaseMachine';
import { getProcessingPieceBody, normalizeProcessingPieceBodyId } from '../../config/pieceBodies';

const CARDINAL_DIRECTIONS = ['right', 'down', 'left', 'up'];

function clonePos(pos) {
  return { x: pos?.x ?? 0, y: pos?.y ?? 0 };
}

function rotateShapeClockwise(shape) {
  const height = shape.length;
  const width = shape[0].length;
  const rotated = Array.from({ length: width }, () => Array(height).fill(0));

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      rotated[col][height - 1 - row] = shape[row][col];
    }
  }

  return rotated;
}

function getRotatedShape(shape, direction) {
  let rotated = shape;
  const turns = CARDINAL_DIRECTIONS.indexOf(direction);

  for (let i = 0; i < turns; i++) {
    rotated = rotateShapeClockwise(rotated);
  }

  return rotated;
}

function rotatePos(pos, shape, direction) {
  const height = shape.length;
  const width = shape[0].length;

  switch (direction) {
    case 'down':
      return { x: height - 1 - pos.y, y: pos.x };
    case 'left':
      return { x: width - 1 - pos.x, y: height - 1 - pos.y };
    case 'up':
      return { x: pos.y, y: width - 1 - pos.x };
    case 'right':
    default:
      return clonePos(pos);
  }
}

function isPosOnShape(pos, shape) {
  return Boolean(pos && shape[pos.y] && shape[pos.y][pos.x] === 1);
}

function areIOPositionsOnShape(ioPositions, shape) {
  return isPosOnShape(ioPositions?.inputPos, shape) && isPosOnShape(ioPositions?.outputPos, shape);
}

export default class ProcessingPieceMachine extends BaseMachine {
  static bodyId = 'operator-block';

  static forBody(bodyId) {
    const resolvedBodyId = normalizeProcessingPieceBodyId(bodyId);
    return class TypedProcessingPieceMachine extends ProcessingPieceMachine {
      static bodyId = resolvedBodyId;
    };
  }

  constructor(scene, config) {
    super(scene, config);
    this.config = config;
  }

  getBody() {
    return getProcessingPieceBody(this.config?.bodyId || this.constructor.bodyId || this.id);
  }

  initMachineProperties() {
    const body = this.getBody();

    this.id = body.id;
    this.bodyId = body.id;
    this.name = this.config?.pieceName || body.name;
    this.description = body.description || 'Operator body';
    this.shape = body.shape;
    this.defaultDirection = body.defaultDirection || 'right';
    this.inputTypes = ['purity-resource'];
    this.outputTypes = ['purity-resource'];
    this.processingTime = body.processingTime || 3000;
    this.requiredInputs = { 'purity-resource': 1 };
    this.category = 'operator';
    this.machineFamily = 'operator';
    this.isComplexBody = Boolean(body.isComplexBody);

    const baseIO = body.io?.right || ProcessingPieceMachine.getIOPositionsForBody(body.id, 'right');
    this.inputCoord = clonePos(this.config?.inputCoord || baseIO.inputPos);
    this.outputCoord = clonePos(this.config?.outputCoord || baseIO.outputPos);
    this.ioByDirection = this.config?.ioByDirection || null;

    this.inputLevels = this.config?.inputLevels ?? [1];
    this.outputLevel = this.config?.outputLevel ?? 2;
    this.previewOutputLevel = this.config?.previewOutputLevel ?? null;
    this.notation = this.config?.notation ?? '1/2';
  }

  createVisuals() {
    super.createVisuals();

    if (this.container) {
      const body = this.getBody();
      this.createProcessorVisuals(this.getOperationVisualLabel() || body.label || 'P', {
        coreColor: body.coreColor || 0x00ccff,
        coreShape: body.coreShape || 'circle',
      });
      this.renderOperationCellLabels();
      this.renderOutputCellMarker();
    }
  }

  getOperationVisualLabel() {
    const operation = this.arithmeticOperation;
    if (!operation) return null;

    switch (operation.type) {
      case 'add-constant':
        return `+${operation.value || 0}`;
      case 'add':
        return '+';
      case 'multiply':
        return 'x';
      case 'divide':
        return '/';
      default:
        return this.getOperationBadgeText();
    }
  }

  renderOperationCellLabels() {
    const operationLabel = this.getOperationVisualLabel();
    if (!operationLabel || !this.container || !this.grid) return;

    const direction = this.direction || this.defaultDirection || 'right';
    const rotatedShape = getRotatedShape(this.shape, direction);
    const shapeWidth = rotatedShape[0]?.length || 1;
    const shapeHeight = rotatedShape.length || 1;
    const cellSize = this.grid.cellSize;
    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;
    const occupiedCells = [];

    for (let y = 0; y < shapeHeight; y++) {
      for (let x = 0; x < shapeWidth; x++) {
        if (rotatedShape[y][x] === 1) {
          occupiedCells.push({ x, y });
        }
      }
    }

    const isCompactLabel = operationLabel.length > 1;
    const fontSize = isCompactLabel ? Math.max(11, cellSize * 0.42) : Math.max(15, cellSize * 0.56);

    occupiedCells.forEach((cell) => {
      const x = cell.x * cellSize + cellSize / 2 - visualCenterX;
      const y = cell.y * cellSize + cellSize / 2 - visualCenterY;
      const text = this.scene.add
        .text(x, y, operationLabel, {
          fontFamily: 'Arial Black, Arial, sans-serif',
          fontSize,
          color: '#ffd966',
          stroke: '#05090d',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
      text.setDepth(4);
      text.isOperationLabel = true;
      this.container.add(text);
    });
  }

  renderOutputCellMarker() {
    if (!this.container || !this.grid) return;

    if (this.outputArrow) {
      this.outputArrow.destroy();
      this.outputArrow = null;
    }

    const direction = this.direction || this.defaultDirection || 'right';
    const rotatedShape = getRotatedShape(this.shape, direction);
    const shapeWidth = rotatedShape[0]?.length || 1;
    const shapeHeight = rotatedShape.length || 1;
    const outputPos = this.getIOPositionsForDirection(direction)?.outputPos;
    if (!outputPos || rotatedShape[outputPos.y]?.[outputPos.x] !== 1) return;

    const cellSize = this.grid.cellSize;
    const visualCenterX = ((shapeWidth - 1) / 2) * cellSize + cellSize / 2;
    const visualCenterY = ((shapeHeight - 1) / 2) * cellSize + cellSize / 2;
    const x = outputPos.x * cellSize + cellSize / 2 - visualCenterX;
    const y = outputPos.y * cellSize + cellSize / 2 - visualCenterY;

    const outline = this.scene.add
      .rectangle(x, y, cellSize - 5, cellSize - 5, 0x000000, 0)
      .setOrigin(0.5)
      .setStrokeStyle(3, 0x83f7ff, 0.95);
    outline.setDepth(5);
    outline.isOutputMarker = true;
    this.container.add(outline);

    const tagY = y + cellSize * 0.31;
    const tagText = this.scene.add
      .text(x, tagY, 'OUT', {
        fontFamily: 'Arial Black, Arial, sans-serif',
        fontSize: 7,
        color: '#efffff',
        stroke: '#05090d',
        strokeThickness: 2,
      })
      .setOrigin(0.5);
    tagText.setDepth(7);
    tagText.isOutputMarker = true;
    this.container.add(tagText);
  }

  startProcessing() {
    super.startProcessing();
    this.hideProgressBar();
  }

  hideProgressBar() {
    this.progressBar?.setVisible(false);
    this.progressFill?.setVisible(false);
  }

  static getPreviewSprite(scene, x, y, direction = 'right') {
    const body = getProcessingPieceBody(this.bodyId);
    const ioPositions = ProcessingPieceMachine.getIOPositionsForBody(body.id, direction);

    return BaseMachine.getStandardPreviewSprite(scene, x, y, {
      machineId: body.id,
      shape: body.shape,
      label: body.label || 'P',
      inputPos: ioPositions.inputPos,
      outputPos: ioPositions.outputPos,
      direction,
    });
  }

  static getIOPositionsForDirection(machineId, direction) {
    return ProcessingPieceMachine.getIOPositionsForBody(machineId || this.bodyId, direction);
  }

  getIOPositionsForDirection(direction = this.direction || this.defaultDirection || 'right') {
    const normalizedDirection = CARDINAL_DIRECTIONS.includes(direction) ? direction : 'right';
    const runtimeIO = this.ioByDirection?.[normalizedDirection];

    if (
      runtimeIO &&
      areIOPositionsOnShape(runtimeIO, getRotatedShape(this.shape, normalizedDirection))
    ) {
      return {
        inputPos: clonePos(runtimeIO.inputPos),
        outputPos: clonePos(runtimeIO.outputPos),
      };
    }

    if (this.inputCoord && this.outputCoord) {
      const rotatedPositions = {
        inputPos: rotatePos(this.inputCoord, this.shape, normalizedDirection),
        outputPos: rotatePos(this.outputCoord, this.shape, normalizedDirection),
      };

      if (
        areIOPositionsOnShape(rotatedPositions, getRotatedShape(this.shape, normalizedDirection))
      ) {
        return rotatedPositions;
      }
    }

    return ProcessingPieceMachine.getIOPositionsForBody(this.bodyId, normalizedDirection);
  }

  static getIOPositionsForBody(bodyId, direction = 'right') {
    const body = getProcessingPieceBody(bodyId);
    const normalizedDirection = CARDINAL_DIRECTIONS.includes(direction) ? direction : 'right';
    const rotatedShape = getRotatedShape(body.shape, normalizedDirection);
    const configuredPositions = body.io?.[normalizedDirection] ||
      body.io?.right || { inputPos: { x: 0, y: 0 }, outputPos: { x: 0, y: 0 } };

    if (areIOPositionsOnShape(configuredPositions, rotatedShape)) {
      return {
        inputPos: clonePos(configuredPositions.inputPos),
        outputPos: clonePos(configuredPositions.outputPos),
      };
    }

    if (body.io?.right) {
      const rotatedPositions = {
        inputPos: rotatePos(body.io.right.inputPos, body.shape, normalizedDirection),
        outputPos: rotatePos(body.io.right.outputPos, body.shape, normalizedDirection),
      };

      if (areIOPositionsOnShape(rotatedPositions, rotatedShape)) {
        return rotatedPositions;
      }
    }

    return {
      inputPos: clonePos(configuredPositions.inputPos),
      outputPos: clonePos(configuredPositions.outputPos),
    };
  }

  static getConfig() {
    const body = getProcessingPieceBody(this.bodyId);
    const ioPositions = ProcessingPieceMachine.getIOPositionsForBody(
      body.id,
      body.defaultDirection
    );

    return BaseMachine.getStandardConfig({
      id: body.id,
      name: body.name,
      description: body.description,
      shape: body.shape,
      inputTypes: ['purity-resource'],
      outputTypes: ['purity-resource'],
      processingTime: body.processingTime,
      defaultDirection: body.defaultDirection,
      requiredInputs: { 'purity-resource': 1 },
      inputCoord: ioPositions.inputPos,
      outputCoord: ioPositions.outputPos,
      bodyId: body.id,
      category: 'operator',
      machineFamily: 'operator',
      isComplexBody: Boolean(body.isComplexBody),
    });
  }
}
