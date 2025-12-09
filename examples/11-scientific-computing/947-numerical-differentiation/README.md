# Example 947: Numerical Differentiation

This example demonstrates calculating the derivative of a function numerically using Finite Difference methods in a Web Worker.

## Description

Numerical differentiation estimates the derivative (rate of change) of a function using values of the function at specific points.
- **Worker Thread**:
    1. Evaluates the selected function $f(x)$ over a range.
    2. Computes the approximate derivative $f'(x)$ using:
        - **Forward Difference**: $\frac{f(x+h)-f(x)}{h}$
        - **Backward Difference**: $\frac{f(x)-f(x-h)}{h}$
        - **Central Difference**: $\frac{f(x+h)-f(x-h)}{2h}$
- **Main Thread**: Plots the original function (Blue) and its computed derivative (Orange).

## Features

- **Visual Verification**: See that the derivative of $\sin(x)$ is $\cos(x)$ (shifted phase), or the derivative of a Gaussian is the Hermite function.
- **Method Comparison**: Change "Method" to see slight shifts or errors. Central difference is generally most accurate.
- **Step Size Analysis**: Change $h$ to see how too large a step loses accuracy, or too small introduces floating point noise (catastrophic cancellation).

## Usage

1. Open `index.html`.
2. Select a function (e.g., `sin(x)`).
3. Select "Central Difference".
4. Click "Compute & Plot".
5. Observe the derivative curve.
