# #023 Infinite Product Calculator

## Overview

A Web Worker implementation for calculating famous infinite products that converge to mathematical constants like π.

## Supported Products

### Predefined Products

| Product | Formula | Converges To |
|---------|---------|--------------|
| Wallis | ∏(4k²/(4k²-1)) | π/2 |
| Vieta | ∏cos(π/2^k) | 2/π |
| Euler Sine | ∏(1-x²/(k²π²)) | sin(x)/x |
| Simple | ∏(1+1/k²) | sinh(π)/π |
| Telescoping | ∏(1-1/k²) | 1/2 |
| Inverse e | ∏(k/(k+1))^k | 1/e |
| Catalan-like | ∏(1-1/(4k²)) | 2/π |
| Pentagonal | ∏(1-x^k) | Euler φ function |

### Custom Products

Enter any expression using `k` as the variable:
- `(2*k)/(2*k-1) * (2*k)/(2*k+1)` - Wallis variant
- `1 - 1/(k*k)` - Telescoping
- `(k+1)/k` - Divergent

## Features

- **Multiple Famous Products**: Wallis, Vieta, Euler, and more
- **Custom Expressions**: Define your own product
- **Convergence Comparison**: Compare with known limits
- **Term Display**: Shows factors and partial products

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with product calculations |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select predefined product or custom expression
2. Set parameters (if applicable)
3. Enter number of terms
4. Click "Calculate"

## Famous Products

### Wallis Product (1655)

```
π/2 = (2/1)(2/3)(4/3)(4/5)(6/5)(6/7)...
    = ∏(4k²/(4k²-1))
```

### Vieta's Formula (1593)

```
2/π = √(1/2) · √(1/2 + 1/2·√(1/2)) · √(1/2 + 1/2·√(1/2 + 1/2·√(1/2)))...
    = ∏cos(π/2^k)
```

### Euler's Product for Sine

```
sin(x)/x = ∏(1 - x²/(n²π²))
```

## Technical Details

### Convergence Rate

| Product | n=100 Error | n=10000 Error |
|---------|-------------|---------------|
| Wallis | ~0.8% | ~0.008% |
| Vieta | ~10^-30 | Machine precision |
| Telescoping | Exact after n terms | Exact |

### Performance

| Terms | Approximate Time |
|-------|------------------|
| 1,000 | < 5ms |
| 100,000 | < 100ms |
| 1,000,000 | < 1s |

## Browser Support

All modern browsers with Web Worker support.

## References

- [Wallis Product - Wikipedia](https://en.wikipedia.org/wiki/Wallis_product)
- [Vieta's Formula - Wikipedia](https://en.wikipedia.org/wiki/Vi%C3%A8te%27s_formula)
- [Infinite Product - Wikipedia](https://en.wikipedia.org/wiki/Infinite_product)

## License

MIT License
