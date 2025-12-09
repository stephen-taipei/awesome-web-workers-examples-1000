# Example 950: PDE Solver (Heat Equation)

This example solves the **Heat Equation** (a Partial Differential Equation) using the **Finite Difference Method** in a Web Worker.

## Description

The Heat Equation $\frac{\partial u}{\partial t} = \alpha \nabla^2 u$ describes how heat diffuses through a medium over time.
- **Worker Thread**:
    1. Maintains a 2D grid of temperature values.
    2. Iteratively updates each cell based on the average temperature of its neighbors (Laplacian operator).
    3. Applies boundary conditions (Fixed temperature, Insulated, or Periodic).
    4. Renders the temperature field to an image buffer using a heat map color scheme.
- **Main Thread**:
    Displays the simulation and allows user interaction to "paint" heat onto the grid.

## Features

- **Physics Simulation**: Accurate diffusion behavior based on physical laws.
- **Boundary Conditions**: Explore how different boundaries (e.g., "Insulated" vs "Fixed Cold") affect the heat dissipation.
- **Interactive**: Draw on the canvas to add heat sources and watch them diffuse.

## Usage

1. Open `index.html`.
2. Click "Start".
3. Click and drag on the black canvas to add heat (Red/Yellow spots).
4. Watch the heat spread and cool down (turn Blue).
5. Change "Boundary Condition" to "Periodic" and draw near the edge to see heat wrap around.

