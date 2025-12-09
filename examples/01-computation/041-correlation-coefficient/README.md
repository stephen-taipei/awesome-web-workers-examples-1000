# #041 Correlation Coefficient

## Overview

A Web Worker implementation for calculating various correlation coefficients including Pearson, Spearman, and Kendall correlations.

## What is Correlation?

Correlation measures the strength and direction of the relationship between two variables. Values range from -1 (perfect negative correlation) to +1 (perfect positive correlation), with 0 indicating no linear relationship.

## Features

| Feature | Description |
|---------|-------------|
| Pearson Correlation | Linear relationship measure |
| Spearman Correlation | Rank-based monotonic relationship |
| Kendall Tau | Ordinal association with tie handling |
| R-Squared | Coefficient of determination |
| Significance Testing | t-statistic calculation |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with correlation algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select correlation type
2. Enter paired data for X and Y variables
3. Click "Calculate Correlation"

## Correlation Methods

### Pearson Correlation (r)

Measures linear relationship between continuous variables.

```
r = Σ(xᵢ - x̄)(yᵢ - ȳ) / (n × σₓ × σᵧ)
```

**Best for**: Continuous data, linear relationships, normally distributed variables

### Spearman Rank Correlation (ρ)

Measures monotonic relationship using ranks.

```
ρ = 1 - 6Σdᵢ² / (n(n² - 1))

where dᵢ = rank(xᵢ) - rank(yᵢ)
```

**Best for**: Ordinal data, non-linear monotonic relationships, outlier-resistant

### Kendall Tau (τ)

Measures ordinal association based on concordant/discordant pairs.

```
τ = (C - D) / √((n₀ - n₁)(n₀ - n₂))

where C = concordant pairs, D = discordant pairs
```

**Best for**: Small samples, many ties, robust analysis

## Interpretation Guide

| |r| Value | Strength |
|-----------|----------|
| 0.0 - 0.1 | Negligible |
| 0.1 - 0.3 | Weak |
| 0.3 - 0.5 | Moderate |
| 0.5 - 0.7 | Strong |
| 0.7 - 1.0 | Very Strong |

## Visual Representation

```
Positive (r > 0)      No Correlation       Negative (r < 0)
      •  •                  •                   •  •
    •  •                 •    •              •     •
  •  •                  •   •   •          •        •
•  •                     •    •  •       •           •
                           •                          •
```

## R-Squared (Coefficient of Determination)

R² indicates the proportion of variance in Y explained by X:

```
R² = r²
```

| R² Value | Interpretation |
|----------|----------------|
| 0.00 - 0.25 | Weak explanation |
| 0.25 - 0.50 | Moderate explanation |
| 0.50 - 0.75 | Good explanation |
| 0.75 - 1.00 | Excellent explanation |

## Significance Testing

Test if correlation is significantly different from zero:

```
t = r × √(n-2) / √(1-r²)

df = n - 2
```

## When to Use Each Method

| Scenario | Recommended Method |
|----------|-------------------|
| Normal continuous data | Pearson |
| Ordinal/ranked data | Spearman |
| Many ties in data | Kendall |
| Small sample size | Kendall |
| Outlier concerns | Spearman or Kendall |
| Non-linear monotonic | Spearman |

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 1,000 | < 5ms |
| 10,000 | < 20ms |
| 100,000 | < 150ms |
| 1,000,000 | < 1.5s |

Note: Kendall tau is O(n²), slower for large datasets.

## Use Cases

- **Finance**: Asset return correlations
- **Science**: Variable relationship analysis
- **Marketing**: Customer behavior patterns
- **Healthcare**: Clinical variable associations
- **Quality Control**: Process variable relationships

## Browser Support

All modern browsers with Web Worker support.

## References

- [Pearson Correlation](https://en.wikipedia.org/wiki/Pearson_correlation_coefficient)
- [Spearman's Rank Correlation](https://en.wikipedia.org/wiki/Spearman%27s_rank_correlation_coefficient)
- [Kendall Rank Correlation](https://en.wikipedia.org/wiki/Kendall_rank_correlation_coefficient)

## License

MIT License
