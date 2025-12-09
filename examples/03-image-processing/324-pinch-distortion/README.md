# Pinch Distortion Effect

This example demonstrates how to implement a Pinch Distortion effect using Web Workers. The pinch effect distorts the image by "pinching" or squeezing pixels towards a specific center point.

## How it Works

1.  **Coordinate Mapping**: The worker iterates through every pixel in the destination image.
2.  **Distance Calculation**: For each pixel, it calculates the distance from the user-defined center point.
3.  **Distortion Formula**: If the pixel is within the effect radius, a distortion factor is calculated. For a pinch effect, we want pixels closer to the center to be mapped to pixels further away in the source image (zooming out/squeezing).
    *   `src_coord = center + (dest_coord - center) * factor`
    *   Where `factor > 1` increases as we get closer to the center.
4.  **Bilinear Interpolation**: To ensure smooth results, bilinear interpolation is used to sample the source image at non-integer coordinates.

## Parameters

*   **Strength**: Controls how strong the pinch effect is. Higher values result in more squeezing.
*   **Radius**: The radius of the effect area in pixels.
*   **Center X/Y**: The center point of the distortion.

## Performance

The image processing is offloaded to a Web Worker to prevent blocking the main UI thread. The implementation uses direct pixel manipulation on `Uint8ClampedArray` for optimal performance.
