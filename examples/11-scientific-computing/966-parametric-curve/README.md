# Example 966: Parametric Curve Generator

This example demonstrates generating 2D geometry from mathematical formulas in a Web Worker.

## Description

Parametric equations express the coordinates of the points that make up a geometric figure as functions of a variable, typically time $t$.
- **Worker Thread**:
    1. Compiles user-provided string equations (e.g., `x = sin(t)`) into executable functions dynamically.
    2. Iterates through the range `[tMin, tMax]`.
    3. Evaluates $x(t)$ and $y(t)$ for each step.
- **Main Thread**: Auto-scales and renders the calculated points as a continuous path on the Canvas.

## Features

- **Dynamic Evaluation**: Uses `new Function` with a `Math` context to allow users to write natural math expressions (e.g., `sin(t)` instead of `Math.sin(t)`).
- **Auto-Scaling**: The visualization automatically centers and zooms to fit the generated curve.
- **Preset**: Defaults to a Heart curve equation.

## Usage

1. Open `index.html`.
2. Enter equations for $x(t)$ and $y(t)$.
   - *Example (Circle)*: `x = cos(t)`, `y = sin(t)`
   - *Example (Lissajous)*: `x = sin(3*t)`, `y = sin(4*t)`
3. Set `t Min` and `t Max` (e.g., 0 to 6.28 for a full circle).
4. Click "Draw Curve".
