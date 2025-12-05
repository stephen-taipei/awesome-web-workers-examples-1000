# Example 964: Contour Plotter (Marching Squares)

This example demonstrates the **Marching Squares** algorithm running in a Web Worker to generate contour lines (isolines) from a scalar field.

## Description

Contour plots visualize 3D surfaces on a 2D plane using lines that connect points of equal value ($z$).
- **Worker Thread**:
    1. Generates a scalar field grid by evaluating $z = f(x, y)$.
    2. Determines threshold levels (isolines).
    3. Iterates through every grid cell, determines the topological state (16 cases) based on corner values relative to the threshold.
    4. Interpolates exact edge crossing points to create smooth lines.
- **Main Thread**: Renders the generated line segments on a Canvas, color-coded by value.

## Features

- **Isoline Generation**: Visualize "height" or "intensity" maps.
- **Linear Interpolation**: Ensures lines don't just connect grid centers but cross edges precisely, resulting in smoother curves.
- **Mathematical Field**: Input any 2D function (e.g., sine waves, exponentials).

## Usage

1. Open `index.html`.
2. Enter a function for $z$ (e.g., `sin(x) * cos(y)`).
3. Adjust "Resolution" (higher = smoother lines, slower).
4. Set "Isoline Levels" (number of contours).
5. Click "Generate Contours".
