# Seam Carving (Web Worker Example #333)

Demonstrates content-aware image resizing (Seam Carving) using Web Workers.

## How it works

1.  **Energy Calculation**: The worker computes an energy map of the image based on gradient magnitude (how much neighboring pixels differ). High energy means "important" content (edges, details).
2.  **Seam Finding**: Uses Dynamic Programming to find a connected vertical path (seam) of pixels from top to bottom that has the minimum total energy.
3.  **Seam Removal**: The selected seam is removed, reducing the image width by 1 pixel.
4.  **Iteration**: This process is repeated until the target width is reached.

## Key Features

*   **Content Preservation**: Unlike standard scaling, seam carving tries to keep important objects intact while removing uniform backgrounds.
*   **Visual Progress**: The worker reports progress, allowing the UI to update as seams are carved.
*   **Computationally Intensive**: This algorithm is O(N*M) per seam, making it a perfect candidate for Web Workers to avoid freezing the main thread.

## Limitations

*   **Performance**: Seam carving is slow in JavaScript for large images or large reduction amounts. The example limits image size for demonstration purposes.
*   **Artifacts**: Excessive carving can lead to visual artifacts or distorted objects.
