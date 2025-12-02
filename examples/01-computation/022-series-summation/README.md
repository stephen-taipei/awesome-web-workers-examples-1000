# #022 Series Summation Calculator

## Overview

A Web Worker implementation for calculating various mathematical series including Taylor expansions, convergent series, and custom expressions.

## Supported Series

### Predefined Series

| Series | Formula | Converges To |
|--------|---------|--------------|
| Geometric | Σr^k | 1/(1-r) for |r|<1 |
| Power | Σk^p | Diverges |
| Exponential | Σx^k/k! | e^x |
| Sine | Σ(-1)^k·x^(2k+1)/(2k+1)! | sin(x) |
| Cosine | Σ(-1)^k·x^(2k)/(2k)! | cos(x) |
| Logarithm | Σ(-1)^(k+1)·x^k/k | ln(1+x) |
| Arctan | Σ(-1)^k·x^(2k+1)/(2k+1) | arctan(x) |
| Basel | Σ1/k² | π²/6 |
| Leibniz | Σ(-1)^k/(2k+1) | π/4 |
| Zeta | Σ1/k^s | ζ(s) |

### Custom Series

Enter any expression using `k` as the variable:
- `1/(k*k)` - Basel problem
- `pow(-1,k)/(2*k+1)` - Leibniz formula
- `1/factorial(k)` - e approximation

## Features

- **Kahan Summation**: High precision accumulation
- **Progress Reporting**: Real-time updates
- **Term Display**: Shows individual terms and partial sums
- **Convergence Info**: Displays theoretical limit

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with series calculations |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select predefined series or custom expression
2. Set parameters (if applicable)
3. Enter number of terms
4. Click "Calculate"

## Technical Details

### Supported Math Functions

For custom expressions:
- `sin`, `cos`, `tan`
- `exp`, `log`, `sqrt`
- `pow`, `abs`
- `PI`, `E`

### Performance

| Terms | Approximate Time |
|-------|------------------|
| 1,000 | < 10ms |
| 100,000 | < 100ms |
| 1,000,000 | < 1s |

## Example Calculations

**Basel Problem (π²/6)**:
```
n=1000: 1.643934566681562
π²/6 = 1.644934066848226
Error ≈ 0.001
```

**Leibniz (π/4)**:
```
n=10000: 0.785348163397449
π/4 = 0.785398163397448
Error ≈ 0.00005
```

## Browser Support

All modern browsers with Web Worker support.

## References

- [Taylor Series - Wikipedia](https://en.wikipedia.org/wiki/Taylor_series)
- [Basel Problem - Wikipedia](https://en.wikipedia.org/wiki/Basel_problem)

## License

MIT License
