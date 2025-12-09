# #025 Continued Fraction Evaluation

## Overview

A Web Worker implementation for evaluating continued fractions back to decimal values with high precision.

## Features

### Evaluation Types

| Type | Description | Example |
|------|-------------|---------|
| Standard | Custom CF coefficients | [1, 2, 2, 2, ...] |
| Periodic | CF with repeating period | [1; 2̄] for √2 |
| Famous | Well-known CF formulas | √2, φ, e, π/4, √N |

### Famous CFs Supported

| Name | CF Form | Value |
|------|---------|-------|
| √2 | [1; 2, 2, 2, ...] | 1.41421... |
| φ (Golden Ratio) | [1; 1, 1, 1, ...] | 1.61803... |
| e | [2; 1, 2, 1, 1, 4, 1, 1, 6, ...] | 2.71828... |
| π/4 | Generalized CF | 0.78539... |
| √N | Computed periodic CF | √N |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with evaluation algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select evaluation type
2. Enter CF coefficients or choose formula
3. Set number of terms
4. Click "Evaluate"

## Algorithm

### Convergent Calculation

Using the recurrence relation:
```
h₋₁ = 1, h₀ = a₀
k₋₁ = 0, k₀ = 1

For n ≥ 1:
hₙ = aₙ·hₙ₋₁ + hₙ₋₂
kₙ = aₙ·kₙ₋₁ + kₙ₋₂

Value = hₙ/kₙ
```

### Generalized CF for e

```
e = 2 + 1/(1 + 1/(2 + 1/(1 + 1/(1 + 1/(4 + ...)))))
Pattern: [2; 1, 2, 1, 1, 4, 1, 1, 6, 1, 1, 8, ...]
```

### Generalized CF for π/4 (Arctan)

```
π/4 = 1/(1 + 1²/(2 + 3²/(2 + 5²/(2 + ...))))
```

## Convergence

| CF | Terms | Accuracy |
|----|-------|----------|
| √2 | 20 | ~12 digits |
| φ | 20 | ~8 digits |
| e | 50 | ~15 digits |
| π/4 | 100 | ~6 digits |

Note: Golden ratio converges slowest due to all-1s coefficients.

## Output

- **Evaluated Value**: Decimal approximation
- **Exact Fraction**: p/q for finite CFs
- **True Value**: For comparison with famous constants
- **Error**: Difference from true value
- **Convergence Table**: Shows how value approaches limit

## Technical Details

### BigInt Arithmetic

Uses BigInt for exact rational arithmetic when computing convergents.

### Precision Handling

```javascript
// Final division using floating point
const value = Number(p) / Number(q);
// Or string representation for very large fractions
```

## Examples

### Standard CF
Input: `[3, 7, 15, 1, 292]`
Output: 103993/33102 ≈ 3.14159265...

### Periodic CF for √7
Input: a₀=2, period=[1,1,1,4], reps=10
Output: ≈ 2.6457513...

## Browser Support

All modern browsers with Web Worker and BigInt support.

## References

- [Continued Fraction - Wikipedia](https://en.wikipedia.org/wiki/Continued_fraction)
- [Generalized CF - Wikipedia](https://en.wikipedia.org/wiki/Generalized_continued_fraction)
- [CF for Pi - Wikipedia](https://en.wikipedia.org/wiki/Continued_fraction#Pi)

## License

MIT License
