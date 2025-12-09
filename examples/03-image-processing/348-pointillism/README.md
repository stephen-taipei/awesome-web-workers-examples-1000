# Pointillism Effect Example

## Overview
This example demonstrates how to create a "Pointillism" art effect using Web Workers. The worker generates thousands of dots based on the colors of the source image to reconstruct it artistically.

## Features
- **Point Size**: Adjust the size of the dots.
- **Density**: Control the spacing between dots.
- **Randomness**: Add jitter to dot position and size for a more organic look.
- **Web Worker**: Heavy pixel manipulation and rasterization happens off the main thread.

## Technical Details
- The main thread sends the `ImageData` to the worker.
- The worker creates a new blank white `ImageData`.
- It iterates over the image with a step size.
- For each step, it samples the color from the source image at a (randomly displaced) coordinate.
- It then rasterizes a filled circle of that color onto the new `ImageData`.
- Finally, it sends the processed `ImageData` back to the main thread for display.

## How to Use
1.  Open the `index.html` file in a browser.
2.  Upload an image or drop one into the designated area.
3.  Adjust the Point Size, Density, and Randomness sliders.
4.  Click "Apply Effect".
