# Example 965: 3D Surface Plotter

This example demonstrates generating and rendering a 3D surface mesh from a mathematical function in a Web Worker.

## Description

Surface plots visualize a function of the form $z = f(x, y)$.
- **Worker Thread**:
    1. Generates a grid of $(x, y)$ points.
    2. Evaluates the user-provided function $z = f(x, y)$ for each point.
    3. Constructs a mesh (vertices and quad faces).
- **Main Thread**:
    1. Receives the mesh data.
    2. Performs 3D rotation and projection (using Painter's Algorithm for depth sorting).
    3. Renders the surface on a 2D Canvas.

## Features

- **Math Evaluation**: Supports arbitrary JS Math expressions (e.g., `sin(x) * cos(y)`).
- **Mesh Generation**: Creates a structured grid suitable for wireframe or filled polygon rendering.
- **Interactive 3D**: Rotate the plot using sliders to inspect the surface from different angles. The projection logic runs on the main thread for smooth rotation, while geometry generation happens in the worker.

## Usage

1. Open `index.html`.
2. Enter a function for $z$ (e.g., `sin(sqrt(x*x + y*y))`).
3. Adjust "Range" (domain size) and "Resolution" (grid density).
4. Click "Generate Surface".
5. Use the "Rotation" sliders to spin the view.
