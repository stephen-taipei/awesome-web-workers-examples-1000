# Example 990: Principal Component Analysis (PCA)

This example demonstrates performing dimensionality reduction using Principal Component Analysis (PCA) in a Web Worker.

## Description

PCA is a statistical procedure that converts a set of observations of possibly correlated variables into a set of values of linearly uncorrelated variables called principal components. It is widely used for data visualization (reduction to 2D/3D) and noise reduction.
- **Worker Thread**:
    1. Generates synthetic high-dimensional data with correlations.
    2. Standardizes the data.
    3. Computes the Covariance Matrix.
    4. Solves for the top 2 Eigenvectors using the Power Iteration method with deflation.
    5. Projects the original data onto the new 2D subspace defined by Principal Component 1 and 2.
- **Main Thread**: Visualizes the projected data, revealing the clusters in 2D space.

## Features

- **Matrix Math**: Implements Covariance calculation and Eigen decomposition from scratch.
- **Scalable**: Can handle thousands of samples and dozens of dimensions efficiently.
- **Educational**: Shows the core steps of PCA without abstracting them behind a library.

## Usage

1. Open `index.html`.
2. Select "Sample Size" and "Input Dimensions".
3. Click "Run PCA".
4. See the calculated "Variance Explained" and the 2D scatter plot of the data.
