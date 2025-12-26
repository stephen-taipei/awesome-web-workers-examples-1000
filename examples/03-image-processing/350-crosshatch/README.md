# Crosshatch Effect Example

## Overview
This example demonstrates how to create a "Crosshatch" sketch effect using Web Workers. It simulates the artistic technique of drawing intersecting sets of parallel lines to create shading and texture.

## Features
- **Line Density**: Adjust the spacing between the hatching lines.
- **Threshold**: Adjust the sensitivity of the hatching to image brightness.
- **Web Worker**: Pixel-by-pixel line generation is performed off the main thread.

## Technical Details
- The worker iterates through every pixel of the destination image.
- It calculates the brightness of the corresponding pixel in the source image.
- Based on the brightness level, it decides whether to draw a pixel as part of a line.
- Lighter areas get fewer lines (or no lines), while darker areas get multiple overlapping layers of lines at different angles (simulated by modulo arithmetic on coordinates).

## How to Use
1.  Open the `index.html` file in a browser.
2.  Upload an image.
3.  Adjust Line Density and Threshold Factor.
4.  Click "Apply Effect".
