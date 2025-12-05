# Example 928: Lattice Boltzmann Fluid Simulation

This example simulates 2D fluid dynamics using the **Lattice Boltzmann Method (LBM)** in a Web Worker.

## Description

LBM is a class of computational fluid dynamics (CFD) methods for fluid simulation. Instead of solving the Navier-Stokes equations directly, it models the fluid as fictitious particles performing consecutive propagation and collision processes over a discrete lattice mesh.
- **Worker Thread**:
    1. Implements the D2Q9 model (2D grid, 9 velocity directions).
    2. Performs the **Collision** step (relaxation towards equilibrium).
    3. Performs the **Streaming** step (moving particles to neighbors).
    4. Handles "Bounce-back" boundary conditions for obstacles.
    5. Computes macroscopic quantities (Curl/Vorticity) for visualization.
- **Main Thread**: Renders the fluid field using a high-contrast color map to visualize vortices and flow wakes.

## Features

- **Real-time CFD**: Interactive fluid simulation running smoothly in the browser.
- **Von Karman Vortex Street**: Observe the oscillating flow pattern behind obstacles.
- **Interactive**: Draw barriers with the mouse to disrupt the flow.
- **Configurable**: Adjust Viscosity and Inlet Speed to change the Reynolds number (laminar vs turbulent flow).

## Usage

1. Open `index.html`.
2. Click "Start".
3. Select a "Barrier Shape" (e.g., Circle or Square) to see how it affects the flow.
4. Draw custom barriers with the mouse.
5. Adjust "Viscosity" to make the fluid thicker (syrup-like) or thinner (water-like).
