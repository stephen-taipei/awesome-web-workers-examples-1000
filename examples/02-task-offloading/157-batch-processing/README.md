# Batch Processing Example

This example demonstrates the performance difference between sending tasks individually to a Web Worker versus sending them in batches.

## Features

*   **Individual Processing**: Sends 1000 separate messages to the worker.
*   **Batch Processing**: Groups the 1000 tasks into batches of 100 and sends them as fewer messages.
*   **Performance Comparison**: Measures and displays the total execution time for both methods.

## Why Batching?

`postMessage` has a serialization and deserialization cost. When processing many small tasks, this overhead can become significant. Batching tasks reduces the number of messages and thus the total overhead, improving overall throughput.

## Usage

1.  Click **Run Individual** to process tasks one by one.
2.  Click **Run Batched** to process tasks in batches.
3.  Compare the time taken. Typically, batch processing will be faster for a large number of small tasks.
