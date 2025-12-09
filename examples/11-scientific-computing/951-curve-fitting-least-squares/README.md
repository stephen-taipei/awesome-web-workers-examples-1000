# Example 951: Least Squares Curve Fitting

This example demonstrates the **Least Squares** method for curve fitting using the **Normal Equation** in a Web Worker.

## Description

Unlike iterative Gradient Descent, the Normal Equation provides an analytical, direct solution to the linear least squares problem by solving a system of linear equations ($X^T X w = X^T y$).
- **Worker Thread**:
    1. Constructs the Vandermonde matrix (powers of x) from the data.
    2. Computes the Gram matrix $A = X^T X$ and vector $b = X^T y$.
    3. Solves the linear system $Aw = b$ using **Gaussian Elimination**.
    4. Calculates $R^2$ score to evaluate fit quality.
- **Main Thread**: Renders the noisy data points and the resulting best-fit polynomial curve.

## Features

- **Exact Solution**: Demonstrates solving matrix equations directly.
- **Polynomial Fitting**: Fits curves of arbitrary degree (linear, quadratic, cubic, etc.).
- **Performance**: Matrix operations are $O(N \cdot D^2 + D^3)$ where $D$ is degree. Fast for small degrees even with many points.

## Usage

1. Open `index.html`.
2. Click "New Data" to generate a sine-like wave with noise.
3. Adjust "Polynomial Degree" (e.g., 3 for cubic, 9 for complex wiggle).
4. Click "Fit Curve".
5. The red line represents the mathematically optimal polynomial for the given degree minimizing squared error.
