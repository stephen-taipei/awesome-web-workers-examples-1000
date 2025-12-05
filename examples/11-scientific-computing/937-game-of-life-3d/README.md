# Example 937: 3D Game of Life

This example simulates a **3D Cellular Automaton** (an extension of Conway's Game of Life) in a Web Worker.

## Description

The rules of Life can be generalized to 3D. Cells live in a cubic grid and have 26 neighbors.
- **Worker Thread**:
    1. Manages a 3D grid state (e.g., 20x20x20).
    2. Calculates the next generation based on neighbor counts and survival/birth rules.
    3. Returns a list of coordinates for all living cells to minimize data transfer.
- **Main Thread**: Renders the living cells as a 3D point cloud/voxel visualization that can be rotated.

## Features

- **3D Rules**: Supports rules like 4555 (Survive if 4-5 neighbors, Birth if 5) which produces stable structures and gliders in 3D.
- **Topology**: Implements a toroidal (wrapping) universe.
- **Efficient Transfer**: Only sends coordinates of living cells, allowing for larger grids than full state transfer.

## Usage

1. Open `index.html`.
2. Select "Grid Size" and "Rule".
3. Click "Start".
4. Drag the canvas to rotate the cube and view the evolving 3D structures.
