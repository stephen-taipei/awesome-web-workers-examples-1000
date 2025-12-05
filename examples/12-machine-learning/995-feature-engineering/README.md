# Example 995: Feature Engineering

This example demonstrates how to perform common feature engineering tasks (transformation, scaling, and generation) on large datasets using a Web Worker.

## Description

Feature engineering involves transforming raw data into features that better represent the underlying problem to predictive models. These operations often involve iterating over the entire dataset multiple times (e.g., for normalization or generating interaction terms).
- **Worker Thread**: Generates a random dataset, applies transformations like Logarithm, Polynomial feature generation (interaction terms), and scaling (Min-Max Normalization or Standardization).
- **Main Thread**: Controls the configuration and displays a preview of the processed data.

## Features

- **Polynomial Features**: Automatically generates interaction terms (e.g., `f1 * f2`) to capture non-linear relationships.
- **Scaling**: Supports Min-Max Normalization and Z-Score Standardization.
- **Log Transform**: Applies logarithmic transformation to handle skewed data.
- **Large Scale**: Handles operations on 1,000,000+ rows efficiently without freezing the UI.

## Usage

1. Open `index.html`.
2. Select "Dataset Size" and "Original Features" count.
3. Check the desired transformations (Normalize, Log, Poly, Standardize).
4. Click "Generate & Process".
5. View the processed data dimensions and a preview of the first 5 rows.
