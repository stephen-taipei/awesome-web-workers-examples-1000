# Example 987: Hierarchical Clustering (Agglomerative)

This example visualizes the process of Agglomerative Hierarchical Clustering in a Web Worker.

## Description

Hierarchical Clustering builds a hierarchy of clusters. The "Agglomerative" (bottom-up) strategy starts by treating each data point as a single cluster. It then iteratively merges the two clusters that are closest to each other until a stopping criterion (number of clusters) is met.
- **Worker Thread**:
    1. Generates synthetic 2D data points.
    2. Iteratively calculates the distance between all pairs of clusters based on the selected Linkage Criteria.
    3. Merges the closest pair.
    4. Reports the current state to the main thread for animation.
- **Main Thread**: Renders the points on a Canvas, coloring them according to their group assignment at each step.

## Features

- **Step-by-Step Animation**: Watch the clusters merge in real-time.
- **Linkage Criteria**:
    - **Single Linkage**: Distance between closest points. (Produces chain-like clusters)
    - **Complete Linkage**: Distance between furthest points. (Produces compact clusters)
    - **Average Linkage**: Average distance between all pairs.
    - **Centroid Linkage**: Distance between cluster centroids.
- **Interactive Control**: Adjust the number of points, target clusters, and animation speed.

## Usage

1. Open `index.html`.
2. Select "Linkage Criteria" (e.g., Single or Complete) to see different clustering behaviors.
3. Set "Target Clusters" (when to stop merging).
4. Click "Generate & Cluster".
5. The animation will show points changing color as they merge into larger groups.
