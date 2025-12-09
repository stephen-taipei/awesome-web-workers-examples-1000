# Indentation Adjustment (Web Worker Example #468)

This example batch processes text lines to add or remove indentation.

## Features

-   **Add Indent**: Prepends a specific number of spaces or tabs to every line.
-   **Remove Indent**: Removes up to a specific number of leading spaces or tabs from every line.
-   **Configurable**: Choose between Space/Tab and set the count.

## Algorithm

1.  Construct the indentation string (e.g., 2 spaces).
2.  Iterate through lines.
3.  **Add**: `indentString + line`.
4.  **Remove**: Use Regex `^[{char}]{0,amount}` to replace leading characters with empty string.
