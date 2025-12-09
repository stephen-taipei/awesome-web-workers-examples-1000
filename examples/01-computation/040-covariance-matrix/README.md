# #040 Covariance Matrix

## Overview

A Web Worker implementation for calculating covariance matrices, measuring how multiple variables change together.

## What is Covariance?

Covariance measures the joint variability of two random variables. It indicates whether increases in one variable correspond to increases (positive covariance) or decreases (negative covariance) in another variable.

## Features

| Feature | Description |
|---------|-------------|
| Pairwise Covariance | Covariance between two variables |
| Full Matrix | Complete covariance matrix for multiple variables |
| Correlation Matrix | Standardized covariance (Pearson correlation) |
| Matrix Properties | Trace, determinant, eigenvalues |
| Data Generation | Generate correlated random data |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with covariance algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type (pairwise, matrix, or generate)
2. Enter data for each variable
3. Click "Calculate Covariance"

## Formulas

### Population Covariance

```
Cov(X,Y) = Σ(xᵢ - x̄)(yᵢ - ȳ) / n
```

### Sample Covariance

```
Cov(X,Y) = Σ(xᵢ - x̄)(yᵢ - ȳ) / (n-1)
```

### Correlation Coefficient

```
r = Cov(X,Y) / (σₓ × σᵧ)
```

## Covariance Matrix Properties

For a dataset with p variables:

| Property | Description |
|----------|-------------|
| Symmetric | Cov(X,Y) = Cov(Y,X) |
| Diagonal | Variances of each variable |
| Off-diagonal | Covariances between pairs |
| Positive Semi-definite | All eigenvalues ≥ 0 |

## Interpretation

| Covariance | Relationship |
|------------|--------------|
| > 0 | Positive: variables increase together |
| = 0 | No linear relationship |
| < 0 | Negative: one increases, other decreases |

## Correlation Strength

| |r| Value | Interpretation |
|-----------|----------------|
| < 0.1 | Negligible |
| 0.1 - 0.3 | Weak |
| 0.3 - 0.5 | Moderate |
| 0.5 - 0.7 | Strong |
| > 0.7 | Very Strong |

## Matrix Example

For 3 variables:

```
         V1      V2      V3
    ┌─────────────────────────┐
V1  │ Var(1)  Cov12   Cov13  │
V2  │ Cov21   Var(2)  Cov23  │
V3  │ Cov31   Cov32   Var(3) │
    └─────────────────────────┘
```

## Performance

| Data Points | Variables | Approximate Time |
|-------------|-----------|------------------|
| 10,000 | 3 | < 10ms |
| 100,000 | 3 | < 50ms |
| 1,000,000 | 3 | < 300ms |

## Use Cases

- **Portfolio Analysis**: Asset return correlations
- **Feature Engineering**: Variable relationships
- **Risk Management**: Co-movement analysis
- **Dimensionality Reduction**: PCA preprocessing
- **Quality Control**: Process variable monitoring

## Browser Support

All modern browsers with Web Worker support.

## References

- [Covariance - Wikipedia](https://en.wikipedia.org/wiki/Covariance)
- [Covariance Matrix](https://en.wikipedia.org/wiki/Covariance_matrix)
- [Correlation](https://en.wikipedia.org/wiki/Correlation)

## License

MIT License
