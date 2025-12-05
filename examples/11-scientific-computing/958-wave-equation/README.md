# Example 958: Interactive Wave Equation Solver

This example simulates 2D water ripples using the **Wave Equation** and Finite Difference Method in a Web Worker.

## Description

The Wave Equation is a partial differential equation (PDE) that describes the propagation of waves.
- **Worker Thread**: 
    1. Maintains two buffers (current state and previous state).
    2. Iterates over every cell to compute the new height based on neighbors (Laplacian).
    3. Renders the height map to an RGBA buffer.
    4. Transfers the buffer to the main thread for zero-copy rendering.
- **Main Thread**: Displays the simulation and handles mouse interactions to create ripples.

## Features

- **Real-time PDE Solving**: Solves the wave equation at 60 FPS on a 500x500 grid (250,000 cells).
- **Interactive**: Click or drag on the canvas to create waves.
- **Zero-Copy Transfer**: Uses `Transferable Objects` to pass the image data back and forth, eliminating memory copy overhead.

## Usage

1. Open `index.html`.
2. Click "Start Simulation".
3. Click or drag your mouse on the blue area to create ripples.
4. Adjust "Damping" to make the water more viscous (ripples die out faster) or more fluid.
5. Adjust "Raindrop Frequency" to add automatic random drips.
