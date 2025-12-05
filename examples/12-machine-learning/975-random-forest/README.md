# Example 975: Random Forest Classifier

This example demonstrates training a **Random Forest** classifier inside a Web Worker.

## Description

A Random Forest is an ensemble learning method that operates by constructing a multitude of Decision Trees during training. For classification tasks, the output of the Random Forest is the class selected by most trees (majority voting).
- **Worker Thread**:
    1. Generates synthetic cluster data.
    2. Builds `N` Decision Trees. Each tree is trained on a random subset of the data (Bootstrap Aggregation or Bagging).
    3. Generates a decision boundary heatmap by querying the forest.
- **Main Thread**: Visualizes the dataset and the resulting decision regions.

## Features

- **Ensemble Method**: Shows how combining simple trees creates complex, robust decision boundaries.
- **Parallel-ish Construction**: Simulates the building of multiple trees (in a real app, you could use multiple workers, one per tree).
- **Interactive**: Change the number of trees and max depth to see the effect on model complexity and overfitting.

## Usage

1. Open `index.html`.
2. Click "New Data" to get new random clusters.
3. Adjust "Number of Trees" and "Max Depth".
4. Click "Train Forest".
5. See the decision boundaries form. A single tree creates boxy boundaries; a forest creates smoother, more complex shapes.
