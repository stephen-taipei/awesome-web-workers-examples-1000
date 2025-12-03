# #058 Numerical Integration

## Overview

A Web Worker implementation for numerical integration (quadrature) using various methods including Rectangle, Trapezoidal, Simpson's, Romberg, and Adaptive methods.

## What is Numerical Integration?

Numerical integration approximates definite integrals from discrete data points when analytical solutions are difficult or impossible to compute.

## Features

| Feature | Description |
|---------|-------------|
| Rectangle Rule | Left, Right, and Midpoint variants |
| Trapezoidal Rule | Second-order accurate O(h²) |
| Simpson's Rule | Fourth-order accurate O(h⁴) |
| Simpson's 3/8 | Alternative fourth-order method |
| Boole's Rule | Sixth-order accurate O(h⁶) |
| Romberg Integration | Richardson extrapolation |
| Adaptive Simpson | Error-controlled subdivision |
| Method Comparison | Compare all methods at once |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with integration algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select integration method
2. Enter function values or load a sample function
3. Set integration bounds [a, b]
4. Click "Integrate"

## Integration Formulas

### Rectangle Rule

| Variant | Formula | Accuracy |
|---------|---------|----------|
| Left | h × Σf(xᵢ) | O(h) |
| Right | h × Σf(xᵢ₊₁) | O(h) |
| Midpoint | h × Σf(xᵢ + h/2) | O(h²) |

### Trapezoidal Rule

```
∫f(x)dx ≈ h/2 × [f(x₀) + 2f(x₁) + 2f(x₂) + ... + 2f(xₙ₋₁) + f(xₙ)]
```

Accuracy: O(h²)

### Simpson's 1/3 Rule

```
∫f(x)dx ≈ h/3 × [f₀ + 4f₁ + 2f₂ + 4f₃ + 2f₄ + ... + 4fₙ₋₁ + fₙ]
```

Requires even number of intervals. Accuracy: O(h⁴)

### Simpson's 3/8 Rule

```
∫f(x)dx ≈ 3h/8 × [f₀ + 3f₁ + 3f₂ + 2f₃ + 3f₄ + 3f₅ + 2f₆ + ...]
```

Requires intervals divisible by 3. Accuracy: O(h⁴)

### Boole's Rule

```
∫f(x)dx ≈ 2h/45 × [7f₀ + 32f₁ + 12f₂ + 32f₃ + 14f₄ + ...]
```

Requires intervals divisible by 4. Accuracy: O(h⁶)

## Romberg Integration

Uses Richardson extrapolation to improve trapezoidal estimates:

```
R[i,j] = (4ʲ × R[i,j-1] - R[i-1,j-1]) / (4ʲ - 1)
```

The Romberg table progressively improves accuracy:
- R[i,0]: Trapezoidal estimates
- R[i,1]: Simpson's accuracy
- R[i,2]: Boole's accuracy
- Higher columns: Even higher-order accuracy

## Adaptive Integration

Recursive subdivision with error control:

1. Compute integral on whole interval
2. Split and compute on subintervals
3. If error > tolerance, subdivide further
4. Combine results for final estimate

## Error Analysis

| Method | Error Order | Notes |
|--------|------------|-------|
| Left/Right Rectangle | O(h) | First-order |
| Midpoint | O(h²) | Second-order |
| Trapezoidal | O(h²) | Second-order |
| Simpson's | O(h⁴) | Fourth-order |
| Boole's | O(h⁶) | Sixth-order |
| Romberg (k levels) | O(h²ᵏ) | Adaptive |

## Sample Functions

| Function | Description |
|----------|-------------|
| Sine | sin(x) |
| Polynomial | x³ - 2x² + x |
| Exponential | e^(-x/5) |
| Gaussian | e^(-x²/2) |
| Square Root | √(|x| + 0.1) |

## Performance

| Method | Complexity | Typical Time (100 pts) |
|--------|------------|------------------------|
| Rectangle | O(n) | < 1ms |
| Trapezoidal | O(n) | < 1ms |
| Simpson's | O(n) | < 1ms |
| Romberg | O(n × levels) | < 5ms |
| Adaptive | O(n × subdivisions) | < 10ms |
| Compare All | O(n) | < 5ms |

## Applications

- **Physics**: Work, energy, displacement calculations
- **Engineering**: Area under curves, signal processing
- **Statistics**: Probability distributions, expected values
- **Finance**: Present value calculations, cumulative returns
- **Computer Graphics**: Arc length, volume computation

## Choosing a Method

**Low accuracy needed:**
- Rectangle (fast, simple)
- Trapezoidal (slightly better)

**Moderate accuracy:**
- Simpson's (good balance of speed/accuracy)

**High accuracy needed:**
- Romberg (adaptively improves)
- Adaptive Simpson (error-controlled)

**Unknown smoothness:**
- Adaptive methods handle discontinuities better

## Browser Support

All modern browsers with Web Worker support.

## References

- [Numerical Integration](https://en.wikipedia.org/wiki/Numerical_integration)
- [Simpson's Rule](https://en.wikipedia.org/wiki/Simpson%27s_rule)
- [Romberg's Method](https://en.wikipedia.org/wiki/Romberg%27s_method)

## License

MIT License
