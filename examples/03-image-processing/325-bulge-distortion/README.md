# Bulge Distortion Effect

This example demonstrates how to implement a Bulge Distortion effect using Web Workers. The bulge effect distorts the image by expanding pixels outward from a center point, creating a magnifying glass or fish-eye like appearance locally.

## How it Works

1.  **Coordinate Mapping**: The worker iterates through every pixel in the destination image.
2.  **Distance Calculation**: For each pixel, it calculates the distance from the user-defined center point.
3.  **Distortion Formula**: If the pixel is within the effect radius, a distortion factor is calculated. For a bulge effect, we want pixels further from the center in the destination image to map to pixels closer to the center in the source image (magnification).
    *   `src_coord = center + (dest_coord - center) * factor`
    *   Where `factor < 1` near the center.
4.  **Bilinear Interpolation**: To ensure smooth results, bilinear interpolation is used to sample the source image.

## Parameters

*   **Strength**: Controls the magnification level. Higher values create a stronger bulge.
*   **Radius**: The radius of the effect area in pixels.
*   **Center X/Y**: The center point of the distortion.

## Performance

The image processing is offloaded to a Web Worker to prevent blocking the main UI thread.
