# Address Formatting

This example demonstrates how to use Web Workers to process and standardize a large list of addresses.

## Features
- **Batch Processing**: Handles 10,000+ addresses efficiently.
- **Parsing**: Identifies street, city, state, and zip code using Regular Expressions.
- **Standardization**: Expands abbreviations (e.g., "St" -> "Street") and fixes capitalization.
- **Format Options**: Outputs in Single-line, Multi-line, or JSON format.

## Performance
- Processing is offloaded to a background thread to prevent UI freezing.
- Shows real-time progress for large datasets.
