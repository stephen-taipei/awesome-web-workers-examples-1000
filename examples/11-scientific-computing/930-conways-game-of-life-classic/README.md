# Example 930: Conway's Game of Life

This example runs the classic **Game of Life** cellular automaton in a Web Worker.

## Description

A zero-player game determined by its initial state.
- **Worker Thread**: Calculates the state of the next generation for a large grid (up to 1000x1000) using TypedArrays for performance. Handles periodic boundary conditions (wrapping).
- **Main Thread**: Renders the grid using `putImageData` for raw pixel manipulation.

## Features

- **High Resolution**: Supports grids up to 1 million cells.
- **Zero-Copy Rendering**: Uses `Transferable Objects` to pass the display buffer between threads without copying.
- **Interaction**: Draw on the canvas to revive cells.

## Usage

1. Open `index.html`.
2. Select "Grid Size".
3. Click "Start".
4. Click "Reset" to clear and start over with new random seed.
