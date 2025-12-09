# FLOPS Benchmark (Web Worker Example #503)

Measures Floating Point Operations Per Second (FLOPS).

## How it works

1.  **Loop**: Executes a tight loop performing multiply-add operations (`a = a * b + c`).
2.  **Precision**:
    *   **Float64**: Standard JavaScript `Number` (double precision).
    *   **Float32**: Simulates single precision using `Math.fround()` (Note: usually slower in JS due to casting overhead, but semantically correct for 32-bit math).
3.  **Calculation**: GFLOPS = (Iterations * 2) / Time / 10^9.

## Usage

1.  Select iteration count.
2.  Select precision.
3.  Click "Run Benchmark".
