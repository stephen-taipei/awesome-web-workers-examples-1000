# OffscreenCanvas Performance (Web Worker Example #511)

This example benchmarks rendering performance using `OffscreenCanvas` inside a Web Worker.

## Features

-   **Worker Rendering**: The main thread UI remains completely responsive while the worker renders thousands of objects.
-   **Object Count**: Configurable number of moving objects to test throughput.
-   **FPS Counter**: Real-time Frames Per Second calculation sent from worker to main thread.

## Technical Details

-   The `<canvas>` element's control is transferred to the worker using `transferControlToOffscreen()`.
-   The worker uses the standard 2D Context API to draw frames.
-   `requestAnimationFrame` is available in workers (in supported browsers) to drive the animation loop.
