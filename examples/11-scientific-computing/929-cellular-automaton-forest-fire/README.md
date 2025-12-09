# Example 929: Forest Fire Simulation

This example simulates a forest fire using a probabilistic **Cellular Automaton** model in a Web Worker.

## Description

The Forest Fire model demonstrates self-organized criticality. The grid represents a forest where each cell can be: Empty, Tree, or Burning.
- **Rules**:
    1. **Burning** cell turns into **Empty** (burnt down).
    2. **Empty** cell grows a **Tree** with probability $p$.
    3. **Tree** catches **Fire** if at least one neighbor is burning.
    4. **Tree** ignites spontaneously (lightning) with probability $f$.

- **Worker Thread**: Computes the state transitions for the grid and renders to a pixel buffer.
- **Main Thread**: Displays the simulation.

## Features

- **Stochastic Dynamics**: Unlike Game of Life, this model includes randomness (growth and lightning).
- **Interactive**: Click anywhere to start a fire manually.
- **Parameter Tuning**: Adjust growth rate and lightning frequency to see different regimes (e.g., small frequent fires vs rare massive infernos).

## Usage

1. Open `index.html`.
2. Click "Start".
3. Watch the forest grow (Green).
4. Wait for a random lightning strike or Click to ignite a tree.
5. Observe the fire (Red) spread and consume the cluster of trees.
