# Perspective Transform

A Web Worker example for applying perspective transformation to images.

## Description
Corrects perspective distortion by mapping a quadrilateral region of the source image to a rectangular destination. This is commonly used for document scanning or rectifying angled photos.

## Key Features
- **Homography Matrix Calculation**: Computes the 3x3 transformation matrix from 4 point correspondences.
- **Inverse Mapping**: Iterates over destination pixels and samples from the source to avoid holes.
- **Bilinear Interpolation**: Ensures high-quality output by interpolating between source pixels.

## Usage
1. Upload an image.
2. Drag the four corner handles to align with the object you want to rectify (e.g., a paper or screen).
3. Click "Apply Transform".
