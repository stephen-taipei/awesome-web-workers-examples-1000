# Currency Formatting

This example demonstrates how to use Web Workers to handle financial data formatting for large datasets.

## Features
- **Batch Processing**: Formats 100,000+ amounts efficiently.
- **Intl.NumberFormat**: Uses standards-compliant currency formatting.
- **Currency Support**: Supports major currencies (USD, EUR, JPY, GBP, CNY, TWD) and even Bitcoin (BTC).
- **Display Options**: Toggle between Symbols ($), Codes (USD), or Names (US Dollar).
- **Locale Awareness**: Correct placement of symbols (e.g., $100 vs 100 €).

## Performance
- Ensures high performance and responsiveness by using a background worker thread.
