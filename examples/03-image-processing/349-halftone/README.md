# Halftone Effect Example

## Overview
This example demonstrates how to create a "Halftone" effect using Web Workers. Halftone is the reprographic technique that simulates continuous-tone imagery through the use of dots, varying either in size or in spacing, thus generating a gradient-like effect.

## Features
- **Grid Size**: Adjust the size of the grid cells (and thus the maximum dot size).
- **Angle**: Rotate the halftone grid.
- **Invert**: Choose between dark dots on a light background (classic print) or light dots on a dark background.
- **Web Worker**: Grid calculation and rasterization happens off the main thread.

## Technical Details
- The worker creates a new `ImageData`.
- It iterates over a rotated grid coordinate system.
- For each grid cell, it maps the center back to image coordinates to sample the brightness.
- It calculates the dot radius based on the pixel brightness (darker = larger dot for standard printing).
- It rasterizes the circle onto the destination image.

## How to Use
1.  Open the `index.html` file in a browser.
2.  Upload an image.
3.  Adjust the Grid Size and Angle.
4.  Toggle "Dark dots on Light background" as needed.
5.  Click "Apply Effect".
