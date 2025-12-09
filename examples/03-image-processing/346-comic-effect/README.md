# Comic Effect (Web Worker Example #346)

This example creates a vintage comic book look using halftone patterns and ink outlines.

## How it works

1.  **Halftone Generation**: The core effect replaces continuous tones with a grid of dots.
    *   The worker calculates a rotated grid (typically 45 degrees).
    *   For every pixel, it determines its position relative to the nearest dot center in the grid.
    *   The size of the dot is determined by the brightness of the underlying image at that location (darker = larger dot).
    *   If the pixel falls inside the calculated radius of the dot, it is colored "ink" (black), otherwise "paper" (white).
2.  **Edge Detection**: A separate pass identifies high-contrast edges in the original image to draw thick black outlines, characteristic of comic art.
3.  **Compositing**: The halftone pattern and edge outlines are combined. Optionally, the original color is blended back in to create a colored comic effect.

## Features

*   **Dot Size**: Adjust the coarseness of the halftone grid.
*   **Color Overlay**: Toggle between Black & White style and Color Comic style.
*   **Web Worker**: The per-pixel geometric calculations for the rotated grid are processed in the background.
