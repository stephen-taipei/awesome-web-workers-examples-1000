# Pop Art Effect (Web Worker Example #347)

This example simulates the Pop Art style popularized by artists like Andy Warhol, converting photos into high-contrast, colorful prints.

## How it works

1.  **Grayscale Conversion**: The image luminance is calculated to determine brightness.
2.  **Thresholding**: The continuous brightness range is quantized into 4 distinct zones using two adjustable threshold sliders.
    *   Dark Zone
    *   Mid-Dark Zone
    *   Mid-Light Zone
    *   Light Zone
3.  **Recoloring**: Each zone is mapped to a specific color from a selected palette. This replaces the natural colors and gradients with flat, bold colors.

## Features

*   **Palettes**: Switch between different color schemes (Classic Warhol, Neon, Fire, Ocean).
*   **Adjustable Thresholds**: Fine-tune how the image is segmented into the 4 color zones.
*   **Web Worker**: Ensures smooth UI interaction while processing large arrays of pixel data.
