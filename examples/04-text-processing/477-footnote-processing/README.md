# Footnote Processing (Web Worker Example #477)

Extracts, renumbers, and converts Markdown-style footnotes.

## How it works

1.  **Parsing**: Identifies footnote references `[^id]` and definitions `[^id]: content` using Regex.
2.  **Actions**:
    *   **Extract**: Lists all defined footnotes.
    *   **Renumber**: Renumbers footnotes sequentially (1, 2, 3...) based on their first appearance in the text.
    *   **Markdown to HTML**: Converts references to `<sup>` tags and appends a formatted HTML footnote list at the bottom with back-links.

## Usage

1.  Paste text with Markdown footnotes.
2.  Select an action.
3.  Click "Process".
