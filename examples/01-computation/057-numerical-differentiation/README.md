# #057 Numerical Differentiation

## Overview

A Web Worker implementation for numerical differentiation using various finite difference methods, including forward, backward, central differences, and Richardson extrapolation.

## What is Numerical Differentiation?

Numerical differentiation approximates the derivative of a function from discrete data points using finite difference formulas.

## Features

| Feature | Description |
|---------|-------------|
| Forward Difference | First-order accurate O(h) |
| Backward Difference | First-order accurate O(h) |
| Central Difference | Second-order accurate O(h²) |
| Higher-Order Derivatives | Up to 4th derivative |
| Richardson Extrapolation | Fourth-order accurate O(h⁴) |
| Method Comparison | Compare all methods |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with differentiation algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select differentiation method
2. Enter data values or use sample functions
3. Set step size h
4. Click "Differentiate"

## Finite Difference Formulas

### First Derivative

| Method | Formula | Accuracy |
|--------|---------|----------|
| Forward | [f(x+h) - f(x)] / h | O(h) |
| Backward | [f(x) - f(x-h)] / h | O(h) |
| Central | [f(x+h) - f(x-h)] / 2h | O(h²) |
| Five-Point | [-f(x+2h) + 8f(x+h) - 8f(x-h) + f(x-2h)] / 12h | O(h⁴) |

### Second Derivative

```
f''(x) ≈ [f(x+h) - 2f(x) + f(x-h)] / h²
```

Accuracy: O(h²)

### Higher Derivatives

Third derivative:
```
f'''(x) ≈ [f(x+2h) - 2f(x+h) + 2f(x-h) - f(x-2h)] / 2h³
```

## Richardson Extrapolation

Combines estimates with different step sizes for improved accuracy:

```
D(h)_improved = [4D(h) - D(2h)] / 3
```

This eliminates the leading error term, improving O(h²) to O(h⁴).

## Error Analysis

### Truncation Error

From Taylor series:
- Forward/Backward: Error ∝ h
- Central: Error ∝ h²
- Five-Point: Error ∝ h⁴

### Round-off Error

- Smaller h → larger round-off error
- Optimal h depends on machine precision

### Total Error

```
Total Error = Truncation Error + Round-off Error
```

Optimal h ≈ ε^(1/3) for central difference, where ε is machine epsilon.

## Sample Functions

| Function | Description |
|----------|-------------|
| Sine Wave | sin(2πx) |
| Polynomial | x³ - 2x² + x |
| Exponential | e^(-x/20) |
| Gaussian | e^(-x²/2) |

## Performance

| Method | Complexity | Typical Time (1000 pts) |
|--------|------------|------------------------|
| Forward | O(n) | < 5ms |
| Central | O(n) | < 5ms |
| Higher-Order | O(n×order) | < 20ms |
| Richardson | O(n) | < 10ms |
| Compare All | O(n) | < 20ms |

## Applications

- **Physics**: Velocity, acceleration from position data
- **Finance**: Rate of change in stock prices
- **Engineering**: Slope analysis, signal processing
- **Image Processing**: Edge detection
- **Optimization**: Gradient computation

## Choosing Step Size

**Too large h:**
- High truncation error
- Poor approximation

**Too small h:**
- High round-off error
- Numerical instability

**Optimal:**
- h ≈ ε^(1/2) for forward difference
- h ≈ ε^(1/3) for central difference

## Browser Support

All modern browsers with Web Worker support.

## References

- [Numerical Differentiation](https://en.wikipedia.org/wiki/Numerical_differentiation)
- [Finite Difference](https://en.wikipedia.org/wiki/Finite_difference)
- [Richardson Extrapolation](https://en.wikipedia.org/wiki/Richardson_extrapolation)

## License

MIT License
