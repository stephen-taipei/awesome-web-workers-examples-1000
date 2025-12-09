# Example 932: Population Dynamics (Logistic Map)

This example visualizes the **Bifurcation Diagram** of the Logistic Map, a classic example of how complex, chaotic behavior can arise from very simple non-linear dynamical equations.

## Description

The Logistic Map equation is: $x_{n+1} = r x_n (1 - x_n)$.
- $r$: Growth rate parameter.
- $x$: Population ratio (0 to 1).

- **Worker Thread**:
    1. Iterates through values of $r$ from 2.4 to 4.0 (horizontal axis).
    2. For each $r$, runs the simulation for 1000 steps to let it settle (transient phase).
    3. Runs for another 500 steps and records all visited values of $x$ (vertical axis).
    4. Renders the points directly into a pixel buffer.
- **Main Thread**: Displays the resulting high-resolution bifurcation diagram.

## Features

- **Chaos Theory**: Visually identifies the period-doubling bifurcations and the onset of chaos at $r \approx 3.57$.
- **Pixel Manipulation**: Worker writes directly to `ArrayBuffer` for performant image generation.
- **Exploration**: Adjust the $r$ range to zoom into the fractal-like details of the diagram.

## Usage

1. Open `index.html`.
2. Adjust "Resolution" for finer detail.
3. Click "Generate".
4. Observe the branching structure. The single line splits into 2, then 4, then 8, eventually becoming a cloud of chaos (white noise).
