# Nelder-Mead Method Example

This example demonstrates the Nelder-Mead method (also known as the Simplex method or Amoeba method) using Web Workers.

## Description

The Nelder-Mead method is a numerical method used to find the minimum or maximum of an objective function in a multidimensional space. It is a direct search method (based on function comparison) and is often applied to nonlinear optimization problems for which derivatives may not be known.

## Features

-   **Optimization without derivatives**: Suitable for non-smooth or noisy functions.
-   **Configurable coefficients**:
    -   Reflection ($\alpha$)
    -   Expansion ($\gamma$)
    -   Contraction ($\rho$)
    -   Shrink ($\sigma$)
-   **Visualization**: Convergence plots and optimization path summary.
-   **Test Functions**: Includes Rosenbrock, Himmelblau, Rastrigin, Sphere, and Ackley functions.

## Technical Details

-   **Web Worker**: The optimization algorithm runs in a separate thread to prevent UI blocking during intensive calculations.
-   **Algorithm**: Implements the standard Nelder-Mead algorithm with reflection, expansion, contraction, and shrink operations.
-   **Performance**: Capable of solving standard 2D benchmark problems efficiently.

## Parameters

-   **Objective Function**: Select from standard test functions.
-   **Coefficients**: Tune the behavior of the simplex transformations.
-   **Initial Point**: Starting coordinate for the initial simplex generation.
-   **Max Iterations**: Limit the number of steps to prevent infinite loops.
-   **Tolerance**: Convergence criterion based on function value difference.
