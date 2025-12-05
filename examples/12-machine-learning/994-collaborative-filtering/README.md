# Example 994: Item-Based Collaborative Filtering

This example implements a basic Item-Based Collaborative Filtering recommendation system using Cosine Similarity in a Web Worker.

## Description

Collaborative filtering predicts user preferences for items by collecting preferences from many users. Item-Based Collaborative Filtering focuses on finding similar items based on user ratings.
- **Worker Thread**:
    1. Generates a sparse User-Item rating matrix.
    2. Transposes it to an Item-User matrix for cache efficiency.
    3. Computes the Cosine Similarity between every pair of items (O(Items^2 * Users)).
- **Main Thread**: Allows the user to select an item and instantly displays the most similar items based on the computed model.

## Features

- **Matrix Operations**: Efficiently handles matrix generation and transposition in JavaScript.
- **Similarity Calculation**: Computes Cosine Similarity for sparse high-dimensional vectors.
- **Scalable**: Works with thousands of users and hundreds of items.
- **Interactive**: Real-time recommendation lookups after the initial training phase.

## Usage

1. Open `index.html`.
2. Configure "Number of Users", "Number of Items", and "Sparsity". Higher users/items increase computation time significantly.
3. Click "Generate Data & Train Model".
4. Once training is complete, select an item from the dropdown to see the top 5 recommended items similar to it.
