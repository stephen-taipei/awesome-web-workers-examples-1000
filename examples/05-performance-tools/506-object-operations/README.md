# Object Operations Benchmark (Web Worker Example #506)

This example benchmarks property access, insertion, and deletion performance between native JavaScript objects (`{}`) and `Map`.

## Features

-   **Comparisons**: Object vs Map.
-   **Operations**: Insertion, Read, Deletion.
-   **Scale**: Tests with 100k, 500k, and 1M entries.

## Insights

-   `Map` is generally optimized for frequent additions and removals of key-value pairs.
-   `Map` preserves insertion order and keys can be of any type.
-   `Object` is typically faster for creating small static records or when using string keys if the engine optimizes it well (Hidden Classes), but deletion (`delete` operator) often de-optimizes objects, making them significantly slower than `Map.delete`.
