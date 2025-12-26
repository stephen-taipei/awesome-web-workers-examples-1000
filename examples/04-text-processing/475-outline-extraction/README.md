# Outline Extraction (Web Worker Example #475)

Extracts structure and headings from various text formats.

## How it works

1.  **Format Analysis**:
    *   **Markdown**: Looks for lines starting with `#`.
    *   **HTML**: Regex match for `<h1...6>` tags.
    *   **Text**: Uses heuristics like numbering (1.1), indentation, or ALL CAPS lines.
2.  **Normalization**: Adjusts indentation levels so the outline starts at level 0.
3.  **Output**: Produces a clean, indented list of headings.

## Usage

1.  Paste Markdown, HTML source, or structured text.
2.  Select the input format.
3.  Click "Extract Outline".
