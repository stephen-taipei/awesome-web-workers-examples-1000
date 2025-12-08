# DAG Task Scheduling Example

This example demonstrates how to implement a task scheduler that respects dependencies between tasks (Directed Acyclic Graph).

## Features

*   **Dependency Resolution**: Tasks are only executed when their dependencies are completed.
*   **Parallel Execution**: Tasks that can run in parallel (independent of each other) are executed simultaneously up to the worker pool limit.
*   **Visualization**: Shows the state of each task (Pending, Running, Completed).

## How it works

1.  A list of tasks is defined with their duration and dependencies.
2.  The scheduler checks for tasks that have:
    *   Status "Pending"
    *   All dependencies with status "Completed"
3.  Eligible tasks are assigned to available Web Workers.
4.  When a worker finishes a task, the scheduler updates the task status and checks for new eligible tasks.

## Key Technologies

*   **Web Workers**: For parallel task execution.
*   **Topological Sort / Graph Traversal**: Implicitly handled by the scheduler checking dependencies.
