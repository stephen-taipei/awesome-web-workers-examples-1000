# Example 931: Reaction-Diffusion Simulation

This example simulates the **Gray-Scott** reaction-diffusion model in a Web Worker.

## Description

Reaction-diffusion systems model how the concentration of substances (chemicals) evolves under the influence of two processes: local chemical reactions and diffusion. This model generates complex, organic-looking patterns like spots and stripes found in nature (e.g., zebra stripes, coral reefs).
- **Worker Thread**:
    1. Maintains two 2D grids representing chemical concentrations (A and B).
    2. Computes the Laplacian (diffusion) for every cell.
    3. Updates concentrations based on the reaction rules: $A + 2B \to 3B$ (B eats A).
    4. Renders the state to an image buffer.
- **Main Thread**: Displays the simulation and allows user interaction to "seed" chemicals.

## Features

- **Turing Patterns**: Demonstrates emergence of order from chaos.
- **High Performance**: Runs multiple simulation steps per frame in the worker for smooth animation.
- **Interactive**: "Paint" chemical B onto the canvas to disturb the system.
- **Presets**: Switch between parameter sets to see different pattern types (Mitosis, Coral, Worms).

## Usage

1. Open `index.html`.
2. Click "Start".
3. Click on the canvas to add chemical B (seed).
4. Change "Presets" to see different pattern behaviors.
5. Adjust "Feed Rate" and "Kill Rate" slightly to morph the patterns.

