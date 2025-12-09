# Example 977: Naive Bayes Classifier

This example implements a **Naive Bayes Classifier** for text classification (Spam Detection) inside a Web Worker.

## Description

Naive Bayes is a probabilistic machine learning algorithm based on Bayes' Theorem. It is simple yet effective for text classification tasks.
- **Worker Thread**:
    1. Generates a synthetic dataset of emails (Spam/Ham) based on keyword lists.
    2. Trains the model by calculating word frequencies and prior probabilities.
    3. Classifies new user inputs by calculating the log-likelihood of the text belonging to each class.
- **Main Thread**: Interfaces with the user, displays the most significant words found during training, and shows prediction results.

## Features

- **Text Processing**: Tokenization and cleaning of input text.
- **Probabilistic Model**: Uses Log-Probabilities and Laplace Smoothing to handle unseen words.
- **Keyword Visualization**: Displays the "most spammy" and "most hammy" words learned by the model.

## Usage

1. Open `index.html`.
2. Select "Training Samples" (larger size = more robust model).
3. Click "Generate Data & Train".
4. Once trained, type a message in the test box (e.g., "Win free cash prize").
5. Click "Classify" to see if it's Spam or Ham and the confidence level.
