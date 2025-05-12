# Gridforge

A rogue-lite factory automation game with unique grid-based mechanics, built with Phaser 3.

## Overview

Gridforge combines the resource management and production line optimization of factory games with spatial puzzle mechanics. Players must place machines to extract and process resources, while deliverying products to delivery nodes and score points to advance to the next round. 

## Game Features

- **Tetris-Like Factory Layout**: Place machines of various shapes to create efficient production lines.
- **Resource Nodes**: Extract resources from nodes that appear and disappear over time.
- **Progression Curve**: Game difficulty increases over the 30-minute play session.

## Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/gridforge.git
   cd gridforge
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

The factory grid is where you place machines to extract and process resources. Each machine occupies a specific shape on the grid:

- **Processors (A, B, C, Advanced)**: Convert resources into different types.
- **Conveyors**: Transport resources. Connecting a conveyor *to* a machine tile defines an input, while connecting a conveyor *from* a machine tile defines an output. Conveyors can also be placed directly on Resource Mines to extract resources.

### Delivery Nodes

Delivery nodes appear randomly and products delivered here will score points.

### Resource Nodes

Resource nodes appear randomly on the factory grid and have a limited lifespan. Place conveyors adjacent to them, pointing away from the node, to start extraction.

### Gameplay Loop

1.  **Resource Generation**: Resource nodes appear on the grid.
2.  **Extraction**: Place conveyors pointing *away* from resource nodes to start extraction.
3.  **Transportation & Processing**: Use conveyors to define the flow of resources *into* and *out of* processor machines.
4.  **Shipping**: Route finished products via conveyors into Delivery Nodes.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 