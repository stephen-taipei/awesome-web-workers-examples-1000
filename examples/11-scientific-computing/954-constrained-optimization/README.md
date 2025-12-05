# Example 954: Constrained Optimization (Penalty Method)

This example demonstrates solving a constrained optimization problem using the **Penalty Method** in a Web Worker.

## Description

Optimization seeks to minimize an objective function $f(x)$. Constrained optimization adds limits, e.g., $g(x) \le 0$.
- **Problem**: Minimize distance to $(2, 2)$ subject to being inside the unit circle (distance from origin $\le 1$).
- **Method**: The Penalty Method converts this into an unconstrained problem by adding a penalty term for violating the constraint: $P(x) = f(x) + \rho \cdot \max(0, g(x))^2$.
- **Worker Thread**:
    1. Starts from $(-2, -2)$.
    2. Performs Gradient Descent on the penalized function.
    3. Iteratively increases the penalty weight $\rho$ to force the solution towards the valid region boundary.
- **Main Thread**: Visualizes the path taken by the optimizer on the 2D plane.

## Features

- **Constraint Visualization**: Shows the unit circle (valid region) and the unconstrained minimum target.
- **Iterative Penalty**: Visualizes how the solver initially moves towards the target but gets "pushed back" to the boundary as the penalty weight increases.
- **Gradient Descent**: Manual calculation of gradients for the objective and penalty terms.

## Usage

1. Open `index.html`.
2. Adjust "Initial Penalty" and "Learning Rate".
3. Click "Start Optimization".
4. Watch the orange dot move towards the green target but stop at the circle's edge (the optimal constrained solution, roughly $(\frac{\sqrt{2}}{2}, \frac{\sqrt{2}}{2})$).
