# Watercolor Effect (Web Worker Example #343)

This example simulates a watercolor painting effect using a combination of median filtering and edge detection.

## How it works

1.  **Median Filtering**: A median filter is applied to the image. This operation replaces each pixel with the median color of its neighbors. This effectively flattens textures and removes noise while preserving sharp edges, mimicking the "wash" of watercolor paint.
2.  **Edge Detection**: A Sobel operator calculates the gradient magnitude of the smoothed image to identify edges.
3.  **Blending**: The detected edges are darkened and blended back onto the smoothed image. This simulates the effect where pigment pools at the edges of wet areas.

## Features

*   **Smoothing Level**: Controls the radius of the median filter. Higher values create larger, flatter washes of color.
*   **Edge Intensity**: Controls how dark and prominent the edges appear in the final result.
*   **Web Worker**: The median filter is computationally expensive ($O(r^2)$ per pixel with sorting), making background processing essential.
