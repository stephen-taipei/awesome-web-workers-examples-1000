# Fair Scheduler

This example demonstrates a fair queuing scheduler (Round-Robin) that prevents resource starvation.

## Problem
In a simple FIFO (First-In-First-Out) queue, if one user submits 100 tasks, other users have to wait until all 100 are finished.

## Solution (Fair Queuing)
The scheduler maintains separate queues for each user (User A, User B, User C). It cycles through the queues in a round-robin fashion to pick the next task.
Order: A1 -> B1 -> C1 -> A2 -> B2 -> ...

## Features

-   **Multi-User Simulation**: Submit tasks as User A, B, or C.
-   **Flood Protection**: "Flood" buttons allow you to simulate a burst of traffic from one user.
-   **Round-Robin Dispatch**: Even if User A has 50 tasks pending and User B adds 1 task, User B's task will be processed in the next available slot allocated to B, without waiting for all of A's tasks.
-   **Single Worker**: Currently set to 1 worker to clearly demonstrate the execution order.

## How to use

1.  Open `index.html`.
2.  Click "Flood (5)" for User A. You see 5 tasks in A's queue.
3.  Immediately click "Add Task" for User B.
4.  Observe the execution. The worker will pick one from A, then one from B (if available), attempting to balance the service.
