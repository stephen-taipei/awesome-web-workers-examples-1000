# Image Stitching (Web Worker Example #334)

Demonstrates basic panoramic image stitching using Web Workers.

## How it works

1.  **Input**: Takes two overlapping images (assumed to be taken in left-to-right order).
2.  **Alignment Search**: The worker searches for the optimal horizontal offset (overlap) by minimizing the sum of absolute differences (SAD) between overlapping pixels.
    *   It slides Image 2 across Image 1 within a reasonable range (10% to 90% overlap).
    *   Uses a coarse search (step > 1) for performance.
3.  **Blending**: Once the best offset is found, it stitches the images.
    *   **Linear Blending**: In the overlap region, it linearly interpolates pixel values from Image 1 to Image 2 (alpha 0 to 1) to create a smooth transition and hide seams.

## Usage

1.  Drag and drop two images that share common content (e.g., a landscape photo split in two).
2.  Click "Stitch Images".
3.  The result will show the combined panorama.

## Limitations

*   **Translation Only**: Assumes images are only shifted horizontally. Does not handle rotation, scaling, or perspective distortion (which requires homography and feature matching like SIFT/ORB, hard to do efficiently in vanilla JS without libraries).
*   **Vertical Alignment**: Assumes images are vertically aligned.
