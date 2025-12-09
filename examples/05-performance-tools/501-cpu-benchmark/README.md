# CPU Benchmark (Web Worker Example #501)

Measures single-core and multi-core CPU performance using a prime number calculation task.

## How it works

1.  **Workload**: The task is to find prime numbers using trial division (`isPrime`).
2.  **Concurrency**: Spawns multiple Web Workers to run the task in parallel.
3.  **Measurement**: Each worker runs for a fixed duration (e.g., 5 seconds) and reports the number of primes found. The main thread aggregates the results.
4.  **Utilization**: By creating multiple workers, we can utilize all CPU cores.

## Usage

1.  Select duration.
2.  Select number of threads (usually matching logical cores).
3.  Click "Start Benchmark".
