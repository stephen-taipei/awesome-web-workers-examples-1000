# Line Numbering (Web Worker Example #467)

This example adds configurable line numbers to input text.

## Features

-   **Start Number**: Choose the starting number (e.g., 0 or 1).
-   **Padding**: Configure the width of the number column (e.g., pad with spaces to align numbers).
-   **Separator**: Custom separator string between number and text (e.g., ". " or ": ").

## Algorithm

1.  Split text into lines.
2.  Iterate through lines with index `i`.
3.  Calculate `currentNum = startNum + i`.
4.  Convert `currentNum` to string and pad start with spaces to match `padWidth`.
5.  Concatenate `paddedNum + separator + line`.
