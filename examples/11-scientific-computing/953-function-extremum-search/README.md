# Example 953: Function Extremum Search (Gradient Descent)

This example demonstrates using **Gradient Descent** (or Ascent) to find the local minimum or maximum of a user-defined 2D function in a Web Worker.

## Description

Gradient descent is an optimization algorithm used to minimize some function by iteratively moving in the direction of steepest descent as defined by the negative of the gradient.
- **Worker Thread**:
    1. Parses the user's mathematical function $f(x,y)$.
    2. Generates a heatmap of the function values for context.
    3. Performs optimization steps using **Numerical Differentiation** to approximate the gradient $\nabla f$.
    4. Applies Momentum to the update rule to speed up convergence and escape shallow local traps.
- **Main Thread**: Renders the function landscape (Heatmap) and the path of the optimizer.

## Features

- **Numerical Gradient**: No need for symbolic derivatives; works on any smooth JS Math expression.
- **Interactive**: Input any function (e.g., `sin(x)*cos(y)`) and choose "Min" or "Max" search.
- **Momentum**: Includes a physics-based momentum term for more realistic and effective traversal.

## Usage

1. Open `index.html`.
2. Enter a function (or keep default).
3. Choose "Minimum" or "Maximum".
4. Click "Start Search". The optimizer will start from a random point.
5. Watch the white line trace the path to the nearest peak or valley (Yellow is high, Blue is low).

