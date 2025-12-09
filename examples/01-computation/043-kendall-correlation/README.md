# #043 Kendall Tau Correlation

## Overview

A Web Worker implementation for calculating Kendall's tau correlation coefficient using concordant and discordant pair counting.

## What is Kendall Tau?

Kendall's tau measures the ordinal association between two variables by comparing all possible pairs of observations and counting how many are concordant (agree in order) versus discordant (disagree in order).

## Features

| Feature | Description |
|---------|-------------|
| τ-a | Basic tau without tie correction |
| τ-b | Tau with tie correction (recommended) |
| τ-c | Tau for rectangular contingency tables |
| Gamma | Goodman-Kruskal gamma statistic |
| Detailed View | Visual pair-by-pair analysis |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with Kendall algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation mode
2. Enter paired data for X and Y variables
3. Click "Calculate Kendall τ"

## Pair Types

### Concordant Pairs
Both variables change in the same direction:
- If X[j] > X[i] and Y[j] > Y[i], OR
- If X[j] < X[i] and Y[j] < Y[i]

### Discordant Pairs
Variables change in opposite directions:
- If X[j] > X[i] and Y[j] < Y[i], OR
- If X[j] < X[i] and Y[j] > Y[i]

### Tied Pairs
No change in one or both variables:
- X tie: X[j] = X[i]
- Y tie: Y[j] = Y[i]
- Both tie: X[j] = X[i] AND Y[j] = Y[i]

## Formulas

### Kendall's τ-a (No tie correction)

```
τ-a = (C - D) / (n(n-1)/2)

where C = concordant pairs, D = discordant pairs
```

### Kendall's τ-b (With tie correction)

```
τ-b = (C - D) / √((n₀ - n₁)(n₀ - n₂))

where:
n₀ = n(n-1)/2 (total pairs)
n₁ = Σ t(t-1)/2 (ties in X)
n₂ = Σ u(u-1)/2 (ties in Y)
```

### Kendall's τ-c (Stuart's tau-c)

```
τ-c = 2m(C - D) / (n²(m-1))

where m = min(rows, columns)
```

## Interpretation

| τ Value | Interpretation |
|---------|----------------|
| +1.0 | Perfect agreement |
| +0.5 to +1.0 | Strong positive |
| +0.2 to +0.5 | Moderate positive |
| -0.2 to +0.2 | Weak/No association |
| -0.5 to -0.2 | Moderate negative |
| -1.0 to -0.5 | Strong negative |
| -1.0 | Perfect disagreement |

## When to Use Each Variant

| Variant | Best For |
|---------|----------|
| τ-a | No ties in data |
| τ-b | Square tables with ties (most common) |
| τ-c | Rectangular contingency tables |

## Kendall vs Spearman

| Aspect | Kendall | Spearman |
|--------|---------|----------|
| Interpretation | Probability-based | Rank correlation |
| Ties | Better handling | Average ranks |
| Efficiency | More robust | More efficient |
| Sample Size | Better for small | Better for large |

## Complexity

- **Time**: O(n²) - must examine all pairs
- **Space**: O(n)

For n = 10,000: approximately 50 million pair comparisons

## Performance

| Data Points | Pairs | Approximate Time |
|-------------|-------|------------------|
| 100 | 4,950 | < 5ms |
| 1,000 | 499,500 | < 50ms |
| 5,000 | 12,497,500 | < 500ms |
| 10,000 | 49,995,000 | < 2s |

## Use Cases

- **Ordinal Data**: Rating scales, preferences
- **Small Samples**: More reliable than Spearman
- **Tied Data**: Better correction than Spearman
- **Inter-rater Agreement**: Comparing rankings
- **Quality Assessment**: Agreement between judges

## Browser Support

All modern browsers with Web Worker support.

## References

- [Kendall Rank Correlation](https://en.wikipedia.org/wiki/Kendall_rank_correlation_coefficient)
- [Concordance](https://en.wikipedia.org/wiki/Concordant_pair)

## License

MIT License
