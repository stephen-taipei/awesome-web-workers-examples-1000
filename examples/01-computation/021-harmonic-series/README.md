# #021 Harmonic Series Calculator

## Overview

A Web Worker implementation for calculating harmonic series and related sums with high precision using Kahan summation algorithm.

## Harmonic Numbers

The n-th harmonic number is defined as:
```
H(n) = 1 + 1/2 + 1/3 + ... + 1/n = Σ(1/k) for k=1 to n
```

### Key Properties

- **Asymptotic**: H(n) ≈ ln(n) + γ (Euler-Mascheroni constant γ ≈ 0.5772156649)
- **Divergence**: The harmonic series diverges (grows without bound)
- **Growth Rate**: Very slow - need ~10^43 terms to reach H(n) = 100

## Features

- **Standard Harmonic**: H(n) = Σ(1/k)
- **Generalized Harmonic**: H(n,m) = Σ(1/k^m)
- **Alternating Harmonic**: 1 - 1/2 + 1/3 - ... → ln(2)
- **Sequence Display**: Show H(1), H(2), ..., H(n)
- **Target Finding**: Find n where H(n) first exceeds target
- **Kahan Summation**: Reduces floating-point errors

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter number of terms (or target value)
3. Click "Calculate"

## Technical Details

### Kahan Summation

The implementation uses Kahan summation to minimize floating-point errors:
```javascript
let sum = 0, c = 0;
for (let k = 1; k <= n; k++) {
    const y = 1/k - c;
    const t = sum + y;
    c = (t - sum) - y;
    sum = t;
}
```

### Performance

| n | Type | Time |
|---|------|------|
| 1,000,000 | Harmonic | < 50ms |
| 10,000,000 | Harmonic | < 500ms |
| 100,000,000 | Harmonic | < 5s |

## Browser Support

All modern browsers with Web Worker support.

## References

- [Harmonic Number - Wikipedia](https://en.wikipedia.org/wiki/Harmonic_number)
- [Kahan Summation - Wikipedia](https://en.wikipedia.org/wiki/Kahan_summation_algorithm)

## License

MIT License
