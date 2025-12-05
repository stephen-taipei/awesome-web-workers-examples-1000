# Example 976: Gradient Boosting Regressor

This example demonstrates the **Gradient Boosting** machine learning technique running in a Web Worker.

## Description

Gradient Boosting builds an additive model in a forward stage-wise fashion; it allows for the optimization of arbitrary differentiable loss functions. In each stage, a regression tree (here, a simple Decision Stump) is fit on the negative gradient of the given loss function (the residuals).
- **Worker Thread**:
    1. Generates a non-linear dataset (Sine wave with noise).
    2. Initializes the model with the mean value.
    3. Iteratively calculates residuals (errors).
    4. Fits a Decision Stump to predict these residuals.
    5. Updates the ensemble model with the new tree scaled by the Learning Rate.
- **Main Thread**: Visualizes the data and the model's prediction line as it evolves from a flat line (mean) to a curve fitting the data.

## Features

- **Ensemble Learning**: Visualizes how combining many weak learners creates a strong learner.
- **Step-by-Step Animation**: Watch the regression line "bend" to fit the data points.
- **Parameters**: Experiment with Learning Rate (shrinkage) and Number of Estimators (trees) to observe overfitting or underfitting.

## Usage

1. Open `index.html`.
2. Set "Number of Estimators".
3. Set "Learning Rate". Small values require more trees but generalize better.
4. Click "Generate & Train".
5. Observe the orange line iteratively fitting the grey data points.
