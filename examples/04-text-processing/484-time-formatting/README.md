# Time Formatting

This example demonstrates how to use Web Workers to handle various time formatting tasks.

## Features
- **Batch Processing**: Process 100,000+ timestamps or durations quickly.
- **Relative Time**: Uses `Intl.RelativeTimeFormat` to generate human-readable strings like "5 minutes ago" or "in 2 days".
- **Duration Formatting**: Converts milliseconds into `HH:MM:SS` format.
- **Clock Formats**: Supports 12-hour and 24-hour clock displays localized to specific regions.

## Performance
- Using a Web Worker keeps the main UI thread free from heavy string manipulation and date calculations.
