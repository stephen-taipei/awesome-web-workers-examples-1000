# Example 982: Neural Network Training (Spiral)

This example demonstrates training a Neural Network from scratch in a Web Worker to solve a non-linear classification problem (Spiral Dataset).

## Description

The Spiral Dataset is a classic benchmark for neural networks because it cannot be separated linearly. It requires a model with hidden layers and non-linear activation functions (ReLU) to learn the decision boundary.
- **Worker Thread**:
    1. Generates 3-class spiral data.
    2. Implements a fully connected Neural Network (Input -> ReLU -> Linear -> Softmax).
    3. Trains the network using Backpropagation with either **SGD** or **Adam** optimization.
    4. Periodically computes the decision boundary heatmap over the entire input space.
- **Main Thread**: Renders the data points and the evolving decision boundary heatmap on a Canvas.

## Features

- **Framework-Free**: Implements Forward Pass, Backpropagation, Softmax Cross-Entropy Loss, and Optimizers (SGD, Adam) in pure JavaScript.
- **Interactive**: Change the Optimizer (SGD is bouncy/slow, Adam is fast/smooth), Learning Rate, and Batch Size.
- **Visual Feedback**: Real-time visualization of the decision boundary allows you to "see" the network learning.

## Usage

1. Open `index.html`.
2. Select "Optimizer" (Try Adam for best results).
3. Adjust "Learning Rate" (Too high = unstable, Too low = slow).
4. Click "Train Network".
5. Watch the background colors (decision boundary) wrap around the spiral arms as accuracy increases.
