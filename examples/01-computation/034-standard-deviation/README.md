# #034 Standard Deviation Calculator

## Overview

A Web Worker implementation for calculating standard deviation using Welford's online algorithm for numerical stability with large datasets.

## What is Standard Deviation?

Standard deviation measures the amount of variation or dispersion in a dataset. A low standard deviation indicates values close to the mean, while a high standard deviation indicates values spread over a wider range.

## Features

| Feature | Description |
|---------|-------------|
| Welford's Algorithm | Numerically stable single-pass computation |
| Population σ | Standard deviation for entire population |
| Sample s | Unbiased estimate from sample |
| Grouped Data | Frequency-weighted calculation |
| Pooled Std Dev | Combined estimate from multiple groups |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with std dev algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter data or generate randomly
3. For grouped data, provide values and frequencies
4. Click "Calculate Standard Deviation"

## Welford's Algorithm

A numerically stable, single-pass algorithm:

```javascript
function welfordOnline(data) {
    let count = 0;
    let mean = 0;
    let M2 = 0;

    for (const x of data) {
        count++;
        const delta = x - mean;
        mean += delta / count;
        const delta2 = x - mean;
        M2 += delta * delta2;
    }

    return {
        mean,
        populationVariance: M2 / count,
        sampleVariance: M2 / (count - 1)
    };
}
```

### Why Welford's Algorithm?

Traditional formula: `Σ(x-μ)²` requires two passes and can suffer from catastrophic cancellation.

Welford's advantages:
- Single pass through data
- Numerically stable
- Can be updated incrementally
- Works with streaming data

## Formulas

### Population Standard Deviation (σ)

```
σ = √(Σ(xᵢ - μ)² / N)
```

Used when you have the entire population.

### Sample Standard Deviation (s)

```
s = √(Σ(xᵢ - x̄)² / (n-1))
```

Used when estimating from a sample (Bessel's correction).

### Grouped Data

```
σ = √(Σfᵢxᵢ² / N - μ²)
```

### Pooled Standard Deviation

```
sp = √(Σ(nᵢ-1)sᵢ² / Σ(nᵢ-1))
```

## Empirical Rule (68-95-99.7)

For normal distributions:

| Range | Percentage |
|-------|------------|
| μ ± 1σ | ~68% |
| μ ± 2σ | ~95% |
| μ ± 3σ | ~99.7% |

## Related Measures

| Measure | Formula | Description |
|---------|---------|-------------|
| Variance | σ² | Square of std dev |
| Coefficient of Variation | (σ/μ) × 100% | Relative variability |
| Standard Error | s/√n | Precision of mean estimate |

## Supported Distributions

| Distribution | Theoretical Std Dev |
|--------------|---------------------|
| Uniform [a,b] | (b-a)/√12 |
| Normal | σ parameter |
| Exponential | 1/λ |
| Log-Normal | √((e^σ² - 1) × e^(2μ+σ²)) |

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 100,000 | < 20ms |
| 1,000,000 | < 100ms |
| 10,000,000 | < 1s |

## Numerical Stability

### Problem with Naive Algorithm

```javascript
// UNSTABLE - can give negative variance!
let sumSquares = 0;
for (const x of data) sumSquares += x * x;
const variance = sumSquares/n - mean*mean;
```

### Welford's Solution

Updates running variance incrementally, avoiding subtraction of similar large numbers.

## Use Cases

- **Quality Control**: Process capability analysis
- **Finance**: Risk measurement (volatility)
- **Science**: Measurement uncertainty
- **Education**: Grade distribution analysis
- **Manufacturing**: Tolerance specifications

## Browser Support

All modern browsers with Web Worker support.

## References

- [Standard Deviation - Wikipedia](https://en.wikipedia.org/wiki/Standard_deviation)
- [Welford's Algorithm](https://en.wikipedia.org/wiki/Algorithms_for_calculating_variance#Welford's_online_algorithm)
- [Bessel's Correction](https://en.wikipedia.org/wiki/Bessel%27s_correction)

## License

MIT License
