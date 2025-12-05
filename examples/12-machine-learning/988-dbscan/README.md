# Example 988: DBSCAN Clustering

This example implements the **DBSCAN** (Density-Based Spatial Clustering of Applications with Noise) algorithm in a Web Worker.

## Description

DBSCAN groups together points that are closely packed together (points with many nearby neighbors), marking as outliers points that lie alone in low-density regions. Unlike K-Means, it does not require specifying the number of clusters beforehand and can find arbitrarily shaped clusters (e.g., concentric circles, moons).
- **Worker Thread**: Generates synthetic datasets (blobs, moons, circles) and runs the DBSCAN algorithm using a simple region query approach.
- **Main Thread**: Visualizes the resulting clusters and noise points on an HTML5 Canvas.

## Features

- **Density-Based**: Identifies clusters of varying shapes and sizes.
- **Noise Handling**: Automatically detects and marks outliers (shown in grey).
- **Configurable Parameters**:
    - `Epsilon`: The radius of neighborhood around a point.
    - `MinPts`: The minimum number of points required to form a dense region (core point).
- **Dataset Generators**: Includes standard test shapes like "Moons" and "Concentric Circles" which are difficult for centroid-based algorithms (like K-Means).

## Usage

1. Open `index.html`.
2. Select a "Dataset Shape" (e.g., Moons or Circles).
3. Adjust `Epsilon` (Radius) and `MinPts`.
    - *Tip*: For "Circles", try increasing Epsilon slightly if rings are broken.
4. Click "Generate & Cluster".
5. Observe how the algorithm effectively separates the shapes and isolates noise.
