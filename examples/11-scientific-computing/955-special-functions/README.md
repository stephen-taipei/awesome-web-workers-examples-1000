# Example 955: Special Functions Calculator

This example calculates and plots high-precision approximations of mathematical **Special Functions** using a Web Worker.

## Description

Special functions like Gamma $\Gamma(z)$ and Beta $B(x,y)$ do not have simple closed-form expressions using elementary functions. They require numerical approximation methods (e.g., Lanczos approximation).
- **Worker Thread**:
    1. Implements the **Lanczos Approximation** to compute $\Gamma(x)$ for real numbers.
    2. Implements the **Beta Function** using the Gamma relationship.
    3. Implements the **Error Function (erf)** using a polynomial approximation.
    4. Iterates over the user-defined range to generate plot points.
- **Main Thread**: Renders the function graph on a Canvas, handling auto-scaling and singularity visualization.

## Features

- **Gamma Function**: Visualizes the factorial extension to real numbers, including singularities at negative integers (via Reflection Formula).
- **Beta Function**: Visualizes the relationship between two variables.
- **Error Function**: Essential in probability and statistics (Normal distribution CDF).
- **Robust Plotting**: Handles infinite values and discontinuities gracefully.

## Usage

1. Open `index.html`.
2. Select a function (e.g., "Gamma").
3. Set the Range X (e.g., -5 to 5 to see singularities).
4. Click "Calculate & Plot".
5. Change function to "Beta" and try changing "Parameter Y".
