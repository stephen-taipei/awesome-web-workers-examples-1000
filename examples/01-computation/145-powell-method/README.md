# Powell's Method Example

This example demonstrates Powell's method (Conjugate Direction Method) using Web Workers.

## Description

Powell's method is an algorithm for finding a local minimum of a function without using derivatives. It works by performing sequential one-dimensional minimizations (line searches) along a set of directions. These directions are updated at each iteration to form a set of "conjugate" directions, which speeds up convergence for quadratic-like functions.

## Features

-   **Derivative-free**: Uses only function values.
-   **Conjugate Directions**: Efficiently navigates valleys and ridges.
-   **Line Search**: Implements a Golden Section search for 1D minimization.

## Technical Details

-   **Web Worker**: Runs the optimization loop.
-   **Line Search**: Uses Golden Section Search within a bracket.
-   **Direction Update**: Replaces the direction of largest decrease with the new displacement vector.

## Parameters

-   **Objective Function**: Rosenbrock, Himmelblau, etc.
-   **Line Search Tolerance**: Precision for the 1D search.
-   **Initial Point**: Starting coordinate.
-   **Max Iterations**: Loop limit.
-   **Global Tolerance**: Stopping criterion for the main loop.
