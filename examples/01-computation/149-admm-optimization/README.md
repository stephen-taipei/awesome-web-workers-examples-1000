# ADMM Optimization (Lasso)

This example demonstrates the **Alternating Direction Method of Multipliers (ADMM)** algorithm for solving **Lasso Regression**.

## Problem Formulation

We solve the following optimization problem:

$$
\min_x \frac{1}{2} \|Ax - b\|_2^2 + \lambda \|x\|_1
$$

By introducing a new variable $z$, we can split the problem:

$$
\min_{x,z} \frac{1}{2} \|Ax - b\|_2^2 + \lambda \|z\|_1 \quad \text{s.t.} \quad x - z = 0
$$

## Algorithm (ADMM)

The Augmented Lagrangian is:
$$
L_\rho(x, z, u) = \frac{1}{2} \|Ax - b\|_2^2 + \lambda \|z\|_1 + \frac{\rho}{2} \|x - z + u\|_2^2
$$
where $u$ is the scaled dual variable.

The updates are:

1.  **x-update**: Ridge regression step (solved via linear system).
    $$x^{(k+1)} = (A^T A + \rho I)^{-1} (A^T b + \rho(z^{(k)} - u^{(k)}))$$

2.  **z-update**: Soft Thresholding.
    $$z^{(k+1)} = S_{\lambda/\rho}(x^{(k+1)} + u^{(k)})$$

3.  **u-update**: Dual variable update.
    $$u^{(k+1)} = u^{(k)} + x^{(k+1)} - z^{(k+1)}$$

## Features

-   **Parallel Computation**: Matrix inversion and ADMM iterations run in a Web Worker.
-   **Convergence Plots**: Visualizes the objective value and both primal ($||x-z||$) and dual ($||\rho(z - z_{old})||$) residuals to track convergence.
-   **Parameter Tuning**: Allows adjustment of $\rho$ (penalty parameter) which significantly affects convergence speed.

## Usage

1.  Open `index.html`.
2.  Adjust parameters ($N, D, \lambda, \rho$).
3.  Click **Start Optimization**.
4.  Watch the residuals decrease and weights align. Try changing $\rho$ to see how it affects stability and speed.
