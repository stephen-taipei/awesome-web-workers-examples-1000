# Example 963: Vector Field Streamlines

This example visualizes a 2D vector field by simulating thousands of particles moving through it using a Web Worker.

## Description

A vector field assigns a vector $(u, v)$ to every point $(x, y)$ in space. Streamlines are curves that are tangent to the velocity vector of the flow.
- **Worker Thread**:
    1. Compiles user-defined field equations $u(x,y)$ and $v(x,y)$.
    2. Manages the positions of thousands of particles.
    3. Updates positions using **Runge-Kutta 2nd Order (Heun's Method)** integration for more accurate trajectory following than simple Euler integration.
    4. Handles boundary wrapping (particles leaving one side re-enter the other).
- **Main Thread**: Renders the particles with a fading trail effect to visualize the flow patterns.

## Features

- **Custom Equations**: Input any valid JavaScript Math expression for the X and Y components of the field.
- **Particle System**: Simulates thousands of independent agents in parallel.
- **Flow Visualization**: Uses alpha-blending trails to reveal the structure (vortices, sources, sinks) of the field.

## Usage

1. Open `index.html`.
2. Enter equations for `u` (dx/dt) and `v` (dy/dt).
   - *Default*: `cos(x) * y` and `sin(y) * x` creates a grid of swirls.
   - *Vortex*: `u = -y`, `v = x`
   - *Saddle*: `u = x`, `v = -y`
3. Adjust "Particles" count.
4. Click "Start Simulation".
