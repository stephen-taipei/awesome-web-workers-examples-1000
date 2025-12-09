# Mirror Effect Example

## Overview
This example demonstrates how to create a "Mirror Effect" using Web Workers. It reflects a portion of the image onto the other side across a central axis.

## Features
- **Mirror Mode**: Choose the direction of reflection:
    - Left to Right
    - Right to Left
    - Top to Bottom
    - Bottom to Top
    - Quad (4-way symmetry)
- **Web Worker**: Pixel coordinate mapping is performed off the main thread.

## Technical Details
- The worker iterates through every pixel of the destination image.
- Based on the selected mode and the pixel's position relative to the center axis, it calculates the corresponding source coordinate.
- For example, in "Left to Right" mode, if a pixel is on the right side, it samples from the mirrored position on the left.

## How to Use
1.  Open the `index.html` file in a browser.
2.  Upload an image.
3.  Select a Mirror Mode.
4.  Click "Apply Effect".
