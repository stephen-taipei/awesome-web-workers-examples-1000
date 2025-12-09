# Example 996: Binary Classification Metrics

This example uses a Web Worker to calculate various evaluation metrics for a binary classification model on a potentially large dataset.

## Description

When evaluating a binary classifier, several metrics beyond simple accuracy provide a more nuanced understanding of its performance. These calculations can be computationally intensive for large datasets.
- **Worker Thread**: Generates synthetic ground truth and predicted labels based on configurable model performance (True Positive Rate, False Positive Rate) and class prevalence. It then computes True Positives (TP), False Positives (FP), True Negatives (TN), False Negatives (FN), and derived metrics like Accuracy, Precision, Recall, F1-Score, and Matthews Correlation Coefficient (MCC).
- **Main Thread**: Displays the calculated metrics and the confusion matrix counts in a user-friendly interface.

## Features

- **Large Dataset Simulation**: Capable of simulating and evaluating models on millions of data points.
- **Configurable Model Behavior**: Adjust the True Positive Rate, False Positive Rate, and the prevalence of the positive class to observe how metrics change.
- **Comprehensive Metrics**: Calculates Accuracy, Precision, Recall, F1-Score, and MCC, along with the underlying confusion matrix counts.
- **Responsive UI**: All heavy calculations are offloaded to the worker, keeping the main thread free.

## Usage

1. Open `index.html`.
2. Select the "Dataset Size".
3. Adjust the "True Positive Rate" (how well the model finds actual positives).
4. Adjust the "False Positive Rate" (how often the model incorrectly predicts positives).
5. Adjust the "Prevalence" (the proportion of positive cases in the dataset).
6. Click "Generate & Evaluate". The metrics will update dynamically.
