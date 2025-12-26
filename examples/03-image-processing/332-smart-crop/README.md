# Smart Crop (Web Worker Example #332)

Demonstrates content-aware image cropping using saliency detection in a Web Worker.

## How it works

1.  **Saliency Detection**: The worker calculates an "energy map" of the image. It uses:
    *   **Edge Density**: Areas with high contrast edges (calculated via Sobel operator) are considered interesting.
    *   **Center Bias**: Pixels closer to the center are given slightly higher weight, mimicking human tendency to frame subjects centrally.
2.  **Integral Image**: To efficiently calculate the sum of energy within any rectangular region, a Summed Area Table (Integral Image) is constructed.
3.  **Sliding Window Search**: The worker slides a window of the target aspect ratio across the image.
4.  **Selection**: The window position with the highest total energy is selected as the crop region.

## Key Features

*   **Content-Awareness**: Crops to the most "interesting" part of the image, not just the center.
*   **Aspect Ratio Support**: Supports common aspect ratios like 1:1, 4:3, 16:9, etc.
*   **Performance**: Uses Web Worker for computationally intensive pixel processing (Sobel, Integral Image), keeping the UI responsive.
