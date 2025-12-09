# Pixelate Effect (Web Worker Example #341)

This example demonstrates how to create a pixel art or mosaic effect using block averaging.

## How it works

1.  **Block Iteration**: The image is divided into square blocks of size $N \times N$.
2.  **Color Averaging**: For each block, the worker calculates the average RGB values of all pixels within that block.
3.  **Filling**: The entire block is then filled with this calculated average color.
4.  **Web Worker**: The processing happens in a background thread to prevent UI blocking, especially for large images or small block sizes (which require more iterations).

## Features

*   **Adjustable Block Size**: Control the size of the "pixels" to vary the level of abstraction.
*   **Edge Handling**: Correctly handles image edges where blocks might be smaller than the specified size.
*   **Performance**: Efficient single-pass algorithm.
