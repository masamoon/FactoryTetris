import BaseMachine from './BaseMachine';
import { getProcessingPieceBody } from '../../config/pieceBodies';

export default class ProcessingPieceMachine extends BaseMachine {
  static bodyId = 'processor-c';

  static forBody(bodyId) {
    return class TypedProcessingPieceMachine extends ProcessingPieceMachine {
      static bodyId = bodyId;
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
    this.description = body.description || 'Processing piece body';
    this.shape = body.shape;
    this.defaultDirection = body.defaultDirection || 'right';
    this.inputTypes = ['purity-resource'];
    this.outputTypes = ['purity-resource'];
    this.processingTime = body.processingTime || 3000;
    this.requiredInputs = { 'purity-resource': 1 };

    const ioPositions = ProcessingPieceMachine.getIOPositionsForBody(
      body.id,
      this.defaultDirection
    );
    this.inputCoord = ioPositions.inputPos;
    this.outputCoord = ioPositions.outputPos;

    this.inputLevels = this.config?.inputLevels ?? [1];
    this.outputLevel = this.config?.outputLevel ?? 2;
    this.previewOutputLevel = this.config?.previewOutputLevel ?? null;
    this.notation = this.config?.notation ?? '1/2';
  }

  createVisuals() {
    super.createVisuals();

    if (this.container) {
      const body = this.getBody();
      this.createProcessorVisuals(body.label || 'P', {
        coreColor: body.coreColor || 0x00ccff,
        coreShape: body.coreShape || 'circle',
      });
    }
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

  static getIOPositionsForBody(bodyId, direction = 'right') {
    const body = getProcessingPieceBody(bodyId);
    return (
      body.io?.[direction] ||
      body.io?.right || { inputPos: { x: 0, y: 0 }, outputPos: { x: 0, y: 0 } }
    );
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
    });
  }
}
