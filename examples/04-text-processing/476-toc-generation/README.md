# TOC Generation (Web Worker Example #476)

Generates a Table of Contents (TOC) with anchor links from Markdown text.

## How it works

1.  **Parsing**: Scans for Markdown headings (lines starting with `#`).
2.  **Slug Generation**: Converts heading text into URL-friendly "slugs" (e.g., "My Heading!" -> `my-heading`). Handles duplicates by appending numbers.
3.  **Formatting**: Creates a nested list with links.
    *   **Markdown**: `- [Title](#slug)`
    *   **HTML**: `<li><a href="#slug">Title</a></li>`

## Usage

1.  Paste Markdown content containing headers.
2.  Select the desired depth (e.g., H1-H3).
3.  Click "Generate TOC".
