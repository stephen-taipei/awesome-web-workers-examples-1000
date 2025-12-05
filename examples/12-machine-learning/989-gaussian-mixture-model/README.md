# Example 989: Gaussian Mixture Models (GMM)

This example demonstrates the Expectation-Maximization (EM) algorithm for training Gaussian Mixture Models inside a Web Worker.

## Description

Gaussian Mixture Models are a probabilistic clustering method. Unlike K-Means, which assigns points to hard clusters, GMM assumes all data points are generated from a mixture of a finite number of Gaussian distributions with unknown parameters.
- **Worker Thread**:
    1. Generates synthetic data (random clusters).
    2. Runs the **E-Step**: Calculates the probability (responsibility) that each point belongs to each Gaussian.
    3. Runs the **M-Step**: Updates the parameters (Mean, Covariance, Weight) of each Gaussian to maximize likelihood.
    4. Repeats until convergence.
- **Main Thread**: Visualizes the data points (colored by most likely cluster) and draws ellipses representing the learned Gaussian distributions (mean and covariance).

## Features

- **Probabilistic Clustering**: Visualizes "soft" clustering where ellipses adjust their shape (covariance) to fit the data spread.
- **EM Algorithm**: Complete implementation of Expectation-Maximization for bivariate Gaussians.
- **Covariance Visualization**: Draws rotated ellipses corresponding to the full covariance matrix of each cluster.
- **Interactive**: Adjust number of clusters (K) and training speed.

## Usage

1. Open `index.html`.
2. Select "Number of Gaussians (K)".
3. Adjust "Training Speed" (Slow allows you to see the algorithm learning).
4. Click "Generate Data & Train".
5. Watch the ellipses move, resize, and rotate to fit the data points.
