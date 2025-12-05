# Example 941: Brownian Motion (Random Walk)

This example simulates **Brownian Motion**, the random movement of particles in a fluid, using a Web Worker.

## Description

Brownian motion is a stochastic process that can be modeled by a Random Walk.
- **Worker Thread**:
    1. Initializes particles at the center of the canvas.
    2. Updates the position of each particle by adding a small random displacement $(dx, dy)$ at every step.
    3. Transfers the positions to the main thread.
- **Main Thread**: Renders the particles with a trail effect to visualize their path history.

## Features

- **Particle System**: Simulates up to 5,000 independent particles.
- **Trails**: Uses canvas alpha clearing to create fading trails, highlighting the "diffusion" effect over time.
- **Zero-Copy**: Efficiently transfers particle data between threads.

## Usage

1. Open `index.html`.
2. Select "Particles" count.
3. Adjust "Temperature" (Speed of movement).
4. Click "Start Simulation".
5. Watch the cloud of particles diffuse outward from the center.
