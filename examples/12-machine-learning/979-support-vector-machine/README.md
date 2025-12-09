# Example 979: Support Vector Machine (SMO)

This example demonstrates training a Support Vector Machine (SVM) using the Sequential Minimal Optimization (SMO) algorithm in a Web Worker.

## Description

SVMs find the optimal hyperplane that separates two classes with the maximum margin. Non-linear separation is achieved using the Kernel Trick (e.g., RBF Kernel).
- **Worker Thread**: Implements the SMO algorithm to solve the quadratic programming problem for SVM training. It adjusts the lagrange multipliers ($\alpha$) to find the support vectors.
- **Main Thread**: Generates synthetic non-linear data (concentric circles) and visualizes the decision boundary heatmap.

## Features

- **SMO Algorithm**: A simplified version of John Platt's SMO for training SVMs without a heavy QP solver library.
- **Kernels**: Supports **Linear** and **RBF (Gaussian)** kernels.
- **Interactive**: Adjust Regularization ($C$) and RBF Sigma ($\sigma$) to see how the boundary changes (overfitting vs underfitting).

## Usage

1. Open `index.html`.
2. Click "New Data" to generate a circle-in-ring dataset.
3. Select "RBF" kernel (Linear won't work well for this data).
4. Click "Train SVM".
5. The worker will compute the optimal boundary, and the canvas will display the classification regions (Red vs Blue).
