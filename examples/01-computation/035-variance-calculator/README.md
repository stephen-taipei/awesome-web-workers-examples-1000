# #035 Variance Calculator

## Overview

A Web Worker implementation for calculating variance using the two-pass algorithm for numerical stability with large datasets.

## What is Variance?

Variance measures how far a set of numbers is spread out from their average value. It's the average of squared deviations from the mean.

```
Variance = Average of (each value - mean)²
```

## Features

| Feature | Description |
|---------|-------------|
| Two-Pass Algorithm | Accurate calculation avoiding cancellation |
| Population σ² | Variance for entire population |
| Sample s² | Unbiased estimate from sample |
| SS Components | Sum of squares breakdown |
| ANOVA | Between/within group variance |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with variance algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter data or configure groups
3. For ANOVA, enter groups (one per line)
4. Click "Calculate Variance"

## Two-Pass Algorithm

### Why Two Passes?

Single-pass formula `E[X²] - E[X]²` can suffer from catastrophic cancellation when variance is small relative to the mean.

### Algorithm

```javascript
function twoPassVariance(data) {
    // Pass 1: Calculate mean
    let sum = 0;
    for (const x of data) sum += x;
    const mean = sum / data.length;

    // Pass 2: Calculate sum of squared deviations
    let sumSquaredDev = 0;
    for (const x of data) {
        const dev = x - mean;
        sumSquaredDev += dev * dev;
    }

    return sumSquaredDev / data.length;  // or /(n-1) for sample
}
```

## Formulas

### Population Variance (σ²)

```
σ² = Σ(xᵢ - μ)² / N
```

Use when you have data for the entire population.

### Sample Variance (s²)

```
s² = Σ(xᵢ - x̄)² / (n-1)
```

Use when estimating from a sample. The (n-1) divisor is Bessel's correction for unbiased estimation.

### Relationship

```
s² = σ² × (N / (N-1))
```

## ANOVA (Analysis of Variance)

Partitions total variance into components:

### Sum of Squares

| Component | Formula | Meaning |
|-----------|---------|---------|
| SS Total | Σ(xᵢ - x̄)² | Total variation |
| SS Between | Σnⱼ(x̄ⱼ - x̄)² | Between groups |
| SS Within | ΣΣ(xᵢⱼ - x̄ⱼ)² | Within groups |

### F Ratio

```
F = MS_between / MS_within
  = (SS_between/df_between) / (SS_within/df_within)
```

Large F suggests significant difference between groups.

### Intraclass Correlation (ICC)

```
ICC = (MS_between - MS_within) / (MS_between + (k-1)×MS_within)
```

Measures proportion of variance due to group membership.

## Theoretical Variances

| Distribution | Variance |
|--------------|----------|
| Uniform [a,b] | (b-a)²/12 |
| Normal | σ² |
| Exponential | 1/λ² |
| Chi-squared | 2×df |
| Poisson | λ |

## Variance vs Standard Deviation

| Property | Variance | Standard Deviation |
|----------|----------|-------------------|
| Units | Squared | Same as data |
| Symbol | σ², s² | σ, s |
| Additivity | σ²(X+Y) = σ²(X) + σ²(Y) | No simple rule |
| Interpretation | Less intuitive | More intuitive |

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 100,000 | < 30ms |
| 1,000,000 | < 200ms |
| 10,000,000 | < 2s |

## Use Cases

- **Quality Control**: Process variability analysis
- **Finance**: Portfolio risk assessment
- **Research**: Measurement precision
- **Manufacturing**: Tolerance analysis
- **Statistics**: Hypothesis testing (ANOVA)

## Numerical Considerations

### Problem with Naive Formula

```
Var = E[X²] - E[X]²
```

For data [10000001, 10000002, 10000003]:
- True variance = 0.667
- Naive method may give 0 or negative due to precision loss

### Two-Pass Solution

Subtracting mean first keeps numbers small, preserving precision.

## Browser Support

All modern browsers with Web Worker support.

## References

- [Variance - Wikipedia](https://en.wikipedia.org/wiki/Variance)
- [Analysis of Variance](https://en.wikipedia.org/wiki/Analysis_of_variance)
- [Algorithms for Variance](https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance)

## License

MIT License
