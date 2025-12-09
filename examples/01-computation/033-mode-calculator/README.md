# #033 Mode Calculator

## Overview

A Web Worker implementation for calculating mode (most frequent value) using hash-based counting for large datasets.

## What is Mode?

The mode is the value that appears most frequently in a dataset. Unlike mean and median, mode can be used with categorical data and there can be multiple modes.

**Example**: For [1, 2, 2, 3, 3, 3, 4], mode = 3 (appears 3 times)

## Features

| Feature | Description |
|---------|-------------|
| Single Mode | Find the most frequent value |
| Multimode | Find all values with maximum frequency |
| Frequency Distribution | Complete frequency analysis |
| Grouped Mode | Modal class for continuous data |
| Random Generation | Test with various distributions |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with mode algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter data or generate randomly
3. Configure parameters if needed
4. Click "Calculate Mode"

## Algorithm

### Hash-Based Counting

Uses JavaScript Map for O(n) counting:

```javascript
function calculateMode(data) {
    const counts = new Map();
    let maxCount = 0;
    let mode = data[0];

    for (const val of data) {
        const count = (counts.get(val) || 0) + 1;
        counts.set(val, count);

        if (count > maxCount) {
            maxCount = count;
            mode = val;
        }
    }

    return { mode, frequency: maxCount };
}
```

### Complexity

| Operation | Time | Space |
|-----------|------|-------|
| Single Mode | O(n) | O(k) |
| All Modes | O(n) | O(k) |
| Grouped Mode | O(n) | O(b) |

Where k = unique values, b = number of bins.

## Modality Types

| Type | Description | Example |
|------|-------------|---------|
| Unimodal | One mode | [1, 2, 2, 3] → mode = 2 |
| Bimodal | Two modes | [1, 1, 2, 2] → modes = 1, 2 |
| Multimodal | Many modes | Multiple peaks |
| No Mode | All equal frequency | [1, 2, 3, 4] |

## Grouped Mode (Modal Class)

For continuous data, find the bin with highest frequency:

```
Data: [1.2, 1.5, 2.1, 2.3, 2.5, 2.8, 3.1]
Bin width: 1.0

Bins:
[1, 2): 2 values
[2, 3): 4 values  ← Modal class
[3, 4): 1 value
```

## Supported Distributions

| Distribution | Typical Mode |
|--------------|--------------|
| Uniform | All values equal |
| Normal | At the mean |
| Poisson | At λ (approximately) |
| Binomial | At np (approximately) |
| Geometric | At 1 |

## Frequency Analysis

Additional metrics provided:
- **Entropy**: Measure of randomness (bits)
- **Max Entropy**: log₂(unique values)
- **Top/Bottom N**: Most/least frequent values

## Mode vs Mean vs Median

| Property | Mode | Mean | Median |
|----------|------|------|--------|
| Categorical data | ✓ | ✗ | ✗ |
| Multiple values | ✓ | ✗ | ✗ |
| Always exists | ✗ | ✓ | ✓ |
| Outlier resistant | ✓ | ✗ | ✓ |

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 100,000 | < 30ms |
| 1,000,000 | < 150ms |
| 10,000,000 | < 1.5s |

## Use Cases

- **Market Research**: Most popular product
- **Quality Control**: Most common defect
- **Demographics**: Most common age group
- **Education**: Most frequent score
- **Inventory**: Most sold items

## Browser Support

All modern browsers with Web Worker support.

## References

- [Mode - Wikipedia](https://en.wikipedia.org/wiki/Mode_(statistics))
- [Frequency Distribution](https://en.wikipedia.org/wiki/Frequency_distribution)
- [Central Tendency](https://en.wikipedia.org/wiki/Central_tendency)

## License

MIT License
