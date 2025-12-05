# Example 986: K-Means Clustering

This example demonstrates the K-Means clustering algorithm running in a Web Worker.

## Description

K-Means is an unsupervised learning algorithm that partitions data points into `K` clusters. It works iteratively to assign each data point to the nearest centroid and then updates the centroids based on the mean of the assigned points.
- **Worker Thread**:
    1. Generates synthetic 2D data blobs.
    2. Initializes centroids (Random or K-Means++).
    3. Iteratively performs the Assignment and Update steps.
    4. Sends the state to the main thread for visualization.
- **Main Thread**: Renders the points colored by cluster and the moving centroids on a Canvas.

## Features

- **Interactive Visualization**: Watch the algorithm converge step-by-step.
- **K-Means++ Initialization**: Smarter initialization strategy to improve convergence speed and quality.
- **Performance**: Handles thousands of points smoothly by offloading calculations.

## Usage

1. Open `index.html`.
2. Select "Data Points" and "Clusters (K)".
3. Choose "Initialization" method.
4. Click "Generate & Cluster".
5. Watch the centroids move to the center of the clusters.
