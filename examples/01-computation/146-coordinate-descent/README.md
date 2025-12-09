# Coordinate Descent Example

This example demonstrates the Coordinate Descent algorithm using Web Workers.

## Description

Coordinate Descent is an optimization algorithm that successively minimizes along coordinate directions to find the minimum of a function. At each iteration, the algorithm determines a coordinate or coordinate block and minimizes over the corresponding hyperplane while fixing the other coordinates.

## Features

-   **Update Rules**:
    -   **Cyclic**: Iterates through coordinates $x_1, x_2, ..., x_n$ in order.
    -   **Randomized**: Randomly selects a coordinate to update.
    -   **Greedy**: Selects the coordinate that gives the largest descent (more computationally expensive).
-   **Visualization**: Shows the characteristic "staircase" path of coordinate descent.

## Technical Details

-   **Line Search**: Uses Golden Section Search to find the minimum along the selected coordinate axis.
-   **Performance**: Effective for separable functions or problems where coordinate updates are cheap.

## Parameters

-   **Objective Function**: Quadratic, Rosenbrock, Rastrigin, Lasso-like.
-   **Optimization Type**: Cyclic, Random, Greedy.
-   **Initial Point**: Starting coordinates.
-   **Max Iterations**: Loop limit.
-   **Step Size / Tolerance**: Precision for the 1D search and convergence.
