# #020 Bernoulli Number Calculator

## Overview

A Web Worker implementation that calculates Bernoulli numbers using the Akiyama-Tanigawa algorithm with exact rational arithmetic.

## Bernoulli Numbers

Bernoulli numbers are a sequence of rational numbers with deep connections to number theory and analysis.

### First Few Values

| n | B(n) | Decimal |
|---|------|---------|
| 0 | 1 | 1.0 |
| 1 | -1/2 | -0.5 |
| 2 | 1/6 | 0.1666... |
| 4 | -1/30 | -0.0333... |
| 6 | 1/42 | 0.0238... |
| 8 | -1/30 | -0.0333... |
| 10 | 5/66 | 0.0757... |

**Note**: All odd-indexed Bernoulli numbers (except B(1)) are zero.

### Applications

- **Taylor Series**: Coefficients in expansions of tan(x), tanh(x)
- **Sum of Powers**: Formula for 1^k + 2^k + ... + n^k
- **Euler-Maclaurin**: Numerical integration formula
- **Riemann Zeta**: ζ(2n) = (-1)^(n+1) × B(2n) × (2π)^(2n) / (2 × (2n)!)

## Features

- **Exact Rational Arithmetic**: Results as fractions (not floating point)
- **Full Sequence**: Calculate B(0) through B(n)
- **Non-Zero Only**: Skip the zero values
- **Single Value**: Calculate specific B(n)
- **Sum of Powers**: Generate coefficient formula
- **Progress Reporting**: Real-time updates

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page with UI |
| `main.js` | Main thread logic and UI handling |
| `worker.js` | Web Worker with Bernoulli algorithms |
| `style.css` | Stylesheet |
| `README.md` | This documentation |

## Usage

1. Select calculation type:
   - **Full Sequence**: All values from B(0) to B(n)
   - **Non-Zero Only**: Only non-zero Bernoulli numbers
   - **Single Value**: Just B(n)
   - **Sum of Powers**: Coefficients for power sum formula

2. Enter the value of n
3. Click "Calculate"

## Technical Details

### Akiyama-Tanigawa Algorithm

This algorithm efficiently computes Bernoulli numbers using a triangular scheme:

```
1. Initialize: A[j] = 1/(j+1) for j = 0, 1, ..., n
2. For m = 0 to n:
   - B(m) = A[0]
   - Update: A[j] = (j+1) × (A[j] - A[j+1])
```

### Rational Arithmetic Class

The implementation uses a custom `Rational` class for exact arithmetic:
- Stores numerator and denominator as BigInt
- Automatically reduces to lowest terms
- Supports add, subtract, multiply, divide
- Converts to decimal with arbitrary precision

### Worker Communication

```javascript
// Main -> Worker
worker.postMessage({
    type: 'sequence' | 'nonzero' | 'single' | 'sumofpowers',
    n: number
});

// Worker -> Main (result)
{
    type: 'result',
    calculationType: string,
    n: number,
    result: Array | Object,
    executionTime: string
}
```

### Performance

| n | Calculation | Approximate Time |
|---|-------------|------------------|
| 30 | Sequence | < 50ms |
| 60 | Sequence | < 200ms |
| 100 | Sequence | < 500ms |
| 200 | Single | < 1s |

### Complexity

- **Time**: O(n²) for computing n Bernoulli numbers
- **Space**: O(n) for the working array

## Sum of Powers Formula

For any positive integer p, the sum 1^p + 2^p + ... + n^p can be expressed using Bernoulli numbers:

```
Σ k^p = (1/(p+1)) × Σ C(p+1,k) × B(k) × n^(p+1-k)
```

## Browser Support

- Chrome 68+
- Firefox 68+
- Safari 14+
- Edge 79+

(Requires BigInt support)

## References

- [Bernoulli Number - Wikipedia](https://en.wikipedia.org/wiki/Bernoulli_number)
- [Akiyama-Tanigawa Algorithm](https://en.wikipedia.org/wiki/Bernoulli_number#Algorithmic_description)
- [OEIS A027641/A027642](https://oeis.org/A027641) - Bernoulli numbers

## License

MIT License
