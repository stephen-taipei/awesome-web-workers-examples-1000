# Example 938: Fractal Zoom Video Generator

This example generates a sequence of frames simulating a deep zoom into the Mandelbrot Set using a Web Worker.

## Description

Creating a smooth zoom animation requires rendering the fractal hundreds of times at progressively smaller scales (higher precision).
- **Worker Thread**:
    1. Calculates the zoom trajectory (logarithmic interpolation).
    2. Renders each frame of the animation sequence.
    3. Dynamically adjusts iteration depth based on zoom level to maintain detail.
    4. Transfers frames back to the main thread sequentially.
- **Main Thread**: Stores the received frames in memory and provides a playback loop.

## Features

- **Batch Processing**: Demonstrates handling a long-running, multi-step task in a worker.
- **Memory Management**: Estimates memory usage of the stored frame buffer.
- **Smooth Zoom**: Uses logarithmic scaling for a constant zoom velocity visual effect.

## Usage

1. Open `index.html`.
2. Select "Total Frames" and "Total Zoom".
3. Click "Render Sequence".
4. Wait for the progress bar to reach 100%.
5. Click "Play Animation" to watch the zoom video.
