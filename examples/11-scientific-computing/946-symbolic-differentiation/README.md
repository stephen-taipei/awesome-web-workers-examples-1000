# Example 946: Symbolic Differentiation

This example demonstrates a **Symbolic Differentiator** running in a Web Worker. It computes the exact derivative of a mathematical expression using an abstract syntax tree (AST) transformation.

## Description

Unlike numerical differentiation (which estimates slope), symbolic differentiation applies calculus rules (Product Rule, Chain Rule, Power Rule) to the expression tree to produce a new expression representing the exact derivative.
- **Worker Thread**:
    1. Tokenizes and parses the input string (e.g., `x^2`) into an AST.
    2. Recursively traverses the AST to apply differentiation rules (e.g., `d(x^n) -> n*x^(n-1)`).
    3. Simplifies the resulting tree (e.g., `0 * x -> 0`, `1 * x -> x`).
    4. Converts the derivative AST back to a string and a JavaScript function for evaluation.
- **Main Thread**: Displays the symbolic result and allows numerical evaluation.

## Features

- **AST Manipulation**: Shows how compilers/interpreters process math.
- **Calculus Rules**: Implements Power, Product, Quotient, and Chain rules.
- **Simplification**: Basic constant folding and identity removal to keep results readable.

## Usage

1. Open `index.html`.
2. Enter a function like `x^3 + sin(x)*x`.
3. Click "Differentiate".
4. See the result `(3 * x^2) + ((cos(x) * x) + (sin(x) * 1))`.
5. Enter a value for $x$ and click "Evaluate f'(x)" to calculate the slope at that point.
