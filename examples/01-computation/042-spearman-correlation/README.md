# #042 Spearman Rank Correlation

## Overview

A Web Worker implementation for calculating Spearman's rank correlation coefficient (ρ), measuring monotonic relationships between variables using rank transformation.

## What is Spearman Correlation?

Spearman's rank correlation measures the strength and direction of the monotonic relationship between two variables. Unlike Pearson correlation, it doesn't assume linearity and works with ordinal data.

## Features

| Feature | Description |
|---------|-------------|
| Rank Transformation | Converts values to ranks |
| Tie Handling | Average rank for tied values |
| Detailed View | Step-by-step rank calculation table |
| Significance Testing | t-statistic calculation |
| Data Generation | Generate various relationship types |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with Spearman algorithm |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation mode
2. Enter paired data for X and Y variables
3. Click "Calculate Spearman ρ"

## Formula

### Without Ties (Simplified)

```
ρ = 1 - (6 × Σdᵢ²) / (n × (n² - 1))

where dᵢ = rank(xᵢ) - rank(yᵢ)
```

### With Ties (Pearson on Ranks)

```
ρ = Σ(Rₓ - R̄ₓ)(Rᵧ - R̄ᵧ) / √(Σ(Rₓ - R̄ₓ)² × Σ(Rᵧ - R̄ᵧ)²)
```

## Ranking Process

1. Sort values while tracking original positions
2. Assign ranks 1 to n
3. For ties, assign average rank
4. Calculate rank differences

### Example with Ties

| Value | Sorted | Rank |
|-------|--------|------|
| 5 | 2 | 1 |
| 2 | 3 | 2 |
| 3 | 3 | 2 |
| 3 | 5 | 4 |

Ties at value 3: positions 2 and 3 → average rank = 2.5

## Interpretation Guide

| ρ Value | Strength |
|---------|----------|
| +0.9 to +1.0 | Very Strong Positive |
| +0.7 to +0.9 | Strong Positive |
| +0.5 to +0.7 | Moderate Positive |
| +0.3 to +0.5 | Weak Positive |
| -0.3 to +0.3 | Negligible |
| -0.5 to -0.3 | Weak Negative |
| -0.7 to -0.5 | Moderate Negative |
| -0.9 to -0.7 | Strong Negative |
| -1.0 to -0.9 | Very Strong Negative |

## Spearman vs Pearson

| Aspect | Spearman | Pearson |
|--------|----------|---------|
| Relationship Type | Monotonic | Linear |
| Data Type | Ordinal or continuous | Continuous |
| Outlier Sensitivity | Robust | Sensitive |
| Distribution | Non-parametric | Assumes normality |

## When to Use Spearman

- Ordinal data (rankings, Likert scales)
- Non-linear but monotonic relationships
- Data with outliers
- Non-normal distributions
- Small sample sizes

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 1,000 | < 5ms |
| 10,000 | < 20ms |
| 100,000 | < 150ms |
| 1,000,000 | < 1.5s |

## Significance Testing

Test if correlation significantly differs from zero:

```
t = ρ × √((n-2) / (1-ρ²))

df = n - 2
```

## Use Cases

- **Education**: Test score correlations
- **Psychology**: Survey response analysis
- **Economics**: Income vs happiness rankings
- **Quality Control**: Preference ranking analysis
- **Sports**: Performance rankings correlation

## Browser Support

All modern browsers with Web Worker support.

## References

- [Spearman's Rank Correlation](https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient)
- [Ranking (Statistics)](https://en.wikipedia.org/wiki/Ranking)

## License

MIT License
