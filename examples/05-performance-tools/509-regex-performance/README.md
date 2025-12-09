# Regex Performance Benchmark (Web Worker Example #509)

This example benchmarks Regular Expression performance on a generated text corpus.

## Features

-   **Tests**: `String.match()` (all matches) vs `RegExp.exec()` loop.
-   **Corpus**: Generates a large text block with random words and potential matches (emails, numbers).
-   **Patterns**:
    -   **Email**: Complex pattern.
    -   **Simple**: Literal string search.
    -   **Digits**: Character class search.

## Insights

-   `String.match()` with a global regex is generally optimized for collecting all matches.
-   `RegExp.exec()` allows for iterative processing but has more overhead in a tight loop if just collecting strings.
-   Complex patterns significantly increase processing time compared to simple literals.
