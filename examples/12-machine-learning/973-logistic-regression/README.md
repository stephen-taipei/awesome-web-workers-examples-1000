# Example 973: Logistic Regression Classifier

This example demonstrates training a **Logistic Regression** model using Gradient Descent in a Web Worker.

## Description

Logistic Regression is used for binary classification. It predicts the probability that a given input belongs to class 1 ($P(y=1|x)$). The decision boundary is linear, but the output is squashed through a **Sigmoid** function.
- **Worker Thread**:
    1. Generates two clusters of data points.
    2. Normalizes the data for stable training.
    3. Optimizes the Log Loss (Binary Cross Entropy) using Stochastic Gradient Descent (SGD).
    4. Sends updated weights and metrics to the main thread.
- **Main Thread**: Renders the data points and a probability heatmap (Blue to Red gradient) representing the model's confidence.

## Features

- **Sigmoid Activation**: Visualizes how the model transitions smoothly from Class 0 to Class 1.
- **Gradient Descent**: Shows the iterative process of minimizing loss.
- **Probability Heatmap**: Unlike Perceptron (hard line), Logistic Regression provides a probability surface.

## Usage

1. Open `index.html`.
2. Click "New Data" to generate clusters.
3. Adjust "Learning Rate" and "Max Epochs".
4. Click "Train Model".
5. Watch the background gradient shift as the model learns to separate the red and blue clusters.
