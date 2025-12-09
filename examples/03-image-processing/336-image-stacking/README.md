# Image Stacking (Web Worker Example #336)

Demonstrates image stacking (Mean Stacking) to reduce noise using Web Workers.

## How it works

1.  **Multiple Inputs**: Takes a series of images of the same subject (e.g., astrophotography or low-light shots).
2.  **Averaging**: The worker iterates through every pixel position. It sums the color values from all input images and divides by the number of images.
3.  **Result**: Random noise (which varies per frame) is averaged out towards the mean signal, resulting in a smoother, cleaner image.

## Usage

1.  Take multiple photos of a static scene in low light (high ISO noise).
2.  Upload them here.
3.  Click Stack to see the noise reduction effect.

## Notes

*   This example assumes images are perfectly aligned (tripod shot).
*   Moving objects will appear as "ghosts".
