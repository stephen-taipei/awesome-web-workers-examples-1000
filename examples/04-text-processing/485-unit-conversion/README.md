# Unit Conversion

This example demonstrates how to use Web Workers to handle bulk unit conversions.

## Features
- **Batch Processing**: Converts 100,000+ values efficiently.
- **Multi-Category Support**:
  - Length (m, km, ft, in, mi, etc.)
  - Weight (kg, lb, oz, etc.)
  - Temperature (Celsius, Fahrenheit, Kelvin)
  - Area (sqm, sqft, acres, etc.)
  - Volume (liters, gallons, m3, etc.)
- **Precision Handling**: Maintains reasonable floating-point precision in output.

## Performance
- Arithmetic operations for mass conversion are offloaded to a background thread to maintain UI responsiveness.
