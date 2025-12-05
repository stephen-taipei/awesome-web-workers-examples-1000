# Example 927: Stable Fluids (Navier-Stokes)

This example implements **Jos Stam's Stable Fluids** algorithm to solve the Navier-Stokes equations for incompressible flow in a Web Worker.

## Description

Computational Fluid Dynamics (CFD) simulates the behavior of fluids. The Stable Fluids method uses a semi-Lagrangian scheme for advection and an implicit solver for diffusion and pressure projection, ensuring stability even with large time steps.
- **Worker Thread**:
    1. Solves for velocity field (Diffusion, Advection, Projection).
    2. Solves for density field (Diffusion, Advection).
    3. Handles boundary conditions.
    4. Renders the density (dye) to a pixel buffer.
- **Main Thread**: Displays the fluid simulation and captures mouse input to inject velocity (force) and density (dye).

## Features

- **Navier-Stokes Solver**: Physically based fluid movement including viscosity and pressure (mass conservation).
- **Interactive**: Drag your mouse to swirl the fluid and add colorful dye.
- **Stable**: Remains stable (doesn't explode) even with fast movements, thanks to the implicit solver.

## Usage

1. Open `index.html`.
2. Click "Start".
3. **Click and Drag** on the black canvas to stir the fluid. You will see purple/white smoke trails following your mouse.
4. Adjust "Viscosity" and "Diffusion" to change how thick the fluid feels and how fast the dye spreads.
5. Increase "Solver Iterations" for higher accuracy (less compressibility artifacts) at the cost of FPS.
