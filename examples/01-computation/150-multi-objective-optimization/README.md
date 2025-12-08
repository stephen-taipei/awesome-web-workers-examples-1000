# Multi-objective Optimization (NSGA-II)

This example demonstrates the **NSGA-II (Non-dominated Sorting Genetic Algorithm II)**, a popular evolutionary algorithm for multi-objective optimization.

## Problem Description

Multi-objective optimization involves optimizing multiple conflicting objectives simultaneously. Instead of a single optimal solution, there is a set of trade-off solutions known as the **Pareto Optimal Front**.

This example uses the standard ZDT test suite:

1.  **ZDT1**: Convex Pareto front.
2.  **ZDT2**: Concave Pareto front.
3.  **ZDT3**: Discontinuous Pareto front.

Minimizing both objectives: $f_1(x)$ and $f_2(x)$.

## Algorithm (NSGA-II)

Key components implemented:

1.  **Fast Non-dominated Sorting**: Ranks individuals based on domination levels.
2.  **Crowding Distance**: Maintains diversity in the population.
3.  **Tournament Selection**: Selects parents based on rank and crowding distance.
4.  **Simulated Binary Crossover (SBX)**: Recombines genes.
5.  **Polynomial Mutation**: Introduces random variations.

## Features

-   **Evolutionary Computation**: Runs an entire genetic algorithm in a Web Worker.
-   **Visualization**: Plots the evolving population in the objective space ($f_1$ vs $f_2$) against the true analytical Pareto front.
-   **Interactive**: Allows changing problems (ZDT1-3) and GA parameters (Population size, mutation rate, etc.).

## Usage

1.  Open `index.html`.
2.  Select a problem (e.g., ZDT1 for convex, ZDT3 for discontinuous).
3.  Adjust population size or generations if needed.
4.  Click **Start Optimization**.
5.  Observe the purple dots (population) converging towards the red line (true Pareto front).
