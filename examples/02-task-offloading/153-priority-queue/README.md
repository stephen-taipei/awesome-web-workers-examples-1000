# Priority Queue Scheduling

This example implements a priority queue for task scheduling. Tasks with higher priority are processed before lower priority tasks, regardless of their arrival time (provided they are still in the queue).

## Features

-   **Priority Levels**: High, Medium, and Low.
-   **Priority Queue**: The task queue is constantly sorted to ensure the highest priority task is at the head.
-   **Fixed Worker Pool**: Demonstrates scheduling logic with limited resources (2 workers).

## How to use

1.  Open `index.html`.
2.  Add tasks of different priorities.
3.  Observe the "Priority Queue" list. Even if you add a "Low" priority task first, adding a "High" priority task will make it jump to the front of the line (behind any currently executing tasks).
4.  Use "Add Mixed Batch" to quickly add a jumbled set of tasks and watch them sort themselves.
