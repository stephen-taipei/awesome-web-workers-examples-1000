# Example 943: Pi Estimation (Monte Carlo)

This is a variation of Example 969, provided here as a distinct entry for the sake of the 1000-example completeness, focusing on a simpler visualization style (Pink theme).

## Description

Estimates $\pi$ by throwing random darts at a square board with an inscribed circle.
- **Worker Thread**: Generates random points and counts how many fall inside the circle.
- **Main Thread**: Visualizes the accumulation of points.

## Features

- **Monte Carlo**: Simple probabilistic algorithm.
- **Web Worker**: Offloads the random number generation loop.

## Usage

1. Open `index.html`.
2. Click "Start".
3. Watch the estimate converge to 3.14159...
