# Task Retry Example

This example demonstrates how to implement a retry mechanism with exponential backoff for Web Worker tasks. This is useful for handling transient failures in tasks (e.g., network requests, flaky computations).

## Features

*   **Configurable Failure Rate**: Simulate task instability by adjusting the failure probability.
*   **Retry Logic**: Automatically retries failed tasks up to a maximum number of attempts.
*   **Exponential Backoff**: Increases the wait time between retries to avoid overwhelming the system.

## How it works

1.  A recursive function `retry` manages the execution loop.
2.  If the worker throws an error (simulated via `onerror`), the promise rejects.
3.  The `catch` block checks if the maximum number of retries has been reached.
4.  If retries are available, it waits for a delay calculated as `2^attempt * 100` ms before calling `retry` again.
5.  If success, the result is returned. If retries are exhausted, an error is thrown.

## Usage

1.  Set the **Failure Probability** (e.g., 0.7 for 70% chance of failure).
2.  Set the **Max Retries**.
3.  Click **Run Task**.
4.  Observe the log to see attempts, failures, and retries.
