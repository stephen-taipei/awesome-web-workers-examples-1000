# Affinity Scheduling Example (175)

This example demonstrates **Affinity Scheduling**, a strategy to optimize performance by routing tasks to workers that already possess the necessary resources (data locality).

## Key Concepts

- **Data Locality / Caching**: Loading large datasets or resources takes time. Once a worker loads a dataset (e.g., "Dataset A"), it is "cached" in that worker's context.
- **Cache Hit vs. Miss**:
    -   **Miss**: Assigning a task requiring Dataset A to a worker that doesn't have it incurs a penalty (loading time).
    -   **Hit**: Assigning it to a worker that already has Dataset A avoids the loading time, resulting in faster execution.
- **Affinity Scheduler**: The scheduler checks the cache state of idle workers. If a worker already has the required dataset for a pending task, that task is prioritized for that worker.

## How it works

1.  **Workers**: There are 2 workers. Initially, they have no data cached.
2.  **Tasks**: Users add tasks requiring specific datasets (A, B, or C).
3.  **Scheduler**:
    -   **Without Affinity**: Tasks are assigned FIFO to the first available worker. This often causes workers to constantly switch datasets, incurring load penalties (Cache Misses).
    -   **With Affinity**: The scheduler scans the queue. If an idle worker has "Dataset A" cached, it looks for a "Dataset A" task in the queue and assigns it, skipping other tasks if necessary.
4.  **Simulation**:
    -   **Load Time**: 1.5s (Penalty for switching datasets).
    -   **Process Time**: 1.0s.
    -   **Metrics**: Track Hits (fast) vs. Misses (slow).

## Instructions

1.  Add a mix of tasks (e.g., A, A, B, B, A, C).
2.  Observe how workers behave with "Enable Affinity Optimization" unchecked (FIFO). Note the high number of "Loading Data..." states.
3.  Check "Enable Affinity Optimization" and add more tasks. Observe how the scheduler routes tasks to workers that are already "hot" for that dataset, significantly reducing total time.
