# Example 972: Polynomial Regression Fitting

This example demonstrates **Polynomial Regression** using Gradient Descent in a Web Worker.

## Description

Polynomial Regression is a form of regression analysis in which the relationship between the independent variable $x$ and the dependent variable $y$ is modeled as an $n$-th degree polynomial.
- **Worker Thread**:
    1. Generates a non-linear dataset ($y = \sin(x) + \dots$).
    2. Expands the input feature $x$ into polynomial features $[1, x, x^2, \dots, x^d]$.
    3. Trains the weights using Gradient Descent to minimize Mean Squared Error (MSE).
- **Main Thread**: Renders the data points and the best-fit curve as it updates.

## Features

- **Feature Expansion**: Shows how a linear model (Linear Regression) can fit non-linear data by transforming features.
- **Gradient Descent**: Visualizes the optimization process.
- **Degree Control**: Adjust the degree to see the difference between Underfitting (Degree 1: Straight line) and Good Fitting (Degree 3-5).

## Usage

1. Open `index.html`.
2. Click "New Non-Linear Data".
3. Set "Polynomial Degree" (Try 1, then 3, then 8).
4. Click "Fit Curve".
5. Watch the orange line bend to fit the data points.
