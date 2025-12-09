# Result Aggregation Example (173)

This example demonstrates the **Map-Reduce** pattern using Web Workers.

## Key Concepts

- **Distributed Data Generation**: Large data is processed in chunks.
- **Map Phase**: Multiple workers process their assigned data chunks in parallel (counting words).
- **Reduce Phase**: The main thread aggregates the partial results from all workers into a final result.
- **Structured Clone**: Efficiently passing complex data structures (like `Map`) between threads.

## How it works

1.  **Generate**: The user generates a large text dataset (100k - 5M words).
2.  **Split**: The main thread splits the text into `N` chunks, ensuring words are not split in the middle.
3.  **Process (Map)**: Each worker receives a chunk, counts the frequency of each word, and returns a `Map` of counts.
4.  **Aggregate (Reduce)**: The main thread receives `N` Maps, iterates through them, and sums up the counts for identical words to produce the global count.
