# Stereoscopic Projection

This example demonstrates how to generate a Red-Cyan Anaglyph 3D image using Web Workers. It takes a standard 2D image and applies a channel shift to simulate depth (parallax).

## How it Works

1.  **Parallax Simulation**: To create the illusion of depth, the image is split into two views: Left Eye and Right Eye.
2.  **Shifting**:
    *   **Left View**: The original image is shifted horizontally by half the parallax value.
    *   **Right View**: The original image is shifted horizontally by negative half the parallax value.
3.  **Channel Merging**: The two views are combined into a single image using the standard Red-Cyan anaglyph method:
    *   The **Red** channel is taken from the **Left View**.
    *   The **Green** and **Blue** channels (Cyan) are taken from the **Right View**.

## Parameters

*   **Parallax**: Controls the horizontal separation between the Left and Right views.
    *   **Positive values**: The image appears to be behind the screen (recede).
    *   **Negative values**: The image appears to pop out of the screen.

## Performance

The pixel manipulation is handled by a Web Worker to ensure the UI remains responsive.
