# Example 961: Complex Domain Coloring

This example generates visual representations of complex functions $f(z)$ using **Domain Coloring** in a Web Worker.

## Description

Complex functions map a complex number input $z = x + iy$ to a complex output $w = u + iv$. Visualizing 4D data (2D input + 2D output) is difficult. Domain coloring solves this by coloring the 2D input plane based on the output value:
- **Hue**: Represents the Argument (Phase/Angle) of the output.
- **Brightness/Shading**: Represents the Modulus (Magnitude) of the output, often using cyclic bands to show contour lines.

- **Worker Thread**:
    1. Iterates over every pixel in the canvas.
    2. Maps the pixel $(x,y)$ to the complex plane $z$.
    3. Computes $w = f(z)$ using custom Complex Arithmetic logic.
    4. Maps $w$ to an RGB color and fills an `ArrayBuffer`.
- **Main Thread**: Receives the raw pixel buffer and renders it to the Canvas.

## Features

- **Complex Arithmetic**: Manual implementation of complex addition, multiplication, division, sin, exp, and power.
- **High-Res Rendering**: Generates full pixel buffers off-thread.
- **Rich Visuals**: Cyclic brightness bands reveal the magnitude contours (isolines), making zeros (dark spots) and poles (light spots or singularities) visible.

## Usage

1. Open `index.html`.
2. Select a function from the dropdown (e.g., the Rational function shows zeros and poles clearly).
3. Adjust "Zoom" to see more or less of the plane.
4. Click "Render".
