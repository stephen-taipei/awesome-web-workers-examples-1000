# #038 Skewness Calculator

## Overview

A Web Worker implementation for calculating distribution skewness using various methods including Fisher-Pearson, adjusted, Pearson's coefficients, and Bowley's quartile skewness.

## What is Skewness?

Skewness measures the asymmetry of a probability distribution about its mean. It indicates whether data points are concentrated more to one side of the mean.

## Features

| Feature | Description |
|---------|-------------|
| Fisher-Pearson (g1) | Third standardized moment |
| Adjusted (G1) | Bias-corrected sample skewness |
| Pearson's Coefficients | Mode and median-based measures |
| Bowley's Skewness | Quartile-based, robust to outliers |
| Comprehensive Analysis | All measures with interpretation |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with skewness algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter data or generate randomly
3. Click "Calculate Skewness"

## Skewness Interpretation

| Value | Interpretation | Description |
|-------|----------------|-------------|
| < -1 | Highly left-skewed | Long left tail |
| -1 to -0.5 | Moderately left-skewed | Some left asymmetry |
| -0.5 to 0.5 | Approximately symmetric | Near normal |
| 0.5 to 1 | Moderately right-skewed | Some right asymmetry |
| > 1 | Highly right-skewed | Long right tail |

## Skewness Methods

### Fisher-Pearson Coefficient (g1)

Population skewness using the third standardized moment:

```
g1 = m3 / σ³

where:
m3 = (1/n) Σ(xi - μ)³  (third central moment)
σ = population standard deviation
```

### Adjusted Fisher-Pearson (G1)

Sample skewness with bias correction:

```
G1 = g1 × √(n(n-1)) / (n-2)
```

### Pearson's Coefficients

**First Coefficient** (mode-based):
```
Sk1 = (mean - mode) / σ
```

**Second Coefficient** (median-based):
```
Sk2 = 3(mean - median) / σ
```

### Bowley's Quartile Skewness

Robust measure using quartiles:
```
Sk = (Q3 + Q1 - 2Q2) / (Q3 - Q1)
```

Range: -1 to +1

## Visual Interpretation

```
Left-Skewed         Symmetric         Right-Skewed
(Negative)                            (Positive)

    ▄▄▄▄               ▄▄▄               ▄▄▄▄
   ▄█████▄            ▄███▄            ▄█████▄
  ▄████████▄         ▄█████▄          ▄████████▄
▄██████████████   ██████████████   ██████████████▄

Mode < Median < Mean   Equal      Mean < Median < Mode
```

## Theoretical Skewness

| Distribution | Skewness |
|--------------|----------|
| Normal | 0 |
| Uniform | 0 |
| Exponential | 2 |
| Log-Normal(μ,σ) | (e^σ² + 2)√(e^σ² - 1) |
| Chi-squared(k) | √(8/k) |
| Gamma(k,θ) | 2/√k |

## Statistical Significance

Test if skewness differs significantly from zero:

```
Z = G1 / SE

where SE = √(6n(n-1) / ((n-2)(n+1)(n+3)))
```

If |Z| > 1.96, skewness is significant at α = 0.05.

## Related Measures

| Measure | Description |
|---------|-------------|
| Kurtosis | Measures tail heaviness |
| Excess Kurtosis | Kurtosis - 3 (normal = 0) |
| Coefficient of Variation | σ/μ (relative variability) |

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 100,000 | < 30ms |
| 1,000,000 | < 200ms |
| 10,000,000 | < 2s |

## Use Cases

- **Finance**: Return distribution analysis
- **Quality Control**: Process symmetry assessment
- **Demographics**: Income distribution analysis
- **Science**: Measurement distribution characterization
- **Machine Learning**: Feature engineering

## Browser Support

All modern browsers with Web Worker support.

## References

- [Skewness - Wikipedia](https://en.wikipedia.org/wiki/Skewness)
- [Moment (Mathematics)](https://en.wikipedia.org/wiki/Moment_(mathematics))
- [Pearson's Coefficient of Skewness](https://en.wikipedia.org/wiki/Pearson%27s_coefficient_of_skewness)

## License

MIT License
