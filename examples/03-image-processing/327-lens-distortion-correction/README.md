# Lens Distortion Correction

This example demonstrates how to implement a Lens Distortion Correction algorithm using Web Workers. It simulates the Brown-Conrady distortion model to correct Barrel and Pincushion distortions commonly found in photography.

## How it Works

1.  **Coordinate Mapping**: The worker iterates through every pixel in the destination (corrected) image.
2.  **Inverse Mapping**: For each pixel in the corrected image, we calculate where it would have come from in the distorted source image.
3.  **Distortion Model**: We use a polynomial radial distortion model:
    *   `r_src = r_dest * (1 + k1 * r^2 + k2 * r^4)`
    *   Where `r` is the normalized radial distance from the center.
    *   `k1` and `k2` are distortion coefficients.
4.  **Scaling**: A scaling factor is applied to zoom in or out, ensuring the corrected image fills the frame or preserves content.
5.  **Bilinear Interpolation**: Bilinear interpolation is used to sample the source image.

## Parameters

*   **k1 (Quadratic)**: The primary distortion coefficient. Positive values correct Barrel distortion (fisheye-like). Negative values correct Pincushion distortion.
*   **k2 (Quartic)**: The secondary distortion coefficient for fine-tuning the edges.
*   **Scale**: Zooms the image to crop out black edges or see more context.

## Performance

The image processing is offloaded to a Web Worker to prevent blocking the main UI thread.
