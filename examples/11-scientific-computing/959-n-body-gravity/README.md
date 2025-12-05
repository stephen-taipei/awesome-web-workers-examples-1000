# Example 959: N-Body Gravity Simulation

This example simulates the gravitational interaction between many particles using a Web Worker.

## Description

The N-body problem involves predicting the individual motions of a group of celestial objects interacting with each other gravitationally.
- **Worker Thread**:
    1. Calculates the gravitational force between every pair of particles ($O(N^2)$ complexity).
    2. Updates velocities and positions using simple Euler integration.
    3. Transfers the position data (`Float32Array`) to the main thread using **Zero-Copy Transferables** for high performance.
- **Main Thread**: Renders the particles on a Canvas with color based on velocity.

## Features

- **Brute Force**: Computes all pair-wise interactions. 1,000 bodies = 1,000,000 interactions per frame.
- **Transferable Objects**: Demonstrates passing ownership of TypedArrays between threads to eliminate serialization overhead.
- **Interactive Physics**: Adjust Gravity ($G$) and Softening parameter in real-time to stabilize or explode the galaxy.

## Usage

1. Open `index.html`.
2. Select "Number of Bodies" (1,000 is a good start).
3. Click "Start Simulation".
4. Watch the particles orbit the heavy center (simulated black hole).
5. Try increasing Gravity to see the orbits tighten, or decrease Softening to see more violent ejections.
