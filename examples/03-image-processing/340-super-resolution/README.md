# Super Resolution (Web Worker Example #340)

This example demonstrates how to perform image super-resolution (upscaling) using **Bicubic Interpolation** followed by **Unsharp Masking** for detail enhancement.

## How it works

1.  **Image Upload**: The user uploads an image.
2.  **Worker Creation**: A dedicated Web Worker is initialized to handle the intensive image processing tasks.
3.  **Data Transfer**: The image data is transferred to the worker.
4.  **Bicubic Interpolation**:
    *   The worker creates a new image buffer scaled by the selected factor (2x, 3x, 4x).
    *   For each pixel in the new image, it maps back to the source coordinates.
    *   A weighted average of the 4x4 surrounding pixels in the source image is calculated using the cubic convolution kernel.
    *   This provides smoother results than nearest-neighbor or bilinear interpolation.
5.  **Unsharp Masking**:
    *   To counteract the blurring effect of upscaling, an unsharp mask filter is applied.
    *   It calculates a local average (blur) and subtracts it from the original to find edges.
    *   The edges are then added back to the image to increase apparent sharpness.
6.  **Rendering**: The processed image data is sent back to the main thread and drawn onto the canvas.

## Features

*   **Adjustable Scale**: Choose between 2x, 3x, and 4x magnification.
*   **Sharpening Control**: Adjust the strength of the sharpening filter to fine-tune the result.
*   **Web Worker**: All processing happens off the main thread, keeping the UI responsive.
*   **Progress Tracking**: Real-time progress updates during the upscaling process.

## Performance

*   Bicubic interpolation is computationally expensive (16 texture lookups per pixel).
*   Processing time increases with the square of the scale factor.
*   Web Workers ensure that even large images can be processed without freezing the browser.
