# #036 Quartile Calculator

## Overview

A Web Worker implementation for calculating quartiles, IQR, and box plot statistics using efficient selection algorithms.

## What are Quartiles?

Quartiles divide a dataset into four equal parts:
- **Q1 (25th percentile)**: 25% of data falls below this value
- **Q2 (50th percentile)**: The median
- **Q3 (75th percentile)**: 75% of data falls below this value

## Features

| Feature | Description |
|---------|-------------|
| Quartile Calculation | Q1, Q2, Q3 with linear interpolation |
| IQR Analysis | Interquartile range and outlier detection |
| Box Plot | Complete box plot statistics |
| Five-Number Summary | Min, Q1, Median, Q3, Max |
| Deciles & Quintiles | Extended percentile calculations |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with quartile algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter data or generate randomly
3. Click "Calculate Quartiles"

## Calculation Methods

### Linear Interpolation

For quartile at position p (0 to 1):

```javascript
function getQuartileValue(sortedData, p) {
    const n = sortedData.length;
    const pos = (n - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;

    return sortedData[base] + rest * (sortedData[base + 1] - sortedData[base]);
}
```

### QuickSelect Algorithm

O(n) average time for finding k-th element:

```javascript
function quickSelect(arr, k) {
    const pivot = arr[Math.floor(Math.random() * arr.length)];
    const lows = arr.filter(x => x < pivot);
    const highs = arr.filter(x => x > pivot);
    const pivots = arr.filter(x => x === pivot);

    if (k < lows.length) return quickSelect(lows, k);
    if (k < lows.length + pivots.length) return pivot;
    return quickSelect(highs, k - lows.length - pivots.length);
}
```

## IQR and Outlier Detection

### Interquartile Range

```
IQR = Q3 - Q1
```

### Outlier Fences

| Type | Lower Fence | Upper Fence |
|------|-------------|-------------|
| Mild | Q1 - 1.5×IQR | Q3 + 1.5×IQR |
| Extreme | Q1 - 3×IQR | Q3 + 3×IQR |

## Box Plot Components

```
                    ┌─────────┐
        ├───────────┤    │    ├───────────┤  o  o
                    └─────────┘
        ↑           ↑    ↑    ↑           ↑     ↑
    Lower       Q1  Median Q3        Upper   Outliers
    Whisker                          Whisker
```

| Component | Description |
|-----------|-------------|
| Box | Q1 to Q3 (contains 50% of data) |
| Median line | Q2 inside the box |
| Whiskers | Extend to adjacent values within fences |
| Outliers | Points beyond the fences |

## Five-Number Summary

| Statistic | Value |
|-----------|-------|
| Minimum | Smallest value |
| Q1 | First quartile |
| Median | Middle value |
| Q3 | Third quartile |
| Maximum | Largest value |

## Additional Measures

### Measures of Center

| Measure | Formula |
|---------|---------|
| Midhinge | (Q1 + Q3) / 2 |
| Midrange | (Min + Max) / 2 |
| Trimean | (Q1 + 2×Q2 + Q3) / 4 |

### Measures of Spread

| Measure | Formula |
|---------|---------|
| IQR | Q3 - Q1 |
| Semi-IQR | IQR / 2 |
| Range | Max - Min |

### Quartile Skewness

```
Quartile Skewness = (Q3 - Q2) - (Q2 - Q1) / (Q3 - Q1)
```

- Positive: Right-skewed
- Negative: Left-skewed
- Zero: Symmetric

## Supported Distributions

| Distribution | Description |
|--------------|-------------|
| Uniform | Equal probability |
| Normal | Bell curve |
| Exponential | Right-skewed |
| Log-Normal | Heavy right tail |
| Bimodal | Two peaks |

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 100,000 | < 50ms |
| 1,000,000 | < 300ms |
| 10,000,000 | < 3s |

## Browser Support

All modern browsers with Web Worker support.

## References

- [Quartile - Wikipedia](https://en.wikipedia.org/wiki/Quartile)
- [Box Plot - Wikipedia](https://en.wikipedia.org/wiki/Box_plot)
- [Five-Number Summary](https://en.wikipedia.org/wiki/Five-number_summary)

## License

MIT License
