# Synonym Replacement Example

## Overview
This example demonstrates how to perform batch text replacement using a user-defined dictionary (map) in a Web Worker. It handles basic case preservation and whole-word matching.

## Features
- **Dictionary-based Replacement**: Replace multiple words efficiently.
- **Regex Construction**: Dynamically builds a regular expression from the dictionary keys.
- **Case Preservation**: Attempts to preserve the case of the original word (e.g., "Happy" -> "Joyful" if "happy" -> "joyful").

## How to Use
1.  Define your synonyms in the JSON text area (key: target, value: replacement).
2.  Enter the text to process.
3.  Toggle "Case Sensitive" if needed.
4.  Click "Replace Synonyms".
