# Example 925: Diffusion-Limited Aggregation (DLA)

This example simulates **Diffusion-Limited Aggregation**, a process where particles undergoing a random walk cluster together to form fractal structures (like snowflakes or lightning).

## Description

- **Worker Thread**:
    1. Spawns particles on a circle surrounding the current cluster.
    2. Simulates random walks (Brownian motion) for each particle.
    3. Checks for collision with the existing cluster.
    4. Adds the particle to the cluster grid if it sticks.
    5. Optimizes simulation by killing particles that wander too far away.
- **Main Thread**: Receives the coordinates of newly stuck particles and draws them on the canvas.

## Features

- **Fractal Growth**: Generates organic, branching structures.
- **Optimization**: Uses a "Kill Radius" and "Spawn Radius" that grow dynamically with the cluster to avoid simulating empty space.
- **Visualization Modes**: Color particles by Time (Rainbow) or Distance from center.

## Usage

1. Open `index.html`.
2. Select "Batch Size" (Speed of growth).
3. Click "Start Growth".
4. Watch the fractal grow from the center.
5. Lower "Stickiness" to make the branches thicker/denser (particles penetrate deeper before sticking).
