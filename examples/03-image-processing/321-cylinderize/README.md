# Cylinderize Effect

A Web Worker example for applying a cylindrical projection to images.

## Description
Wraps the image around a virtual cylinder (vertical or horizontal). This creates a 3D-like effect where the center of the image appears closer than the edges.

## Key Features
- **Axis Selection**: Choose between Vertical (bottle-label style) or Horizontal wrapping.
- **Strength Control**: Adjusts the curvature/radius of the cylinder.
- **Inverse Projection**: Uses trigonometric mapping (`asin`) to correctly project screen pixels to texture coordinates.

## Usage
1. Upload an image.
2. Select the Axis (Vertical or Horizontal).
3. Adjust Strength.
4. Click "Apply Effect".
