# Example 969: Monte Carlo Simulation (Estimating π)

This example demonstrates how to perform a **Monte Carlo Simulation** using a Web Worker to estimate the mathematical constant $\pi$.

## Description

Monte Carlo methods rely on repeated random sampling to obtain numerical results. To estimate $\pi$:
1.  Draw a square of side length 2 (area = 4).
2.  Inscribe a circle of radius 1 (area = $\pi$).
3.  Randomly throw points at the square.
4.  The ratio of points inside the circle to total points approximates the ratio of areas: $\frac{\pi}{4}$.
5.  Therefore, $\pi ≈ 4 \times \frac{\text{Points Inside}}{\text{Total Points}}$.

- **Worker Thread**: Generates millions of random coordinates, checks if they fall inside the unit circle, and accumulates the statistics.
- **Main Thread**: Visualizes the random points filling the canvas and updates the $\pi$ estimate in real-time.

## Features

- **High Performance**: Can process millions of points per second without blocking the UI.
- **Visualization**: See the statistical convergence visually as the circle becomes defined by the random dots.
- **Accuracy Tracking**: Real-time calculation of the error percentage relative to the actual value of $\pi$.

## Usage

1. Open `index.html`.
2. Select "Points per Batch" (Higher = faster convergence, less frequent UI updates).
3. Select "Simulation Speed".
4. Click "Start Simulation".
5. Watch the estimate stabilize around 3.14159...
