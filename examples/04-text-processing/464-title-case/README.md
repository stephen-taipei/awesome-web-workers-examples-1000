# Title Case Converter (Web Worker Example #464)

This example converts input text to **Title Case** using a Web Worker.

## Features

-   **Web Worker**: Processing happens off the main thread.
-   **Regex-based Replacement**: Uses Regular Expressions to identify words and capitalize the first letter while lowercasing the rest.
-   **Performance Metrics**: Shows processing time and character count.

## Algorithm

1.  The worker receives the text string.
2.  It uses `text.replace(/\w\S*/g, callback)` to iterate through words.
3.  For each word, it uppercases the first character and lowercases the rest: `txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()`.
