# Cartoon Effect (Web Worker Example #345)

This example creates a cartoon (cel-shaded) effect by combining color quantization with edge detection.

## How it works

The process involves three main steps executed in a Web Worker:

1.  **Smoothing**: A median filter is applied first to reduce noise and flatten texture details, which helps in creating cleaner regions of solid color.
2.  **Color Quantization**: The color palette is reduced. Each pixel's color channel is rounded to the nearest discrete level (e.g., if there are 4 levels, values might snap to 0, 85, 170, 255). This creates the "banding" look typical of cartoons.
3.  **Edge Detection**: The algorithm detects sharp transitions in brightness (edges) in the original image.
4.  **Compositing**: The detected edges are drawn as black lines on top of the quantized image.

## Features

*   **Color Levels**: Adjust the number of colors in the palette. Fewer levels result in a more abstract, posterized look.
*   **Edge Threshold**: Controls the sensitivity of the edge detection. Lower values detect more fine details as edges.
*   **Web Worker**: Prevents UI freezing during the multi-pass processing pipeline.
