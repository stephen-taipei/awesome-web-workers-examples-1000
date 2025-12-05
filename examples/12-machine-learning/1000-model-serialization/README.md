# Example 1000: Model Serialization

This example demonstrates how to use a Web Worker to handle the computationally expensive task of serializing large data structures, such as Machine Learning models, into JSON format.

## Description

Serializing large objects (e.g., a deep learning model with millions of weights) using `JSON.stringify` can be CPU-intensive and may block the main thread, causing the UI to freeze. By offloading this task to a Web Worker, the main UI remains responsive.

## Features

- **Model Simulation**: Generates a dummy Neural Network structure with configurable layers and weights.
- **Offloaded Serialization**: Performs `JSON.stringify` inside the worker.
- **Pretty Print Option**: Allows toggling formatted JSON output (which is even more expensive).
- **Performance Metrics**: Reports the time taken and the resulting data size.

## Usage

1. Open `index.html` in a modern web browser.
2. Adjust the "Model Size" and "Weights per Layer" to change the complexity.
3. Check "Pretty Print" if you want formatted output.
4. Click "Serialize Model".
5. Observe the status updates and the final result without UI freezing.
