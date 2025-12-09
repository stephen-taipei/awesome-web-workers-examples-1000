# Example 974: Decision Tree Visualizer

This example visualizes the construction and decision boundaries of a **Decision Tree Classifier** running in a Web Worker.

## Description

A Decision Tree is a non-parametric supervised learning method. It creates a model that predicts the value of a target variable by learning simple decision rules inferred from the data features. The decision boundaries are always orthogonal to the axes (box-like regions).
- **Worker Thread**:
    1. Generates a complex 2D dataset (Circle center + Corner region).
    2. Recursively splits the data based on the best feature and threshold that minimizes impurity (Gini or Entropy).
    3. Computes a decision map for visualization.
- **Main Thread**: Renders the training data points and the colored decision regions.

## Features

- **Recursive Splitting**: Implements ID3/CART-like logic from scratch.
- **Impurity Measures**: Choose between **Gini Impurity** and **Entropy** (Information Gain).
- **Visualization**: Clearly shows the "boxy" nature of decision tree boundaries.
- **Interactive**: Adjust tree depth and minimum samples to observe **Overfitting** (complex shapes catching noise) vs **Underfitting** (simple large blocks).

## Usage

1. Open `index.html`.
2. Click "New Data" to see the pattern.
3. Adjust "Max Depth" and "Min Samples Split".
4. Click "Build Tree".
5. The canvas will display the classification regions (Orange vs Blue).
