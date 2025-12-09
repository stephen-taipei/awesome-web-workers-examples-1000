# Integer Arithmetic Benchmark (Web Worker Example #504)

This example benchmarks basic integer arithmetic operations in JavaScript running inside a Web Worker.

## Features

-   **Operations**: Benchmarks Addition, Multiplication, Division, and Modulo.
-   **Isolation**: Runs in a Web Worker to ensure UI responsiveness and minimize main-thread interference.
-   **Metrics**: Calculates execution time and Operations Per Second (Ops/sec).

## How it works

1.  User selects the number of iterations (in millions).
2.  The worker runs tight loops performing each operation.
3.  `performance.now()` is used to measure the time taken for each loop.
4.  Results are aggregated and sent back to the main thread for display.
