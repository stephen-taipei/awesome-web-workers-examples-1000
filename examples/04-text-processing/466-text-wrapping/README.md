# Text Wrapping (Web Worker Example #466)

This example wraps text to a specified character width, ensuring words are not broken unless they exceed the width themselves.

## Features

-   **Word-Aware Wrapping**: Respects word boundaries.
-   **Forced Breaking**: Handles words longer than the specified width by breaking them.
-   **Configurable Width**: User can adjust the maximum line width.

## Algorithm

1.  Split input text into a stream of words (using whitespace as delimiter).
2.  Iterate through words, accumulating them into a `currentLine`.
3.  If adding the next word would exceed `width`:
    -   Push `currentLine` to results.
    -   Start a new line with the current word.
    -   If the word itself is longer than `width`, split it across multiple lines.
4.  Join resultant lines with `\n`.
