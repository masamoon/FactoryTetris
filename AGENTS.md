# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

**Gridforge** (internal name: FactoryTetris) - A web-based rogue-lite factory automation game built with Phaser 3. Players place Tetris-shaped machines on a grid to create production chains that process resources through purity tiers.

## Commands

```bash
npm start         # Dev server at http://localhost:8084 with hot reload
npm run build     # Production build to /dist
npm run format    # Format code with Prettier
```

## Architecture

### Tech Stack

- **Phaser 3.60.0** game engine
- **JavaScript/TypeScript** (mixed, allowJs enabled)
- **Webpack 5** bundler

### Core Files

- `src/index.ts` - Game bootstrap, scene registration
- `src/scenes/GameScene.js` - Main game loop (largest file, handles most game logic)
- `src/config/gameConfig.js` - All game parameters (grid size, machine types, resources, purity levels)
- `src/config/eraConfig.js` - Transcendence/Era progression system

### Key Directories

- `src/scenes/` - Phaser scenes: Boot → Preload → MainMenu → Game → Upgrade → GameOver
- `src/objects/machines/` - Machine implementations, all extend `BaseMachine.js`
- `src/objects/` - Game entities: Grid, ResourceNode, DeliveryNode, ChipNode
- `src/managers/` - System managers (UpgradeManager)
- `src/utils/` - Utilities: PieceGenerator, FactoryAnalyzer, PurityUtils
- `src/config/` - Static configuration files

### Machine Class Hierarchy

```
BaseMachine (base class with I/O, processing, rendering)
├── ProcessorA-E, AdvancedProcessor1-2 (resource transformation)
├── ConveyorMachine (directional item movement)
├── SplitterMachine, MergerMachine (flow routing)
└── UndergroundBeltMachine (hidden paths)
```

### Game Systems

**Resource Flow:**
ResourceNodes → Machines (Conveyors/Processors) → DeliveryNodes

**Purity System:** Resources have purity levels (1-12+) that increase through processing. Higher purity = more points.

**Era/Transcendence:** Grid expands (10 + 4\*(era-1) cells), new resource tiers unlock (3 per era). ChipNodes emit resources for next era.

**Upgrades:** 7 types with 3 tiers each, applied via UpgradeManager modifiers.

### Important GameScene State

```javascript
this.score, this.currentLevel, this.currentEra
this.currentMomentum     // Combo multiplier 0-100
this.machines[]          // Active machines on grid
this.resourceNodes[], this.deliveryNodes[], this.chips[]
```

### Conventions

- PascalCase for class files (`DeliveryNode.js`)
- UPPER_CASE for config constants (`GAME_CONFIG`, `GRID_CONFIG`)
- MachineRegistry pattern for machine type lookup
- Phaser event system for input/collisions

### Grid System

- Cell-based grid (32px per cell, configurable)
- Machines have Tetris-like rotation (0-3)
- Ghost preview for placement validation
