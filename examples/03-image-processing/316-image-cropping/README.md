# Image Cropping

A Web Worker example for cropping images.

## Description
Allows users to select a rectangular region on an image and crop it. The pixel copying and buffer creation are handled in a background worker.

## Key Features
- **Region Selection**: Interactive drag-and-drop selection on Canvas.
- **Web Worker Processing**: Pixel manipulation offloaded to worker.
- **Performance**: Efficient ArrayBuffer transfer (or structured cloning).

## Usage
1. Upload an image.
2. Drag on the image to select a cropping area.
3. Click "Crop Image".
4. Download the result.
