# Grid Search (Web Worker Example #141)

This example demonstrates parameter search using the **Grid Search** method. The heavy lifting of evaluating the objective function at thousands of points is offloaded to a Web Worker, ensuring the UI remains responsive and updates progressively.

## Features

- **2D Grid Search**: Exhaustively evaluates a function over a defined 2D grid.
- **Heatmap Visualization**: Visualizes the function landscape and search results in real-time.
- **Progressive Updates**: The main thread receives data chunks from the worker and updates the heatmap row by row.
- **Customizable**: Users can select different test functions and adjust the grid resolution and range.

## How it works

1.  **Main Thread**: Collects user input (function, range, grid size) and spawns a Web Worker.
2.  **Worker**:
    -   Receives the configuration.
    -   Iterates through the grid points $(x, y)$.
    -   Evaluates the function $f(x, y)$.
    -   Sends batches of results back to the main thread.
    -   Tracks the global minimum found so far.
3.  **Main Thread**:
    -   Receives data chunks.
    -   Updates the internal data buffer.
    -   Redraws the heatmap on the canvas.
    -   Updates the "Best Solution" display.

## Functions Included

-   **Sphere**: Simple convex function.
-   **Rosenbrock**: Non-convex, valley-shaped (hard for gradient descent, easy for grid search if grid is fine enough).
-   **Himmelblau**: Multimodal function with 4 identical minima.
-   **Rastrigin**: Highly multimodal with many local minima.
-   **Ackley**: Many local minima with a deep global minimum.
