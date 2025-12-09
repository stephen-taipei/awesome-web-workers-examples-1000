# #032 Median Calculator

## Overview

A Web Worker implementation for calculating median and related statistics using the efficient QuickSelect algorithm.

## What is Median?

The median is the middle value when data is sorted:
- For odd count: the middle element
- For even count: average of two middle elements

**Example**: For [1, 3, 5, 7, 9], median = 5

## Features

| Feature | Description |
|---------|-------------|
| QuickSelect | O(n) average time complexity |
| Quartiles | Q1, Q2, Q3 calculation |
| MAD | Median Absolute Deviation |
| Running Median | Sliding window median |
| Weighted Median | Support for weighted data |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with median algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter data or generate randomly
3. Configure additional parameters if needed
4. Click "Calculate"

## QuickSelect Algorithm

Finds the k-th smallest element in O(n) average time:

```javascript
function quickSelect(arr, k) {
    // Choose pivot
    const pivotIndex = partition(arr, pivot);

    if (k === pivotIndex) return arr[k];
    if (k < pivotIndex) {
        return quickSelect(arr[0..pivotIndex-1], k);
    }
    return quickSelect(arr[pivotIndex+1..end], k);
}
```

### Complexity

| Case | Time |
|------|------|
| Average | O(n) |
| Worst | O(n²) |
| With median-of-medians | O(n) guaranteed |

## Median Absolute Deviation (MAD)

A robust measure of variability:
```
MAD = median(|xᵢ - median(x)|)
```

### Scaled MAD

For normal distributions, MAD × 1.4826 estimates standard deviation:
```
σ ≈ 1.4826 × MAD
```

## Quartiles and IQR

| Statistic | Definition |
|-----------|------------|
| Q1 (25th percentile) | Below this: 25% of data |
| Q2 (50th percentile) | Median |
| Q3 (75th percentile) | Above this: 25% of data |
| IQR | Q3 - Q1 |

### Box Plot

```
Min -- Q1 [====|====] Q3 -- Max
              Median
```

## Running Median

Median over a sliding window:
```
Data: [1, 5, 2, 8, 3, 9, 4]
Window size: 3

[1, 5, 2] → median = 2
[5, 2, 8] → median = 5
[2, 8, 3] → median = 3
...
```

Used in signal processing and time series analysis.

## Weighted Median

Each data point has a weight. The weighted median satisfies:
```
Σ(weights where x < median) ≤ total_weight / 2
Σ(weights where x > median) ≤ total_weight / 2
```

## Median vs Mean

| Property | Median | Mean |
|----------|--------|------|
| Outlier resistant | Yes | No |
| Computation | O(n) | O(n) |
| Skewed data | More representative | Pulled by outliers |

### Example

Data: [1, 2, 3, 4, 100]
- Mean = 22
- Median = 3

Median better represents the typical value.

## Performance

| Data Points | Median | Running Median |
|-------------|--------|----------------|
| 100,000 | < 20ms | < 500ms |
| 1,000,000 | < 100ms | < 5s |
| 10,000,000 | < 1s | N/A |

## Supported Distributions

| Distribution | Median Property |
|--------------|-----------------|
| Uniform | Center of range |
| Normal | Equals mean |
| Exponential | ln(2)/λ |
| Bimodal | Between modes |

## Browser Support

All modern browsers with Web Worker support.

## References

- [Median - Wikipedia](https://en.wikipedia.org/wiki/Median)
- [QuickSelect - Wikipedia](https://en.wikipedia.org/wiki/Quickselect)
- [Median Absolute Deviation](https://en.wikipedia.org/wiki/Median_absolute_deviation)

## License

MIT License
