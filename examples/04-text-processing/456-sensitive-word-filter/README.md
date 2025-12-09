# Sensitive Word Filter Example

## Overview
This example demonstrates efficient string matching and filtering using the Aho-Corasick algorithm running in a Web Worker. This is suitable for censorship systems or keyword highlighting where multiple patterns need to be searched simultaneously.

## Features
- **Aho-Corasick Algorithm**: Efficiently searches for multiple patterns in a single pass.
- **Customizable Dictionary**: Users can input their own list of sensitive words.
- **Custom Replacement**: Choose the character used to mask sensitive words.

## How to Use
1.  Enter a comma-separated list of sensitive words.
2.  Enter the text to be filtered.
3.  Set the replacement character (default is `*`).
4.  Click "Filter Text" to see the result.
