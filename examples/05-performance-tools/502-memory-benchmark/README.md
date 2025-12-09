# Memory Benchmark (Web Worker Example #502)

Measures memory bandwidth (read/write speed) using TypedArrays in a Worker.

## How it works

1.  **Allocation**: Allocates a large `ArrayBuffer` (e.g., 256MB) and views it as an `Int32Array`.
2.  **Operations**:
    *   **Sequential Write**: Iterates through the array writing values.
    *   **Sequential Read**: Iterates through the array reading and summing values.
    *   **Random**: Uses a pseudo-random generator (Xorshift) to access random indices.
3.  **Calculation**: Speed = Size / Time.

## Usage

1.  Select chunk size (larger is better to minimize overhead but check browser limits).
2.  Select operation type.
3.  Click "Run Benchmark".
