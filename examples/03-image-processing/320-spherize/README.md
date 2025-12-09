# Spherize Effect

A Web Worker example for applying a spherical distortion to images.

## Description
Simulates a lens effect (fisheye or bulge/pinch) by remapping pixels based on their distance from a center point. The calculation is done in a worker to maintain responsiveness.

## Key Features
- **Adjustable Strength**: Controls the amount of bulging (positive) or pinching (negative).
- **Configurable Geometry**: Adjust center position and radius of the effect.
- **High Quality**: Uses bilinear interpolation for smooth results.

## Usage
1. Upload an image.
2. Use the sliders to adjust Strength, Center (X/Y), and Radius.
3. Click "Apply Effect".
