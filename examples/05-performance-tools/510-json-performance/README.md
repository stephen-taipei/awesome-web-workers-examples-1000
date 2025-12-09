# JSON Performance Benchmark (Web Worker Example #510)

This example benchmarks `JSON.parse` and `JSON.stringify` performance.

## Features

-   **Object Types**: Flat objects, Arrays of objects, and Deeply nested objects.
-   **Size Control**: Adjust the scale of the generated data.
-   **Metrics**: Shows resulting data size in KB and processing time.

## Insights

-   **Deeply Nested Objects**: Often slower to serialize/deserialize due to recursion depth.
-   **Arrays**: Usually very efficient.
-   **Main Thread Blocking**: Large JSON operations are synchronous and block the main thread. This example demonstrates running them in a worker to keep the UI responsive.
