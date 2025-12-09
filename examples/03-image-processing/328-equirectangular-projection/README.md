# Equirectangular Projection Viewer

This example demonstrates how to implement a 360° Equirectangular image viewer using Web Workers. It projects a portion of a spherical (equirectangular) image onto a flat (rectilinear) plane, simulating a camera view.

## How it Works

1.  **Ray Casting**: For every pixel in the output view (the camera view), we cast a ray into the 3D scene.
2.  **Rotation**: The ray is rotated based on the user's `Yaw` (horizontal rotation) and `Pitch` (vertical rotation).
3.  **Spherical Mapping**: The 3D ray vector (x, y, z) is converted into spherical coordinates (Latitude, Longitude).
4.  **UV Mapping**: Latitude and Longitude are mapped to UV coordinates (0-1) on the equirectangular source image.
    *   `u = (longitude + PI) / (2 * PI)`
    *   `v = (latitude + PI/2) / PI`
5.  **Sampling**: The source image is sampled at the calculated UV coordinates using bilinear interpolation.

## Parameters

*   **Yaw**: Horizontal rotation (pan).
*   **Pitch**: Vertical rotation (tilt).
*   **Field of View (FOV)**: How wide the camera sees (zoom level).

## Performance

The heavy trigonometric calculations for every pixel are offloaded to a Web Worker, allowing the UI to remain responsive even during continuous updates.
