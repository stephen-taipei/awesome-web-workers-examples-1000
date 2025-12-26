# Tree Structure (Web Worker Example #474)

Converts indented text lists into hierarchical tree structures.

## How it works

1.  **Parsing**: Reads line by line, calculating indentation level (tabs or spaces).
2.  **Tree Building**: Constructs a DOM-like tree object based on indentation levels.
3.  **Rendering**:
    *   **ASCII**: Uses box-drawing characters (`├──`, `└──`) to visualize the tree (similar to the unix `tree` command).
    *   **JSON**: Exports the tree as a nested JSON object.
    *   **HTML**: Generates nested `<ul>` and `<li>` tags.

## Usage

1.  Enter text with indentation (spaces or tabs).
2.  Select output style.
3.  Click "Generate Tree".
