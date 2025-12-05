# Example 980: Single Layer Perceptron

This example demonstrates the training of a **Perceptron**, the fundamental building block of neural networks, using a Web Worker.

## Description

The Perceptron is a binary linear classifier. It maps its input $x$ to an output value $f(x)$ (a single binary value) using weights $w$ and bias $b$.
- **Worker Thread**:
    1. Generates a linearly separable dataset (points on two sides of a random line).
    2. Initializes random weights.
    3. Runs the Perceptron Learning Algorithm loop:
       - For each data point, predict class.
       - If wrong, update weights: $w \leftarrow w + \eta(t - y)x$.
- **Main Thread**: Visualizes the data points and draws the decision boundary line as it updates in real-time.

## Features

- **Linearly Separable Data Generator**: Ensures the problem is solvable by a linear classifier.
- **Perceptron Learning Algorithm**: Implements the classic online update rule.
- **Visualization**: Shows the decision boundary moving to separate the two classes (Red vs Blue).

## Usage

1. Open `index.html`.
2. Click "New Random Data" to generate a fresh problem.
3. Adjust "Learning Rate" (Large steps vs small precision).
4. Click "Train Perceptron".
5. Watch the line snap into place to separate the red and blue dots.
