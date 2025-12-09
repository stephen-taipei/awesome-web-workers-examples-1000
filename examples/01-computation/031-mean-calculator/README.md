# #031 Mean Calculator

## Overview

A Web Worker implementation for calculating various types of means for large datasets with high precision.

## Types of Means

### Arithmetic Mean (Average)

The most common mean, sum divided by count:
```
AM = (x₁ + x₂ + ... + xₙ) / n
```

### Geometric Mean

Product raised to 1/n power, best for growth rates:
```
GM = (x₁ × x₂ × ... × xₙ)^(1/n)
```

### Harmonic Mean

Reciprocal of arithmetic mean of reciprocals, best for rates:
```
HM = n / (1/x₁ + 1/x₂ + ... + 1/xₙ)
```

### Weighted Mean

Values weighted by importance:
```
WM = (w₁x₁ + w₂x₂ + ...) / (w₁ + w₂ + ...)
```

### Trimmed Mean

Remove outliers before averaging:
```
Remove top/bottom p%, then calculate AM
```

## Features

| Feature | Description |
|---------|-------------|
| Multiple Types | Arithmetic, Geometric, Harmonic, Weighted, Trimmed |
| Large Data | Handles millions of data points |
| Precision | Kahan summation for accuracy |
| Random Generation | Generate data with various distributions |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with mean calculations |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select mean type
2. Enter data manually or generate randomly
3. For weighted mean, provide weights
4. Click "Calculate"

## Supported Distributions

| Distribution | Parameters | Use Case |
|--------------|------------|----------|
| Uniform | min, max | Equal probability |
| Normal | mean, stdDev | Natural phenomena |
| Exponential | lambda | Wait times |
| Poisson | lambda | Count events |

## Mean Inequalities

For positive numbers:
```
AM ≥ GM ≥ HM
```

Equality holds only when all values are equal.

### Example

For values 1, 4, 4:
- AM = (1 + 4 + 4) / 3 = 3
- GM = (1 × 4 × 4)^(1/3) = 2.52
- HM = 3 / (1 + 0.25 + 0.25) = 2

## Algorithm

### Kahan Summation

Compensated summation for better floating-point precision:
```javascript
function kahanSum(arr) {
    let sum = 0, c = 0;
    for (const x of arr) {
        const y = x - c;
        const t = sum + y;
        c = (t - sum) - y;
        sum = t;
    }
    return sum;
}
```

### Log-Sum for Geometric Mean

Avoid overflow by using logarithms:
```javascript
GM = exp((log(x₁) + log(x₂) + ... + log(xₙ)) / n)
```

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 100,000 | < 50ms |
| 1,000,000 | < 200ms |
| 10,000,000 | < 2s |

## Use Cases

### Arithmetic Mean
- Test scores
- Temperatures
- General averages

### Geometric Mean
- Investment returns
- Population growth
- Compound interest

### Harmonic Mean
- Average speeds
- Price-earnings ratios
- Parallel resistances

### Weighted Mean
- GPA calculation
- Voting systems
- Portfolio returns

## Output Statistics

Each calculation also provides:
- Count
- Sum
- Min/Max
- Range
- Variance
- Standard Deviation
- Standard Error

## Browser Support

All modern browsers with Web Worker support.

## References

- [Mean - Wikipedia](https://en.wikipedia.org/wiki/Mean)
- [Kahan Summation](https://en.wikipedia.org/wiki/Kahan_summation_algorithm)
- [Inequality of Means](https://en.wikipedia.org/wiki/Inequality_of_arithmetic_and_geometric_means)

## License

MIT License
