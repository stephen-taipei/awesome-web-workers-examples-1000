# Example 998: ROC Curve Calculation

This example calculates the Receiver Operating Characteristic (ROC) curve and the Area Under the Curve (AUC) for a large dataset using a Web Worker.

## Description

Evaluating binary classification models often requires calculating ROC and AUC. For large test sets (e.g., millions of predictions), sorting the predictions and iterating through them to compute TPR/FPR values at every threshold is computationally intensive.
- **Web Worker**: Generates synthetic prediction data, sorts it, and computes the curve metrics.
- **Main Thread**: Renders the curve on a Canvas element.

## Features

- **Large Dataset Support**: Can handle 1,000,000+ data points smoothly.
- **Synthetic Data Generation**: Simulates model predictions with configurable noise levels.
- **Metric Calculation**: Computes accurate AUC values.
- **Visualization**: Plots the ROC curve in real-time after calculation.

## Usage

1. Open `index.html`.
2. Select a sample size (e.g., 1,000,000).
3. Adjust noise (0.1 for good model, 0.9 for bad model).
4. Click "Generate & Calculate".
5. The worker will process the data and return the AUC and curve points for rendering.
