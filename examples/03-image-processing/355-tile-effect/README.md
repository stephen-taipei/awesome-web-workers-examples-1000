# Tile Effect Example

## Overview
This example demonstrates how to create a "Tile Effect" using Web Workers. It repeats the original image in a grid pattern.

## Features
- **Grid Size**: Adjust the number of tiles (e.g., 3x3).
- **Web Worker**: Pixel coordinate mapping is performed off the main thread.

## Technical Details
- The worker iterates through every pixel of the destination image.
- It determines which tile the pixel belongs to.
- It maps the pixel's relative position within the tile to the corresponding position in the full source image.
- This effectively scales down the source image and repeats it across the grid.

## How to Use
1.  Open the `index.html` file in a browser.
2.  Upload an image.
3.  Adjust the Grid Size.
4.  Click "Apply Effect".
