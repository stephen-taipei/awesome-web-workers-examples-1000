# Example 983: Neural Network Inference Benchmark

This example benchmarks the inference performance (forward pass throughput) of a Deep Neural Network running inside a Web Worker.

## Description

Running deep learning models in the browser is becoming increasingly common. This example simulates a standard Fully Connected (Dense) Neural Network typically used for tasks like image classification (e.g., MNIST).
- **Worker Thread**: Performs the heavy Matrix Multiplication operations required for the forward pass of the network. It handles batch processing to maximize throughput.
- **Main Thread**: Displays real-time metrics such as Inferences Per Second (IPS) and Latency per Batch.

## Features

- **Configurable Architecture**: Define arbitrary hidden layers (e.g., `256, 128, 64`).
- **Batch Processing**: Adjust batch size to see the trade-off between latency and throughput.
- **Performance Metrics**: Real-time graph of inference latency and numeric throughput counter.
- **Matrix Math**: Implements raw matrix-vector multiplication loops optimized for JavaScript TypedArrays.

## Usage

1. Open `index.html`.
2. Configure the "Hidden Layers" (comma-separated sizes).
3. Select a "Batch Size" (Larger batches usually give higher throughput but higher latency per call).
4. Click "Start Benchmark".
5. Observe the "Throughput" number stabilize. High numbers indicate efficient JS engine execution.
