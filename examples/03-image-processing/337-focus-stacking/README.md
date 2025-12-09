# Focus Stacking (Web Worker Example #337)

Demonstrates how to combine multiple images focused at different depths into a single all-in-focus image.

## How it works

1.  **Sharpness Map**: For each input image, the worker calculates a "sharpness map" using a Laplacian filter (detecting edges).
2.  **Smoothing**: The sharpness maps are blurred (windowed average) to avoid noisy pixel-level switching and create consistent regions.
3.  **Selection**: For every pixel coordinate, the worker checks which image has the highest sharpness value in its map and selects the pixel from that image.

## Usage

1.  Upload a series of macro photos where focus shifts from front to back.
2.  Click "Focus Stack".
3.  The result should be sharp throughout.

## Notes

*   Requires images to be perfectly aligned (tripod).
*   Changes in focal length (focus breathing) can cause misalignment, which this simple demo does not correct.
