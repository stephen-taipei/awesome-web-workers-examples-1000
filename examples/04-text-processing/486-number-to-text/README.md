# Number to Text

This example demonstrates how to use Web Workers to convert numbers into their English textual representation.

## Features
- **Recursive Conversion**: Handles numbers up to quadrillions by breaking them into 3-digit chunks.
- **Batch Processing**: Converts 100,000+ numbers efficiently.
- **Large Integer Support**: Processes 15+ digit integers correctly.

## Performance
- The computationally intensive recursive string building is offloaded to a Web Worker.
