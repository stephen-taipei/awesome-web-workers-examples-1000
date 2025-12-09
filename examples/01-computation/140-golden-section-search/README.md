# Golden Section Search (Web Worker Example #140)

This example demonstrates how to use the **Golden Section Search** algorithm to find the minimum of a unimodal function within a specified interval. The computation is performed in a background Web Worker to keep the UI responsive.

## Features

- **1D Optimization**: Finds the minimum of a single-variable function $f(x)$.
- **Interactive Visualization**: Plots the function and visualizes the search interval narrowing down.
- **Custom Functions**: Allows users to input custom JavaScript mathematical expressions.
- **Web Worker**: Offloads the iterative search process to a separate thread.
- **Real-time Feedback**: Updates the progress bar and visualization as the algorithm converges.

## Algorithm

The Golden Section Search is a technique for finding the extremum (minimum or maximum) of a strictly unimodal function by successively narrowing the range of values inside which the extremum is known to exist.

1.  Start with an interval $[a, b]$.
2.  Choose two internal points $c$ and $d$ based on the golden ratio $\phi \approx 1.618$.
    -   $c = b - (b - a) / \phi$
    -   $d = a + (b - a) / \phi$
3.  Evaluate $f(c)$ and $f(d)$.
4.  If $f(c) < f(d)$ (for finding minimum), the new interval is $[a, d]$.
5.  If $f(c) > f(d)$, the new interval is $[c, b]$.
6.  Repeat until the interval width $b - a$ is less than the specified tolerance.

## Usage

1.  Select a predefined function or enter a custom one (e.g., `Math.pow(x-2, 2)`).
2.  Set the search interval $[a, b]$.
3.  Set the tolerance (e.g., `0.000001`).
4.  Click **Find Minimum**.
5.  Observe the visualization and the results table.
