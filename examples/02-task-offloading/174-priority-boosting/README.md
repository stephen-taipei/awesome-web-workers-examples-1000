# Priority Boosting Example (174)

This example demonstrates a **scheduler with Priority Boosting (Aging)** to prevent starvation of low-priority tasks.

## Key Concepts

- **Priority Scheduling**: Tasks have assigned priorities (High vs. Low). High priority tasks are usually processed first.
- **Starvation**: If high-priority tasks keep arriving, low-priority tasks might never get processed.
- **Aging / Priority Boosting**: Gradually increasing the priority of a task as it waits in the queue. After a certain threshold (e.g., 5 seconds), a "Low" priority task is boosted to "High" (or "Boosted") to ensure it gets execution time.

## How it works

1.  **Queue**: Tasks are added to a pending queue with 'High' or 'Low' priority.
2.  **Scheduler Loop**: Runs continuously (via `requestAnimationFrame`).
    -   **Aging Check**: Iterates through the queue. If a low-priority task has been waiting longer than `MAX_AGE_BEFORE_BOOST` (5s), its priority is upgraded to `boosted`.
    -   **Assignment**: Checks for idle workers. If available, it picks the task with the highest priority. Boosted tasks compete with High priority tasks (often treated equally or slightly higher).
3.  **Workers**: Simulate work (busy wait) for a set duration and notify completion.
4.  **Visualization**:
    -   The queue shows tasks and their "age" bar filling up.
    -   When the bar is full, the task card changes color (purple) to indicate boosting.
    -   The logs show when tasks are boosted and assigned.
