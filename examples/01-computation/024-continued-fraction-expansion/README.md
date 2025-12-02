# #024 Continued Fraction Expansion

## Overview

A Web Worker implementation for converting numbers to their continued fraction representation.

## Continued Fraction Notation

A continued fraction represents a number as:
```
a₀ + 1/(a₁ + 1/(a₂ + 1/(a₃ + ...)))
```

Written in compact notation: `[a₀; a₁, a₂, a₃, ...]`

## Features

### Input Types

| Type | Description | Example |
|------|-------------|---------|
| Decimal | Floating-point number | 3.14159265 |
| Rational | Fraction p/q | 355/113 |
| Constant | Mathematical constant | π, e, φ, √2, √3, √5 |

### Output

- **CF Notation**: Compact continued fraction representation
- **Convergents**: Rational approximations p/q
- **Error Analysis**: Difference from original value

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with CF algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select input type (decimal, rational, or constant)
2. Enter the value
3. Set maximum terms
4. Click "Convert to CF"

## Algorithm

### Euclidean Algorithm for Rationals

```
For p/q:
while q ≠ 0:
    a = floor(p/q)
    coefficients.push(a)
    p, q = q, p - a*q
```

### Decimal Expansion

```
For x:
while terms < max:
    a = floor(x)
    coefficients.push(a)
    x = 1/(x - a)
```

## Examples

| Number | CF Representation |
|--------|-------------------|
| 3.14159... (π) | [3; 7, 15, 1, 292, ...] |
| 1.41421... (√2) | [1; 2, 2, 2, ...] |
| 1.61803... (φ) | [1; 1, 1, 1, ...] |
| 2.71828... (e) | [2; 1, 2, 1, 1, 4, ...] |
| 355/113 | [3; 7, 16] |

## Properties

### Periodic CFs

Quadratic irrationals have eventually periodic CFs:
- √2 = [1; 2̄] (period 1)
- √3 = [1; 1, 2̄] (period 2)
- φ = [1; 1̄] (simplest periodic CF)

### Best Rational Approximations

Convergents give the best rational approximations:
- π ≈ 3/1, 22/7, 333/106, 355/113, ...

## Technical Details

### BigInt Support

Uses BigInt for exact rational arithmetic, avoiding floating-point errors.

### Precision

| Input | Terms | Precision |
|-------|-------|-----------|
| Decimal | 20 | ~15 digits |
| Rational | Exact | Exact |
| Constants | 50+ | JavaScript precision |

## Browser Support

All modern browsers with Web Worker and BigInt support.

## References

- [Continued Fraction - Wikipedia](https://en.wikipedia.org/wiki/Continued_fraction)
- [Convergent - Wikipedia](https://en.wikipedia.org/wiki/Continued_fraction#Convergents)
- [Periodic CF - Wikipedia](https://en.wikipedia.org/wiki/Periodic_continued_fraction)

## License

MIT License
