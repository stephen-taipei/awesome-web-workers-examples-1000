# Bayesian Optimization (Web Worker Example #143)

This example demonstrates **Bayesian Optimization**, an advanced global optimization strategy for black-box functions. It uses a **Gaussian Process (GP)** surrogate model to approximate the objective function and an **Expected Improvement (EI)** acquisition function to intelligently select the next sampling point.

## Features

- **Gaussian Process Regression**: Implements a simple 1D Gaussian Process with an RBF kernel in pure JavaScript.
- **Acquisition Function**: Uses Expected Improvement (EI) to balance exploration (sampling high uncertainty areas) and exploitation (refining known good areas).
- **Interactive Visualization**: Plots the true function, the GP's mean prediction, the 95% confidence interval, collected samples, and the acquisition function.
- **Step-by-Step Execution**: Allows users to step through the optimization process or run it automatically.

## How it works

1.  **Initialization**: Randomly samples a few initial points.
2.  **GP Fitting**: Fits a Gaussian Process to the observed data $(X, Y)$, producing a mean $\mu(x)$ and variance $\sigma^2(x)$.
3.  **Acquisition**: Calculates the Expected Improvement $EI(x)$ across the search space.
4.  **Selection**: Selects the point $x_{next}$ that maximizes $EI(x)$.
5.  **Evaluation**: Evaluates the expensive objective function $f(x_{next})$.
6.  **Update**: Adds the new point to the dataset and refits the GP model.
7.  **Repeat**: Continues until convergence or max iterations.

## Implementation Details

-   **Worker**: Handles the GP matrix operations (Cholesky decomposition, inversion) and the optimization logic.
-   **Canvas**: Visualizes the complex probabilistic state, showing the model's uncertainty decreasing as more points are sampled.

## Functions

-   **x * sin(x)**: Simple multimodal function.
-   **Gramacy & Lee**: A standard 1D test function with varying smoothness.
-   **Forrester**: A function with one global minimum and one local minimum, commonly used for testing BO.
