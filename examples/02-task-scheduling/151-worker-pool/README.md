# Fixed Size Worker Pool

This example demonstrates a fundamental pattern in parallel computing: the **Worker Pool** (or Thread Pool).

## Concept

Creating and destroying Web Workers is expensive. A Worker Pool manages a fixed set of workers that are reused for multiple tasks.

1.  **Fixed Size**: The pool creates $N$ workers at startup.
2.  **Task Queue**: Tasks submitted when all workers are busy are placed in a queue.
3.  **Scheduling**: As soon as a worker becomes idle, it picks up the next task from the queue.

## Features

-   **Worker Management**: Encapsulated `WorkerPool` class in `pool.js`.
-   **Task Queue Visualization**: Real-time view of queued tasks.
-   **Status Monitoring**: Visual indicators for Busy (Yellow) vs Idle (Gray) workers.
-   **Performance Stats**: Tracks throughput and average completion time.

## Usage

1.  Open `index.html`.
2.  Adjust **Pool Size** slider and click **Reset Pool** to change the number of workers.
3.  Click buttons to add tasks:
    -   **Fast Task**: Short duration (0.5s).
    -   **Slow Task**: Long duration (2s).
    -   **Batch**: Adds 10 random tasks at once.
4.  Observe how tasks are distributed among workers and how the queue grows when the pool is saturated.
