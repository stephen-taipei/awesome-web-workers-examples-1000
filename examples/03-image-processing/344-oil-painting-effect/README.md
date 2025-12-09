# Oil Painting Effect (Web Worker Example #344)

This example implements the **Kuwahara Filter** to simulate an oil painting effect.

## How it works

The Kuwahara filter is a non-linear smoothing filter used in image processing for adaptive noise reduction. It works by:

1.  **Quadrant Division**: For every pixel, a square window centered on the pixel is divided into four overlapping sub-regions (quadrants).
2.  **Statistical Analysis**: The mean (average color) and variance (standard deviation) are calculated for each of the four quadrants.
3.  **Selection**: The quadrant with the lowest variance (the most homogenous region) is selected. This avoids smoothing across edges.
4.  **Assignment**: The central pixel is assigned the mean color of the selected quadrant.

This process results in an image where regions are smoothed but edges remain sharp, creating a blocky, stylized effect reminiscent of oil painting brushstrokes.

## Features

*   **Brush Size**: Controls the radius of the filter window. Larger radii create larger "brushstrokes" and a more abstract effect.
*   **Web Worker**: The algorithm is computationally intensive ($O(r^2)$ per pixel, calculating variance for 4 regions), necessitating background processing.
