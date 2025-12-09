# Affine Transform

A Web Worker example for applying affine transformations to images.

## Description
Applies geometric transformations including scaling, rotation, shearing, and translation. The worker calculates the transformed image dimensions and performs inverse mapping with bilinear interpolation.

## Key Features
- **Composite Transformation**: Combines Scale, Rotate, and Shear operations.
- **Inverse Mapping**: Ensures complete coverage of the destination image.
- **Auto-Resizing**: The output canvas automatically adjusts to fit the transformed image.

## Usage
1. Upload an image.
2. Adjust the sliders for Scale, Rotation, and Shear.
3. Click "Apply" to generate the transformed image.
