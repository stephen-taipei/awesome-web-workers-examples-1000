# Example 985: K-Fold Cross Validation

This example demonstrates the K-Fold Cross Validation technique for evaluating machine learning models using a Web Worker.

## Description

Cross-validation is a resampling procedure used to evaluate machine learning models on a limited data sample.
- **K-Fold**: The dataset is divided into `K` groups (folds).
- **Process**: For each unique group, take the group as a hold out or test data set, and take the remaining groups as a training data set. Fit a model on the training set and evaluate it on the test set.
- **Worker Thread**:
    1. Generates a noisy linear dataset.
    2. Shuffles and splits data into K folds.
    3. Iteratively trains a Linear Regression model on K-1 folds and tests on the remaining fold.
    4. Computes MSE (Mean Squared Error) and R² Score for each fold.
- **Main Thread**: Visualizes the train/test split for the current fold and displays per-fold metrics.

## Features

- **Robust Evaluation**: Provides a more reliable estimate of model performance than a single train/test split.
- **Interactive Visualization**: Highlights which points are currently being used for training vs testing.
- **Background Processing**: Model training and scoring happens off the main thread.

## Usage

1. Open `index.html`.
2. Set "Sample Size", "Folds (K)", and "Data Noise".
3. Click "Run Cross Validation".
4. Watch as the system iterates through each fold, calculating and displaying the metrics.
