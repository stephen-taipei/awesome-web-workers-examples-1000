# Number Formatting

This example demonstrates how to use Web Workers to format a large list of numbers efficiently.

## Features
- **Batch Processing**: Formats 100,000+ numbers quickly.
- **Intl.NumberFormat**: Leverages the browser's native Internationalization API for high performance and correctness.
- **Multiple Styles**:
  - Standard (Decimal)
  - Compact (1K, 1M, 1B - useful for dashboards)
  - Scientific (E-notation)
  - Percent
- **Locale Support**: Demonstrate formatting differences (e.g., `1.234,56` in German vs `1,234.56` in English).
- **Precision Control**: Configurable min/max fraction digits.

## Performance
- Offloading to a Web Worker ensures the UI remains responsive during heavy formatting tasks.
