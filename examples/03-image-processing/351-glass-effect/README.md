# Glass Effect Example

## Overview
This example demonstrates how to create a "Glass Effect" (or distortion effect) using Web Workers. It simulates looking through an irregular glass surface by displacing image fragments.

## Features
- **Block Size**: Controls the size of the glass fragments (shards).
- **Displacement Amount**: Controls how much the image is distorted within each fragment.
- **Random Seed**: Ensures the distortion pattern is reproducible.
- **Web Worker**: Pixel displacement mapping is performed off the main thread.

## Technical Details
- The worker iterates over the image in blocks of `blockSize`.
- For each block, it generates a random displacement vector (dx, dy).
- It copies pixels from the source image at `(x + dx, y + dy)` to the destination at `(x, y)`.
- This creates a blocky, distorted look reminiscent of looking through textured or broken glass.

## How to Use
1.  Open the `index.html` file in a browser.
2.  Upload an image.
3.  Adjust Block Size and Displacement Amount.
4.  Click "Apply Effect".
