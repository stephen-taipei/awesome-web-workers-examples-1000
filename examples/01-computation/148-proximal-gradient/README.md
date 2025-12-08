# Proximal Gradient Descent (Lasso Regression)

This example demonstrates the **Proximal Gradient Descent** algorithm (specifically ISTA - Iterative Shrinkage-Thresholding Algorithm) for solving **Lasso Regression** (L1-regularized Least Squares) problems.

## Problem Formulation

We solve the following optimization problem:

$$
\min_w \frac{1}{2N} \|Xw - y\|_2^2 + \lambda \|w\|_1
$$

Where:
- $X$ is the input data matrix ($N \times D$).
- $y$ is the target vector ($N \times 1$).
- $w$ is the weight vector ($D \times 1$).
- $\lambda$ is the regularization parameter controlling sparsity.

## Algorithm (ISTA)

The update rule consists of a gradient descent step on the smooth part (Least Squares) followed by the **Proximal Operator** of the L1 norm (Soft Thresholding).

1.  **Gradient Step**:
    $$z^{(k)} = w^{(k)} - \eta \nabla f(w^{(k)})$$
    where $\nabla f(w) = \frac{1}{N} X^T (Xw - y)$ and $\eta$ is the learning rate.

2.  **Proximal Step (Soft Thresholding)**:
    $$w^{(k+1)}_i = \text{sign}(z^{(k)}_i) \max(|z^{(k)}_i| - \lambda \eta, 0)$$

## Features

-   **Data Generation**: Generates synthetic sparse data to test the algorithm's ability to recover true weights.
-   **Web Worker**: Runs the iterative optimization loop in a background thread to keep the UI responsive.
-   **Visualization**: Real-time plotting of the loss function and weight recovery (True vs Estimated weights).

## Usage

1.  Open `index.html` in a browser.
2.  Adjust parameters:
    -   **N**: Number of samples.
    -   **D**: Number of features.
    -   **Sparsity**: Percentage of non-zero weights in the ground truth.
    -   **Lambda**: L1 regularization strength.
    -   **Learning Rate**: Step size for gradient descent.
    -   **Iterations**: Number of update steps.
3.  Click **Start Optimization**.
4.  Observe the loss curve decreasing and the green bars (estimated weights) aligning with the gray bars (true weights).
