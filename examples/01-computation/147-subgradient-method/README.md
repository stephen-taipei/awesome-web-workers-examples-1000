# Subgradient Method Example

This example demonstrates the Subgradient Method using Web Workers.

## Description

The Subgradient Method is an iterative algorithm for minimizing a convex function that is not necessarily differentiable. It is a generalization of Gradient Descent. When the function is differentiable, the subgradient is unique and is simply the gradient. At points where the function is non-differentiable (kinks), the subgradient can be any vector in the subdifferential set.

## Features

-   **Non-Smooth Optimization**: Handles functions like absolute value sum and hinge loss.
-   **Step Size Rules**:
    -   Constant: Converges to a neighborhood of the optimum.
    -   Square Root Decay ($a / \sqrt{k}$): Converges to the optimum.
    -   Linear Decay ($a / k$): Converges to the optimum.
-   **Best Value Tracking**: Since the method is not a descent method (function value can increase), the algorithm tracks the best point found so far.

## Technical Details

-   **Web Worker**: Runs the optimization loop.
-   **Subgradients**: Implemented manually for each test function.
-   **Step Normalization**: Uses normalized subgradient steps ($x_{k+1} = x_k - \alpha_k \frac{g_k}{||g_k||}$) for more predictable step lengths.

## Parameters

-   **Objective Function**: Absolute Value, Hinge Loss, Max Component, L1 Regularized.
-   **Step Size Rule**: Decay strategy for the step size.
-   **Step Parameter**: Initial scale factor for the step size.
-   **Initial Point**: Starting coordinate.
-   **Max Iterations**: Loop limit.
