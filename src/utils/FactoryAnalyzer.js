/**
 * FactoryAnalyzer - Analyzes the current factory state for piece generation
 *
 * This module scans the factory grid to determine:
 * - Which resource levels are currently available (producible levels)
 * - Which machines have free outputs (not connected to anything that can consume)
 * - Factory bottlenecks and efficiency metrics
 */

import { RESOURCE_LEVELS } from '../config/resourceLevels';

/**
 * Analyzes the factory to determine producible resource levels
 * @param {object} scene - The game scene containing the factory grid
 * @returns {Set<number>} Set of producible resource levels
 */
export function getProducibleLevels(scene) {
  const producibleLevels = new Set();

  // L1 is ALWAYS producible from resource nodes (regardless of era)
  // This ensures players must maintain Era 1 production chains in later eras
  producibleLevels.add(1);

  if (!scene || !scene.factoryGrid) {
    return producibleLevels;
  }

  // Add chip output tiers - chips from previous eras provide resources
  if (scene.chips && Array.isArray(scene.chips)) {
    for (const chip of scene.chips) {
      if (chip.outputTier && typeof chip.outputTier === 'number') {
        producibleLevels.add(chip.outputTier);
      }
      // Also add all emittable tiers if the chip has multiple
      if (chip.emittableTiers && Array.isArray(chip.emittableTiers)) {
        for (const tier of chip.emittableTiers) {
          producibleLevels.add(tier);
        }
      }
    }
  }

  // Scan all machines to find their output levels
  const machines = getAllMachines(scene);

  for (const machine of machines) {
    // Skip conveyors and logistics machines
    if (
      machine.id === 'conveyor' ||
      machine.id === 'splitter' ||
      machine.id === 'merger' ||
      machine.id === 'underground-belt'
    ) {
      continue;
    }

    // Add the machine's output level if it has one
    if (machine.outputLevel && typeof machine.outputLevel === 'number') {
      producibleLevels.add(machine.outputLevel);
    }
  }

  return producibleLevels;
}

/**
 * Gets all machines with free/unconnected outputs
 * @param {object} scene - The game scene
 * @returns {Array<object>} Array of machines with free outputs
 */
export function getFreeOutputs(scene) {
  const freeOutputs = [];

  if (!scene || !scene.factoryGrid) {
    return freeOutputs;
  }

  const machines = getAllMachines(scene);

  for (const machine of machines) {
    // Skip logistics
    if (
      machine.id === 'conveyor' ||
      machine.id === 'splitter' ||
      machine.id === 'merger' ||
      machine.id === 'underground-belt'
    ) {
      continue;
    }

    // Check if this machine has an output level
    if (!machine.outputLevel) {
      continue;
    }

    // Check if output is connected
    if (!isOutputConnected(scene, machine)) {
      freeOutputs.push({
        machine,
        level: machine.outputLevel,
        gridX: machine.gridX,
        gridY: machine.gridY,
      });
    }
  }

  return freeOutputs;
}

/**
 * Checks if a machine's output is connected to a valid consumer
 * @param {object} scene - The game scene
 * @param {object} machine - The machine to check
 * @returns {boolean} True if output is connected
 */
function isOutputConnected(scene, machine) {
  if (!machine || !scene.factoryGrid) {
    return false;
  }

  // Get output position based on machine direction
  const outputOffset = getOutputOffset(machine.direction || 'right');
  const outputX = machine.gridX + outputOffset.x;
  const outputY = machine.gridY + outputOffset.y;

  // Check if there's a consumer at the output position
  const cell = scene.factoryGrid.getCell(outputX, outputY);

  if (!cell) {
    return false;
  }

  // Check for conveyor, machine, or delivery node
  if (cell.type === 'machine' && (cell.object || cell.machine)) {
    return true;
  }

  if (cell.type === 'delivery-node' || cell.type === 'delivery') {
    return true;
  }

  return false;
}

/**
 * Gets the directional offset for output position
 * @param {string} direction - Machine direction
 * @returns {object} {x, y} offset
 */
function getOutputOffset(direction) {
  switch (direction) {
    case 'right':
      return { x: 1, y: 0 };
    case 'down':
      return { x: 0, y: 1 };
    case 'left':
      return { x: -1, y: 0 };
    case 'up':
      return { x: 0, y: -1 };
    default:
      return { x: 1, y: 0 };
  }
}

/**
 * Gets all machines from the factory grid
 * @param {object} scene - The game scene
 * @returns {Array<object>} Array of all machines
 */
function getAllMachines(scene) {
  const machines = [];

  const addMachine = (machine) => {
    if (machine && !machines.includes(machine)) {
      machines.push(machine);
    }
  };

  if (Array.isArray(scene?.machines)) {
    for (const machine of scene.machines) {
      addMachine(machine);
    }
  }

  if (Array.isArray(scene?.factoryGrid?.machines)) {
    for (const entry of scene.factoryGrid.machines) {
      addMachine(entry?.machine || entry);
    }
  }

  if (!scene || !scene.factoryGrid) {
    return machines;
  }

  const grid = scene.factoryGrid;

  // Iterate through all cells
  for (let y = 0; y < grid.height; y++) {
    for (let x = 0; x < grid.width; x++) {
      const cell = grid.getCell(x, y);
      if (cell && cell.type === 'machine' && (cell.object || cell.machine)) {
        // Avoid duplicates for multi-tile machines
        addMachine(cell.object || cell.machine);
      }
    }
  }

  return machines;
}

/**
 * Checks if a piece configuration is usable in the current factory state
 * @param {object} config - Piece configuration {inputs: number[], output: number}
 * @param {Set<number>} producibleLevels - Set of producible levels
 * @returns {boolean} True if all inputs are producible
 */
export function isPieceUsable(config, producibleLevels) {
  if (!config || !config.inputs || !producibleLevels) {
    return false;
  }

  // Check if all required input levels are producible
  for (const inputLevel of config.inputs) {
    if (!producibleLevels.has(inputLevel)) {
      return false;
    }
  }

  return true;
}

/**
 * Gets factory efficiency metrics
 * @param {object} scene - The game scene
 * @returns {object} Efficiency metrics
 */
export function getFactoryMetrics(scene) {
  const producibleLevels = getProducibleLevels(scene);
  const freeOutputs = getFreeOutputs(scene);
  const machines = getAllMachines(scene);

  // Count machines by output level
  const levelCounts = {};
  for (let level = 1; level <= Object.keys(RESOURCE_LEVELS).length; level++) {
    levelCounts[level] = 0;
  }

  for (const machine of machines) {
    if (machine.outputLevel) {
      levelCounts[machine.outputLevel] = (levelCounts[machine.outputLevel] || 0) + 1;
    }
  }

  return {
    producibleLevels: Array.from(producibleLevels),
    freeOutputCount: freeOutputs.length,
    freeOutputs,
    totalMachines: machines.length,
    levelCounts,
    maxLevel: Math.max(...producibleLevels),
  };
}
