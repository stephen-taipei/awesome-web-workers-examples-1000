# Sketch Effect (Web Worker Example #342)

This example creates a pencil sketch effect from an image using the Color Dodge blending technique.

## How it works

The sketch effect is achieved through a multi-step pipeline processed in a Web Worker:

1.  **Grayscale Conversion**: The image is first converted to black and white.
2.  **Inversion**: A negative copy of the grayscale image is created.
3.  **Gaussian Blur**: The inverted copy is heavily blurred. The radius of this blur controls the "thickness" and darkness of the sketch lines.
4.  **Color Dodge Blending**: The original grayscale image is blended with the blurred negative. The formula `Result = Base / (1 - Blend)` brightens the base layer (grayscale) based on the blend layer (blurred negative).
    *   Where the image has uniform color (flat areas), the inverted blur is almost the exact inverse of the grayscale, resulting in white.
    *   Where there are edges, the blur causes a difference, resulting in dark lines.

## Features

*   **Adjustable Line Thickness**: The blur radius slider controls the visual weight of the pencil strokes.
*   **Web Worker Implementation**: The multi-pass filtering (especially Gaussian Blur) is computationally intensive, making it ideal for background processing.
