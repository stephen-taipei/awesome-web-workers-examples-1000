# Example 939: Julia Set Explorer

This example renders the **Julia Set** fractal for a given complex constant $c$ using a Web Worker.

## Description

Unlike the Mandelbrot set (where $c$ varies and $z_0=0$), the Julia set fixes $c$ and iterates $z_{n+1} = z_n^2 + c$ for every pixel (representing initial $z_0$) on the complex plane.
- **Worker Thread**: Performs the escape-time iteration algorithm for every pixel and maps the iteration count to a color.
- **Main Thread**: Handles mouse interaction to dynamically update the constant $c$ and displays the result.

## Features

- **Interactive Exploration**: "Track Mouse" mode allows you to see how the Julia set morphs continuously as you change the complex parameter $c$.
- **Efficient Rendering**: Uses Transferable Objects and `Uint32Array` for fast pixel manipulation.
- **Color Palettes**: Includes Electric, Grayscale, and Heatmap styles.

## Usage

1. Open `index.html`.
2. Ensure "Track Mouse" is checked.
3. Move your mouse over the canvas to change the shape of the fractal in real-time.
4. Uncheck "Track Mouse" to freeze the shape and explore "Iterations" or "Color Scheme" settings.
