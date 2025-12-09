# Example 997: Multi-Class Confusion Matrix

This example demonstrates efficient computation of a Confusion Matrix for a large-scale multi-class classification problem using a Web Worker.

## Description

A Confusion Matrix is a specific table layout that allows visualization of the performance of an algorithm. Each row of the matrix represents the instances in a predicted class while each column represents the instances in an actual class (or vice versa).
- **Worker Thread**: Generates synthetic ground truth and prediction data (simulating a model's output) and aggregates the counts into a flattened matrix.
- **Main Thread**: Renders an interactive heatmap using HTML5 Canvas based on the aggregated data.

## Features

- **High Performance**: Processes millions of simulated predictions in milliseconds.
- **Interactive Heatmap**: Visualizes the matrix with color intensity representing the density of predictions.
- **Tooltip Inspection**: Hover over cells to see exact counts and class mappings.
- **Configurable Parameters**: Adjust dataset size, number of classes, and simulated error rate.

## Usage

1. Open `index.html`.
2. Set "Dataset Size" (e.g., 1,000,000).
3. Set "Number of Classes" (e.g., 10 for digit classification simulation).
4. Adjust "Error Rate" to see how the heatmap changes (diagonal becomes less dominant as error increases).
5. Click "Generate & Compute".
