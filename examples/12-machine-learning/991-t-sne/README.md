# Example 991: t-SNE Visualization

This example implements a simplified version of the t-Distributed Stochastic Neighbor Embedding (t-SNE) algorithm in a Web Worker to visualize high-dimensional data in 2D.

## Description

t-SNE is a powerful dimensionality reduction technique well-suited for embedding high-dimensional data for visualization in a low-dimensional space of two or three dimensions. The algorithm calculates probability distributions in high-dimensional space and iteratively optimizes a low-dimensional representation to match these distributions.
- **Worker Thread**:
    1. Generates synthetic high-dimensional data (e.g., 10 dimensions) with distinct clusters.
    2. Computes pairwise affinities (P-values).
    3. Runs the gradient descent loop to minimize the Kullback-Leibler divergence between the high-dimensional and low-dimensional distributions.
- **Main Thread**: Receives the updated coordinates of the points at every few iterations and renders them on a Canvas.

## Features

- **Iterative Visualization**: Watch the clusters form and separate in real-time.
- **Computationally Intensive**: The $O(N^2)$ complexity of pairwise computations makes this a perfect candidate for Web Workers.
- **Configurable**: Adjust Perplexity, Iterations, and Learning Rate.

## Usage

1. Open `index.html`.
2. Select number of "Data Points".
3. Click "Initialize & Run".
4. Observe the chaotic initial state slowly organize into distinct, colored clusters as the worker optimizes the embedding.
