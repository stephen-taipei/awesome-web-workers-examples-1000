# Example 942: Monte Carlo Integration

This example demonstrates **Numerical Integration** using the Monte Carlo method (specifically Rejection Sampling) in a Web Worker.

## Description

To find the area under a curve $f(x)$ (the definite integral $\int_a^b f(x) dx$), we can enclose the function in a bounding box of known area $A_{box}$. By generating random points $(x, y)$ within this box, the fraction of points that fall under the curve approximates the ratio of the integral to the box area.
- **Worker Thread**:
    1. Parses the user-defined function.
    2. Generates random points within the specified bounds.
    3. Evaluates if each point is "under the curve".
    4. Estimates the integral area: Area $\approx \frac{N_{under}}{N_{total}} \times A_{box}$.
- **Main Thread**: Visualizes the sampling process by drawing blue dots (accepted) and grey dots (rejected), filling the shape of the function.

## Features

- **Custom Functions**: Supports arbitrary JS math expressions (e.g., `sin(x) * x`).
- **Visual Sampling**: Intuitively shows how the random points approximate the shape's area.
- **Convergence**: Watch the integral value stabilize as more points are sampled.

## Usage

1. Open `index.html`.
2. Enter a function (must be positive in the range for this simple visualizer).
3. Set X Min/Max and Y Bound (height of the box).
4. Click "Start Integration".
5. Watch the canvas fill up with dots and the "Integral" value converge.

