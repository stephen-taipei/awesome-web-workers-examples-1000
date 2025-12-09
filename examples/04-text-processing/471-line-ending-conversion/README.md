# Line Ending Conversion (Web Worker Example #471)

This example converts text line endings between LF (Unix/Linux) and CRLF (Windows) formats.

## Features

-   **Format Selection**: Choose between LF (`\n`) and CRLF (`\r\n`).
-   **Visual Debugging**: The output shows invisible characters like `[CR]` and `[LF]` to visually confirm the conversion.
-   **Statistics**: Displays count of each line ending type found in the result.

## Algorithm

1.  Normalize all line endings to `\n` (LF) by replacing `\r\n` and `\r`.
2.  If target is CRLF, replace all `\n` with `\r\n`.
3.  Generate statistics by regex matching.
