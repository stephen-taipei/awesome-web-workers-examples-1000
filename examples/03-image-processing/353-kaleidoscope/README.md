# Kaleidoscope Effect Example

## Overview
This example demonstrates how to create a "Kaleidoscope" effect using Web Workers. It simulates the optical instrument by reflecting a segment of the image multiple times around a central point, creating a symmetrical pattern.

## Features
- **Segments**: Adjust the number of symmetrical segments (mirrors).
- **Rotation Offset**: Rotate the sampling angle.
- **Zoom**: Zoom into the pattern.
- **Web Worker**: Polar coordinate mapping and pixel sampling are performed off the main thread.

## Technical Details
- The worker iterates through every pixel of the destination image.
- It converts Cartesian coordinates `(x, y)` to Polar coordinates `(angle, distance)` relative to the center.
- It maps the `angle` into a single wedge segment using modulo arithmetic and reflection (mirroring alternate segments).
- It converts the mapped polar coordinates back to Cartesian source coordinates.
- It samples the color from the source image at the calculated position.

## How to Use
1.  Open the `index.html` file in a browser.
2.  Upload an image.
3.  Adjust Segments, Rotation, and Zoom.
4.  Click "Apply Effect".
