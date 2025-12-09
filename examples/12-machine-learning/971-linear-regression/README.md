# Example 971: Simple Linear Regression

This example demonstrates the most basic machine learning algorithm, **Linear Regression**, training in a Web Worker.

## Description

Linear regression attempts to model the relationship between two variables by fitting a linear equation ($y = mx + b$) to observed data.
- **Worker Thread**:
    1. Generates a synthetic linear dataset with configurable noise.
    2. Uses **Batch Gradient Descent** to iteratively update the slope ($m$) and intercept ($b$) to minimize the Mean Squared Error (MSE).
- **Main Thread**: Visualizes the data points and the regression line in real-time.

## Features

- **Gradient Descent**: Visualizes the "learning" process as the line rotates and shifts to find the optimal fit.
- **Interactive**: Adjust noise levels and learning rate to see how they affect convergence speed and stability.
- **Educational**: Simplest possible implementation of ML optimization logic.

## Usage

1. Open `index.html`.
2. Adjust "Noise Level" (Low noise makes a perfect line, high noise makes a cloud).
3. Click "Train Model".
4. Watch the red line align with the blue dots.
