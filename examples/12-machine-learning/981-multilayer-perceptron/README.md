# Example 981: MLP vs The XOR Problem

This example visualizes how a Multi-Layer Perceptron (MLP) learns to solve the XOR problem, a classic example of a non-linearly separable dataset.

## Description

A single perceptron (linear classifier) cannot solve XOR because no straight line can separate (0,0) and (1,1) from (0,1) and (1,0). An MLP with a hidden layer introduces non-linearity, warping the input space so a linear separation becomes possible in the hidden dimension.
- **Worker Thread**: Implements a simple MLP with one hidden layer. Trains using backpropagation on the 4 XOR data points.
- **Main Thread**: Renders the "decision boundary" as a heatmap, showing the network's prediction probability across the 2D input space.

## Features

- **From Scratch**: Backpropagation implemented manually for educational value.
- **Activation Functions**: Switch between Sigmoid, Tanh, and ReLU to see how they affect the decision boundary shape (ReLU creates piecewise linear boundaries).
- **Convergence Visualization**: Watch the heatmap evolve from random noise to a clean separation of the red and blue zones.

## Usage

1. Open `index.html`.
2. Adjust "Hidden Neurons" (More neurons = more complex boundaries possible).
3. Select "Activation Function".
4. Click "Train MLP".
5. Observe the heatmap. Ideally, (0,0) and (1,1) become red (0), while (0,1) and (1,0) become blue (1).
