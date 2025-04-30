# Factory Tetris

A rogue-lite factory automation game with Tetris-like mechanics, built with Phaser 3.

## Overview

Factory Tetris combines the resource management and production line optimization of factory games with the spatial puzzle mechanics of Tetris. Players must place machines to extract and process resources, while managing the Cargo Bay to ship products and score points.

## Game Features

- **Tetris-Like Factory Layout**: Place machines of various shapes to create efficient production lines.
- **Cargo Bay Queue System**: Fill rows with products to clear them and score points.
- **Resource Nodes**: Extract resources from nodes that appear and disappear over time.
- **Progression Curve**: Game difficulty increases over the 30-minute play session.
- **Combo System**: Clear multiple rows at once for score multipliers.

## Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/factory-tetris.git
   cd factory-tetris
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open your browser and navigate to `http://localhost:8080`

### Building for Production

To create a production build:

```
npm run build
```

The built files will be in the `dist` directory.

## Game Controls

- **Mouse**: Drag and drop machines onto the factory grid.
- **R Key**: Rotate the currently selected machine.
- **ESC Key**: Pause the game.

## Game Mechanics

### Factory Grid

The factory grid is where you place machines to extract and process resources. Each machine has a specific shape and function:

- **Processors (A, B, Advanced)**: Convert resources into different types.
- **Conveyors**: Transport resources between machines. Can now be placed directly on Resource Mines to extract resources.
- **Cargo Loaders**: Send finished products to the cargo bay to score points.

### Cargo Bay

The Cargo Bay is where products are shipped. Fill a row completely to clear it and score points. The more rows you clear at once, the higher your score multiplier.

### Resource Nodes

Resource nodes appear randomly on the factory grid and have a limited lifespan. Place conveyors near them to start extraction.

### Gameplay Loop

1.  **Resource Generation**: Resource nodes appear on the grid.
2.  **Extraction**: Place conveyors directly on resource nodes to start extraction.
3.  **Transportation**: Use conveyors to move resources between machines.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 