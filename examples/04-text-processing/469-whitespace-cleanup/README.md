# Whitespace Cleanup (Web Worker Example #469)

This example provides various whitespace cleanup utilities.

## Features

-   **Trim Lines**: Removes leading and trailing whitespace from every line.
-   **Reduce Multiple Spaces**: Converts consecutive spaces into a single space (e.g., "Hello   World" -> "Hello World").
-   **Tab <-> Space Conversion**: Simple conversion (assuming 4 spaces per tab).

## Algorithm

-   **Trim**: `lines.map(l => l.trim())`.
-   **Reduce Spaces**: Regex `s/ +/ /g`.
-   **Tab Conversion**: Regex replace `\t` or `    `.
