# Text Alignment (Web Worker Example #465)

This example aligns text (Left, Center, Right) within a fixed width using a specified padding character.

## Features

-   **Alignment Modes**: Supports Left, Center, and Right alignment.
-   **Configurable Width**: User can set the target width for alignment.
-   **Custom Padding**: User can specify the character used for padding (default is space).
-   **Line Processing**: Processes each line independently.

## Algorithm

1.  Split input text into lines.
2.  Trim existing whitespace from the start and end of each line.
3.  Calculate required padding: `width - line.length`.
4.  Apply padding based on alignment mode:
    -   **Left**: `Text + Padding`
    -   **Right**: `Padding + Text`
    -   **Center**: `Floor(Padding/2) + Text + Ceil(Padding/2)`
