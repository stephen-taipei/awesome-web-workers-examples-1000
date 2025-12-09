# HDR Synthesis (Web Worker Example #338)

Demonstrates High Dynamic Range (HDR) synthesis using Exposure Fusion.

## How it works

1.  **Input**: Takes a series of images with different exposures (bracketing): underexposed (captures highlights), normal, and overexposed (captures shadows).
2.  **Exposure Fusion**: Instead of creating a float HDR image and tone mapping it (which is complex), this example implements **Exposure Fusion** (Mertens et al. simplified).
    *   It calculates a "weight" for each pixel in each image.
    *   The weight is based on "well-exposedness": pixels close to 0.5 brightness (128 in 8-bit) are given high weight, while pixels near 0 (black) or 1 (white) are given low weight.
    *   The final pixel value is a weighted average of all input images.

## Usage

1.  Upload 3 exposure-bracketed photos.
2.  Click "Create HDR".
3.  The result fuses the details from all exposures.

## Notes

*   Assumes aligned images.
