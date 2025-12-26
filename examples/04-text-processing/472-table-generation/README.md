# Table Generation (Web Worker Example #472)

Converts delimited text (CSV, TSV, etc.) into formatted tables (ASCII, Markdown, HTML, LaTeX).

## How it works

1.  **Detection**: The worker analyzes the input text to auto-detect the delimiter (comma, tab, pipe, semicolon) if requested.
2.  **Parsing**: It parses the rows and columns into a 2D array.
3.  **Analysis**: Calculates maximum column widths for alignment.
4.  **Formatting**: Generates the output string based on the selected format:
    *   **ASCII**: Uses `+`, `-`, `|` to draw a grid.
    *   **Markdown**: Standard GitHub-flavored Markdown table.
    *   **HTML**: Standard `<table>` structure.
    *   **LaTeX**: `tabular` environment.

## Usage

1.  Paste CSV or delimited data into the text area.
2.  Select the delimiter (or leave Auto).
3.  Select the desired output format.
4.  Click "Convert Table".
