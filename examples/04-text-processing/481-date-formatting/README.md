# Date Formatting

This example demonstrates high-performance batch date formatting using Web Workers.

## Features
- **Batch Processing**: Capable of processing 100,000 dates in a fraction of a second.
- **Flexible Parsing**: Accepts ISO strings, timestamps, and various date formats.
- **Multiple Output Formats**:
  - ISO 8601
  - US (MM/DD/YYYY)
  - European (DD/MM/YYYY)
  - Long & Full textual formats
  - Relative time (e.g., "5 days ago")
- **Intl API**: Uses `Intl.DateTimeFormat` for localization support.

## Performance
- Offloading to Web Worker prevents UI blocking during large batch operations.
