# Random Search (Web Worker Example #142)

This example demonstrates **Random Search** (Stochastic Optimization). This method explores the search space by randomly sampling points, which can be effective for non-differentiable or discontinuous functions where gradient-based methods fail.

## Features

- **Stochastic Sampling**: Generates random samples within the search space.
- **Batch Processing**: The worker processes samples in batches and reports back to the UI.
- **Visual Feedback**: Real-time plotting of sampled points and the current best solution.
- **Benchmarking Functions**: Includes standard test functions like Rastrigin, Ackley, Schwefel, and Michalewicz.

## Usage

1.  Select a target function.
2.  Set the total number of samples (e.g., 1000).
3.  Set the batch size (e.g., 50) to control the update frequency.
4.  Click **Start Search**.
5.  Watch as the algorithm randomly explores the space and updates the best found minimum.

## Why Web Workers?

While Random Search is simple, evaluating thousands of complex functions and updating the DOM can freeze the UI. By running the sampling loop in a worker, the UI remains responsive, allowing for smooth visualization updates and user interaction (like stopping the search).
