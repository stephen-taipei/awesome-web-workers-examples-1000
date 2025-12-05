# Example 970: Math Expression Parser

This example demonstrates a safe mathematical expression evaluator running in a Web Worker.

## Description

Evaluating user-provided mathematical expressions using `eval()` is dangerous (XSS risk). Writing a custom parser allows for safe evaluation of math formulas.
- **Worker Thread**: Implements a Recursive Descent Parser to tokenize and parse strings into an Abstract Syntax Tree (AST). It then evaluates the AST against provided variables (like `x`).
- **Main Thread**: Provides an interface to input expressions and visualizes the function by plotting it on a canvas.

## Features

- **Custom Parser**: Supports standard operators (`+`, `-`, `*`, `/`, `^`) and functions (`sin`, `cos`, `log`, `sqrt`, etc.).
- **Safe**: No use of `eval()` or `new Function()`.
- **Batch Evaluation**: Efficiently calculates hundreds of points for plotting by parsing the AST once and evaluating it repeatedly.

## Usage

1. Open `index.html`.
2. Enter a formula (e.g., `sin(x) * x`).
3. Click "Evaluate Single" to test a specific value.
4. Click "Plot Graph" to see the function rendered on the canvas.
