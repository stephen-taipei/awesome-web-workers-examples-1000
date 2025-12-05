# Example 948: Symbolic Integration Engine

This example performs symbolic integration (finding the antiderivative) of mathematical functions using a rule-based pattern matching system in a Web Worker.

## Description

Symbolic integration is much harder than differentiation. It involves pattern matching against known integration rules.
- **Worker Thread**:
    1. Parses the input string into terms.
    2. Matches each term against a set of integration rules (Power rule, Trig rules, Exponential rule).
    3. Constructs the result string representing the indefinite integral $\int f(x) dx$.
    4. Compiles the result into a JavaScript function to evaluate definite integrals $\int_a^b f(x) dx = F(b) - F(a)$.
- **Main Thread**: Handles input and displays the symbolic result and numeric evaluation.

## Features

- **Rule-Based**: Supports polynomials ($x^n$), trigonometric functions ($\sin x, \cos x$), and exponentials ($e^x$).
- **Definite Integration**: Uses the Fundamental Theorem of Calculus to compute the area under the curve.
- **Safe Evaluation**: The worker generates safe evaluation code for the resulting function.

## Usage

1. Open `index.html`.
2. Enter an expression like `3*x^2 + 2*x + 5`.
3. Click "Integrate".
4. See the result: `x^3 + x^2 + 5x + C`.
5. Enter limits (e.g., 0 to 1) and click "Evaluate Definite Integral" to get the numerical area.
