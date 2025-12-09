# #037 Percentile Calculator

## Overview

A Web Worker implementation for calculating percentiles using various interpolation methods for large datasets.

## What are Percentiles?

A percentile indicates the value below which a given percentage of observations fall. For example, the 90th percentile (P90) is the value below which 90% of data falls.

## Features

| Feature | Description |
|---------|-------------|
| Single Percentile | Calculate any specific percentile |
| Multiple Percentiles | Calculate several percentiles at once |
| Percentile Rank | Find what percentile a value corresponds to |
| Percentile Range | Get values between two percentiles |
| All Percentiles | Calculate P1 through P99 |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with percentile algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter data or generate randomly
3. Choose interpolation method
4. Click "Calculate Percentile"

## Interpolation Methods

Different methods for calculating percentiles when the exact position falls between data points:

| Method | Description | Used By |
|--------|-------------|---------|
| Linear | Linear interpolation | R (type 7), default |
| Nearest | Nearest rank | Excel PERCENTILE.INC |
| Lower | Floor index | numpy 'lower' |
| Higher | Ceil index | numpy 'higher' |
| Midpoint | Average of lower/higher | numpy 'midpoint' |
| Exclusive | (n+1)*p formula | R (type 6) |
| Inclusive | n*p - 0.5 formula | R (type 5) |

### Linear Interpolation (Default)

```javascript
function linearPercentile(sorted, p) {
    const n = sorted.length;
    const h = (n - 1) * p;
    const hFloor = Math.floor(h);
    return sorted[hFloor] + (h - hFloor) * (sorted[hFloor + 1] - sorted[hFloor]);
}
```

## Percentile Rank

The percentile rank of a value indicates what percentage of data falls below it:

```javascript
// Strict: percentage strictly below
strictRank = (countBelow / n) * 100

// Weak: percentage at or below
weakRank = ((countBelow + countEqual) / n) * 100

// Mean: average of strict and weak
meanRank = ((countBelow + 0.5 * countEqual) / n) * 100
```

## Common Percentiles

| Percentile | Name | Use Case |
|------------|------|----------|
| P1, P99 | Extreme values | Outlier detection |
| P5, P95 | Confidence bounds | Statistical inference |
| P10, P90 | Decile boundaries | Distribution tails |
| P25, P75 | Quartiles | Box plots, IQR |
| P50 | Median | Central tendency |

## Supported Distributions

| Distribution | Description |
|--------------|-------------|
| Uniform | Equal probability |
| Normal | Bell curve |
| Exponential | Right-skewed |
| Pareto | Heavy-tailed |

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 100,000 | < 30ms |
| 1,000,000 | < 200ms |
| 10,000,000 | < 2s |

## Use Cases

### Performance Monitoring

- P99 latency: 99% of requests complete within this time
- P95/P99.9: SLA definitions

### Test Scores

- "Your score is in the 85th percentile"
- Means 85% of test takers scored lower

### Data Analysis

- Understanding distribution shape
- Identifying outliers
- Comparing distributions

### Financial Analysis

- VaR (Value at Risk) at various percentiles
- Income distribution analysis

## Relationship to Quartiles

| Quartile | Percentile |
|----------|------------|
| Q1 | P25 |
| Q2 (Median) | P50 |
| Q3 | P75 |

## Browser Support

All modern browsers with Web Worker support.

## References

- [Percentile - Wikipedia](https://en.wikipedia.org/wiki/Percentile)
- [Quantile Functions](https://en.wikipedia.org/wiki/Quantile_function)
- [R Quantile Types](https://www.rdocumentation.org/packages/stats/topics/quantile)

## License

MIT License
