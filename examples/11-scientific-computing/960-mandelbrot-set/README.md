# Example 960: Mandelbrot Set Explorer

This example generates the **Mandelbrot Set** fractal using a Web Worker to handle the pixel-by-pixel computations.

## Description

The Mandelbrot set is the set of complex numbers $c$ for which the sequence $z_{n+1} = z_n^2 + c$ does not diverge to infinity. Generating the image involves iterating this formula for every pixel, which is computationally expensive.
- **Worker Thread**:
    1. Maps screen pixels to the Complex Plane based on the current zoom/pan.
    2. Iterates the Mandelbrot formula up to `Max Iterations`.
    3. Maps the escape iteration count to a color palette.
    4. Returns a complete pixel buffer (`ArrayBuffer`) to the main thread.
- **Main Thread**: Draws the pixel buffer directly to the Canvas.

## Features

- **Deep Zoom**: Click anywhere to center and zoom in (2x per click).
- **Color Schemes**: Choose from Fire, Ice, Rainbow, or Classic styles.
- **High Performance**: Using `Uint32Array` for direct pixel manipulation allows rendering millions of pixels in milliseconds.

## Usage

1. Open `index.html`.
2. Click on any interesting edge of the black shape to zoom in.
3. Increase "Max Iterations" if the edges look blurry at high zoom levels.
4. Change "Color Scheme" for different artistic effects.
