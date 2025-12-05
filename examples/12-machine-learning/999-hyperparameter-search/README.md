# Example 999: Hyperparameter Search

This example simulates the process of Hyperparameter Optimization (HPO) in Machine Learning using a Web Worker. It visualizes the search process on the Rosenbrock function landscape.

## Description

Finding the optimal hyperparameters for a machine learning model often involves training the model multiple times with different configurations. This is a computationally expensive process.
- **Main Thread**: Handles the UI and real-time visualization of the search progress.
- **Worker Thread**: Performs the search (Grid Search or Random Search), simulating the "training" (evaluation) cost for each parameter set.

## Features

- **Search Strategies**: Support for Grid Search and Random Search.
- **Visualization**: Real-time plotting of evaluated points on a 2D canvas.
- **Optimization**: Tries to minimize the Rosenbrock function (Loss function).
- **Responsive UI**: The search runs in the background, preventing the UI from freezing during the "expensive" evaluation steps.

## Usage

1. Open `index.html`.
2. Select a strategy (Grid or Random).
3. Configure iterations (for Random) or grid size (for Grid).
4. Click "Start Search".
5. Watch the worker explore the parameter space and converge towards the global minimum at (1, 1).
