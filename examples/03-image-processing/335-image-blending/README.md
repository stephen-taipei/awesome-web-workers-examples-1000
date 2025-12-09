# Image Blending (Web Worker Example #335)

Demonstrates Poisson Image Blending using a numerical solver in a Web Worker.

## How it works

1.  **Poisson Equation**: The goal is to copy a source image region into a target image such that the *gradients* (texture/details) of the source are preserved, but the pixel values are adjusted to match the boundary of the target image smoothly.
    *   Mathematically, we solve for pixel values $f$ such that $\Delta f = \Delta g$ over the region $\Omega$, with $f = f^*$ on the boundary $\partial \Omega$.
    *   $g$ is the source image, $f^*$ is the target image.

2.  **Numerical Solution**:
    *   The worker implements an iterative **Jacobi method** to solve the discrete Poisson equation.
    *   At each iteration, a pixel's new value is calculated as the average of its neighbors plus the Laplacian (divergence of gradient) of the source image at that point.
    *   Boundary pixels are fixed to the values of the target image.

## Key Features

*   **Seamless Integration**: The source image changes color/lighting to match the target background.
*   **Iterative Solver**: The worker runs multiple iterations (e.g., 100) and updates the UI progressively.
*   **Comparison**: A "Naive Paste" button allows you to see the difference between simple copy-paste and Poisson blending.

## Notes

*   Poisson blending works best when the texture of the source is compatible with the target, but the colors/lighting are different.
*   Convergence speed depends on the size of the region.
