# Example 940: L-System Fractal Generator

This example generates **Lindenmayer System (L-System)** strings in a Web Worker to create fractal patterns.

## Description

L-Systems are a parallel rewriting system and a type of formal grammar. They are famous for modeling the growth processes of plant development and generating self-similar fractals.
- **Worker Thread**: Iteratively applies string rewriting rules (e.g., `F -> F+F-F-F+F`) to an initial axiom string. This string can grow exponentially in length.
- **Main Thread**: Interprets the resulting string as "Turtle Graphics" commands (Forward, Turn Left, Turn Right, Push, Pop) to draw the fractal on a Canvas.

## Features

- **Grammar Expansion**: Handles the string manipulation logic off the main thread.
- **Presets**: Includes "Fractal Plant", "Dragon Curve", and "Sierpinski Triangle".
- **Custom Rules**: Allows defining custom Axioms and Rules (JSON format).

## Usage

1. Open `index.html`.
2. Select a "Preset" to see standard fractals.
3. Adjust "Iterations" (Be careful! String length grows fast).
4. Click "Generate".
5. Select "Custom" to experiment with your own grammar rules.
