# Image Alignment (Web Worker Example #339)

Demonstrates automatic image alignment (registration) using translation search.

## How it works

1.  **Input**: Takes a reference image and a target image (which is slightly shifted).
2.  **Search**: The worker searches for the optimal (x, y) translation that minimizes the difference between the two images.
    *   It converts images to grayscale.
    *   It performs a "coarse" search (checking every Nth pixel) over a range of possible offsets.
    *   It minimizes the Sum of Absolute Differences (SAD) per pixel.
    *   It performs a "fine" search around the best coarse match.
3.  **Result**: Returns the (x, y) offset needed to align the target image to the reference.

## Usage

1.  Upload two images that are slightly misaligned (e.g., handheld burst shots).
2.  Click "Align Images".
3.  The result shows an overlay of the reference and the aligned target to verify the match.
