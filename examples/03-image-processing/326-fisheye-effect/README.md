# Fisheye Effect

This example demonstrates how to implement a Fisheye Lens effect using Web Workers. The fisheye effect creates a strong visual distortion intended to create a wide panoramic or hemispherical image.

## How it Works

1.  **Coordinate Mapping**: The worker iterates through every pixel in the destination image.
2.  **Distance Calculation**: For each pixel, it calculates the distance from the image center.
3.  **Distortion Formula**: A radial distortion function is applied to simulate the curvature of a fisheye lens.
    *   We use a mapping where `src_radius < dest_radius` to magnify the center and compress the edges.
    *   `src_coord = center + (dest_coord - center) * factor`
    *   Where `factor = 1 / (1 + strength * (r/max_r)^2)`
4.  **Bilinear Interpolation**: To ensure smooth results, bilinear interpolation is used to sample the source image.

## Parameters

*   **Strength**: Controls the intensity of the fisheye effect.

## Performance

The image processing is offloaded to a Web Worker to prevent blocking the main UI thread.
