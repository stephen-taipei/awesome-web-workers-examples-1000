# Work Stealing Scheduler

This example implements a Work Stealing scheduler, a highly efficient load balancing strategy used in many parallel computing frameworks (like Go scheduler, Java ForkJoinPool).

## Core Concept

-   **Decentralized Queues**: Each worker has its own local queue (Deque).
-   **Local Execution**: Workers primarily process tasks from their own queue.
-   **Work Stealing**: When a worker runs out of tasks, it becomes a "thief" and attempts to steal tasks from other "victim" workers.
-   **Deque Operations**:
    -   **Owner**: Pushes and pops from the **head** (or pushes to tail and pops from head for FIFO). In this example, we use FIFO (Shift) for the owner.
    -   **Thief**: Steals from the **tail** (Pop). This minimizes contention (locking) between the owner and the thief.

## How to use

1.  Open `index.html`.
2.  **Distribute Random Load**: Randomly assigns tasks to all workers. Most likely they will just process their own.
3.  **Flood Worker 0**: Assigns 10 tasks specifically to Worker 0.
4.  **Observe**:
    -   Worker 0 becomes busy.
    -   Worker 1, 2, and 3 are idle.
    -   The idle workers will notice Worker 0 has a backlog and will "steal" tasks.
    -   Stolen tasks are marked in yellow in the UI.

This visualization shows how work stealing naturally balances uneven loads without a central bottleneck.
