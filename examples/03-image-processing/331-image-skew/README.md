# Image Skew

This example demonstrates how to implement an affine Skew (Shear) transformation using Web Workers.

## How it Works

1.  **Coordinate Mapping**: We iterate through the destination image pixels.
2.  **Inverse Transformation**: To find the color of each destination pixel, we inverse-map its coordinates back to the source image.
    *   Forward Shear: `x' = x + shx * y`, `y' = y + shy * x`
    *   Inverse Shear: We solve the linear system to find `x, y` given `x', y'`.
3.  **Bounding Box**: The worker first calculates the bounding box of the transformed image to resize the canvas appropriately.
4.  **Bilinear Interpolation**: Bilinear interpolation is used for high-quality resampling.

## Parameters

*   **Horizontal Skew (X)**: Slants the image horizontally by an angle in degrees.
*   **Vertical Skew (Y)**: Slants the image vertically by an angle in degrees.

## Performance

The image processing is offloaded to a Web Worker to prevent blocking the main UI thread.
