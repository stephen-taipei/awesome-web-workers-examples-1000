# Task Sharding Example (172)

This example demonstrates how to split a large computational task (calculating the sum of a large range of numbers) into multiple smaller "shards," which are then processed in parallel by multiple Web Workers.

## Key Concepts

- **Task Sharding**: Dividing a large dataset or task into smaller, manageable chunks.
- **Parallel Processing**: Using multiple workers to process shards simultaneously.
- **Load Distribution**: Logic to distribute the workload evenly (handling remainders).
- **Progress Tracking**: Aggregating progress updates from multiple workers to show overall status.
- **BigInt**: Using BigInt for high-precision arithmetic suitable for large sums.

## How it works

1.  The user specifies a total range (e.g., 1 to 1,000,000,000) and the number of workers.
2.  The main thread calculates the range size for each worker.
3.  Workers are spawned, and each receives a specific `start` and `end` range.
4.  Each worker calculates the sum for its assigned range and periodically reports progress.
5.  The main thread aggregates the partial sums from all workers to produce the final total.
