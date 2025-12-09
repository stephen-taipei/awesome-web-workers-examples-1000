# Example 952: Non-Linear Curve Fitting (Levenberg-Marquardt)

This example implements the **Levenberg-Marquardt (LM)** algorithm in a Web Worker to fit a non-linear model to noisy data.

## Description

Non-linear least squares problems arise when fitting data to a model that is non-linear in its parameters (e.g., exponentials, power laws). The LM algorithm interpolates between the Gauss-Newton algorithm (fast convergence) and Gradient Descent (robustness).
- **Worker Thread**:
    1. Computes the Jacobian matrix (partial derivatives) of the model function.
    2. Solves the linearized system $(J^T J + \lambda I)\delta = J^T r$ to find the parameter update step.
    3. Adjusts the damping parameter $\lambda$ based on whether the Residual Sum of Squares (RSS) improves.
- **Main Thread**: Displays the data points, the "True" generating curve, and the iterative "Fitted" curve as it converges.

## Features

- **Robust Solver**: Implements LM with adaptive damping from scratch.
- **Matrix Math**: Includes a Gaussian Elimination solver for linear systems.
- **Visualization**: Watch the red curve snap into place over the grey data points.

## Usage

1. Open `index.html`.
2. Adjust "True a, b, c" to define the shape of the underlying exponential decay curve.
3. Click "Generate Data & Fit".
4. The worker will start with a poor guess (e.g., linear) and iteratively bend the curve to fit the noisy dots.
