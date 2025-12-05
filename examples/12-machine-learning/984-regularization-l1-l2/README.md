# Example 984: Regularization (L1/L2)

This example demonstrates the effect of Regularization (L1/Lasso and L2/Ridge) on Polynomial Regression using a Web Worker.

## Description

When fitting a high-degree polynomial to a small dataset, the model often "overfits," creating wild oscillations to pass through every noisy data point. Regularization adds a penalty term to the loss function to discourage large weights, resulting in simpler, smoother models.
- **Worker Thread**: Fits a polynomial curve to noisy data using Gradient Descent. It computes gradients for the Mean Squared Error (MSE) and adds the appropriate regularization gradients (L1 or L2).
- **Main Thread**: Visualizes the data points and the fitted curve in real-time.

## Features

- **Polynomial Regression**: Fits non-linear curves to data.
- **Regularization Controls**:
    - **None**: See overfitting with high-degree polynomials.
    - **L2 (Ridge)**: Penalizes sum of squared weights (smooths curve).
    - **L1 (Lasso)**: Penalizes sum of absolute weights (encourages sparsity).
- **Interactive**: Adjust the polynomial degree, regularization strength ($\lambda$), and learning rate.

## Usage

1. Open `index.html`.
2. Set a high "Polynomial Degree" (e.g., 10 or 12) to encourage overfitting.
3. Set "Regularization Type" to "None". Click "Train Model" and observe the wiggle.
4. Stop, switch to "L2", increase "Regularization Strength", and Train again. Observe the smoother curve.
