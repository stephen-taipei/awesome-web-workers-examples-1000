# Example 978: K-Nearest Neighbors (KNN)

This example demonstrates the **K-Nearest Neighbors** classification algorithm running in a Web Worker to generate a decision boundary map.

## Description

KNN is a simple, lazy learning algorithm. It classifies a new data point based on the majority class of its 'K' nearest neighbors in the training set.
- **Worker Thread**: Generates a pixel-wise classification map. For every single pixel on the canvas, it calculates the distance to all training points, finds the nearest `K`, and assigns the pixel the color of the majority class.
- **Main Thread**: Renders the resulting classification map and the training points.

## Features

- **Decision Boundary Visualization**: Clearly shows how the value of `K` affects the smoothness of the decision boundary (Small K = noisy/overfit, Large K = smooth/underfit).
- **Heavy Computation**: Calculating distances for 250,000+ pixels against 50-100 training points represents millions of operations offloaded to the worker.
- **Interactive**: Change `K` and generate new random datasets to explore different scenarios.

## Usage

1. Open `index.html`.
2. Click "New Random Data" to generate points for 3 classes.
3. Adjust "K Neighbors" slider.
4. Click "Compute Decision Map".
5. The canvas will fill with colors representing the regions belonging to each class.
