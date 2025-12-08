# Dynamic Worker Pool

This example demonstrates a dynamic worker pool that automatically scales the number of Web Workers based on the current workload.

## Features

-   **Auto-scaling**: The pool starts with a minimum number of workers (2) and can scale up to a maximum (8) when the task queue grows.
-   **Scale-down**: Idle workers are automatically removed after a timeout period to save resources, down to the minimum count.
-   **Task Queue**: Tasks are queued if no workers are available.
-   **Visual Interface**: Real-time visualization of worker status (Busy/Idle) and queue depth.

## How to use

1.  Open `index.html` in a modern web browser.
2.  Use the buttons to add tasks:
    -   **Add Task**: Adds a single task with ~500ms duration.
    -   **Add Long Task**: Adds a single task with ~2000ms duration.
    -   **Add Burst**: Adds 20 tasks at once to trigger scaling.
3.  Observe the "Worker Pool" section. You should see new worker cards appear when the load is high and disappear when the system becomes idle.
