# Frosted Glass Effect Example

## Overview
This example demonstrates how to create a "Frosted Glass" effect using Web Workers. It simulates the scattering of light passing through a translucent surface by randomly sampling pixels from a local neighborhood.

## Features
- **Scatter Radius**: Controls the blur amount. Higher values create a stronger frosted effect.
- **Random Seed**: Ensures the scattering pattern is reproducible.
- **Web Worker**: Pixel scattering is performed off the main thread.

## Technical Details
- The worker iterates through every pixel of the destination image.
- For each pixel `(x, y)`, it generates a random offset `(dx, dy)` within the specified radius.
- It copies the color from the source image at `(x + dx, y + dy)` to the destination at `(x, y)`.
- This creates a noisy blur effect characteristic of frosted glass.

## How to Use
1.  Open the `index.html` file in a browser.
2.  Upload an image.
3.  Adjust Scatter Radius.
4.  Click "Apply Effect".
