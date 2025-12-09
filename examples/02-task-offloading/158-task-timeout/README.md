# Task Timeout Example

This example demonstrates how to enforce a timeout on a Web Worker task. If the worker does not complete within the specified time limit, it is terminated, and the promise is rejected.

## How it works

1.  A `Promise` wraps the worker interaction.
2.  `setTimeout` is used to trigger a timeout rejection.
3.  If the worker completes before the timeout, the timer is cleared, and the promise resolves.
4.  If the timeout triggers first, `worker.terminate()` is called to forcefully stop the worker, and the promise rejects.

## Usage

1.  Set the **Task Duration** (how long the simulated task takes).
2.  Set the **Timeout Limit** (the maximum allowed time).
3.  Click **Run Task**.
4.  If Duration > Timeout, you will see a timeout error. Otherwise, you will see a success message.
