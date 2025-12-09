# Loop Performance Benchmark (Web Worker Example #508)

This example benchmarks different looping constructs in JavaScript iterating over a TypedArray.

## Features

-   **Comparisons**: `for`, `while`, `for...of`, `forEach`, and `reduce`.
-   **Configurable**: Array size (10M to 50M).

## Insights

-   **Standard `for` and `while` loops** are generally the fastest as they involve minimal function call overhead and engine optimization.
-   **`forEach` and `reduce`** involve a callback function invocation for each element, which can be slower, although JIT engines optimize this heavily.
-   **`for...of`** on TypedArrays is optimized but can sometimes be slower than a raw `for` loop depending on the engine.
