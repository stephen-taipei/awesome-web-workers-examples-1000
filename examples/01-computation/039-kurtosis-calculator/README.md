# #039 Kurtosis Calculator

## Overview

A Web Worker implementation for calculating distribution kurtosis using fourth moment analysis, measuring tail heaviness and peakedness.

## What is Kurtosis?

Kurtosis measures the "tailedness" of a probability distribution - specifically, how heavy or light the tails are compared to a normal distribution, and how peaked or flat the center is.

## Features

| Feature | Description |
|---------|-------------|
| Excess Kurtosis | Fisher's kurtosis (normal = 0) |
| Pearson's β₂ | Raw fourth moment ratio (normal = 3) |
| Adjusted G₂ | Bias-corrected sample kurtosis |
| Quartile Kurtosis | Robust measure using percentiles |
| Statistical Testing | Z-score and standard error |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with kurtosis algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter data or generate from distributions
3. Click "Calculate Kurtosis"

## Kurtosis Types

### Mesokurtic (Normal-like)
- Excess kurtosis ≈ 0
- Normal distribution tails
- Example: Normal distribution

### Leptokurtic (Heavy-tailed)
- Excess kurtosis > 0
- Heavier tails than normal
- More outliers expected
- Sharper peak
- Examples: Laplace, Student's t, Exponential

### Platykurtic (Light-tailed)
- Excess kurtosis < 0
- Lighter tails than normal
- Fewer outliers expected
- Flatter peak
- Example: Uniform distribution

## Formulas

### Pearson's Kurtosis (β₂)

```
β₂ = m₄ / σ⁴

where m₄ = (1/n) Σ(xᵢ - μ)⁴
```

### Excess Kurtosis (g₂)

```
g₂ = β₂ - 3
```

The subtraction of 3 normalizes so that normal distribution = 0.

### Adjusted Sample Kurtosis (G₂)

```
G₂ = ((n+1)n(n-1)) / ((n-2)(n-3)) × (m₄/(m₂²/n)) - 3(n-1)²/((n-2)(n-3))
```

## Theoretical Values

| Distribution | Excess Kurtosis |
|--------------|-----------------|
| Normal | 0 |
| Uniform | -1.2 |
| Laplace | 3 |
| Exponential | 6 |
| Student's t (df) | 6/(df-4) for df > 4 |
| Logistic | 1.2 |

## Interpretation Guidelines

| Excess Kurtosis | Interpretation |
|-----------------|----------------|
| < -1 | Highly platykurtic |
| -1 to -0.5 | Moderately platykurtic |
| -0.5 to 0.5 | Approximately normal |
| 0.5 to 1 | Moderately leptokurtic |
| > 1 | Highly leptokurtic |

## Visual Comparison

```
Platykurtic          Mesokurtic          Leptokurtic
(Light tails)        (Normal)            (Heavy tails)

    ▄▄▄▄▄▄▄▄▄            ▄▄▄                 ▄
   ██████████          ▄█████▄             ▄███▄
  ████████████        ▄███████▄           ▄█████▄
 ██████████████      █████████████       ███████████
```

## Statistical Significance

Test if kurtosis differs from normal:

```
Z = G₂ / SE

SE = √(24n(n-1)² / ((n-3)(n-2)(n+3)(n+5)))
```

If |Z| > 1.96, kurtosis significantly differs from normal at α = 0.05.

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 100,000 | < 30ms |
| 1,000,000 | < 200ms |
| 10,000,000 | < 2s |

## Use Cases

- **Risk Management**: Heavy tails indicate higher tail risk
- **Quality Control**: Detect unusual distributions
- **Finance**: Asset return analysis
- **Data Validation**: Check distribution assumptions
- **Outlier Analysis**: High kurtosis suggests more outliers

## Browser Support

All modern browsers with Web Worker support.

## References

- [Kurtosis - Wikipedia](https://en.wikipedia.org/wiki/Kurtosis)
- [Moment (Mathematics)](https://en.wikipedia.org/wiki/Moment_(mathematics))
- [Fat-tailed Distribution](https://en.wikipedia.org/wiki/Fat-tailed_distribution)

## License

MIT License
