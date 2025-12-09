# Empty Line Handling (Web Worker Example #470)

This example processes text to handle empty lines.

## Features

-   **Remove All Empty Lines**: Deletes all lines that are empty or contain only whitespace.
-   **Collapse Multiple Empty Lines**: Reduces consecutive empty lines to a single empty line.
-   **Add Empty Line Between Lines**: Doubles the spacing between content lines.

## Algorithm

-   **Remove All**: Filter `lines` where `line.trim().length > 0`.
-   **Collapse**: Regex replacement `\n{3,}` -> `\n\n`.
-   **Add Between**: Join filtered lines with `\n\n`.
