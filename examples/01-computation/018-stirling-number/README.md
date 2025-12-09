# #018 Stirling Number Calculator

## Overview

A Web Worker implementation that calculates Stirling numbers of the first and second kind using dynamic programming with space optimization.

## Stirling Numbers

### First Kind |s(n,k)| (Unsigned)

Stirling numbers of the first kind count the number of permutations of n elements with exactly k disjoint cycles.

**Recurrence relation:**
```
s(n,k) = s(n-1,k-1) + (n-1) * s(n-1,k)
```

**Example values:**
| n\k | 0 | 1 | 2 | 3 | 4 |
|-----|---|---|---|---|---|
| 0 | 1 | | | | |
| 1 | 0 | 1 | | | |
| 2 | 0 | 1 | 1 | | |
| 3 | 0 | 2 | 3 | 1 | |
| 4 | 0 | 6 | 11 | 6 | 1 |

### Second Kind S(n,k)

Stirling numbers of the second kind count the number of ways to partition n elements into exactly k non-empty subsets.

**Recurrence relation:**
```
S(n,k) = S(n-1,k-1) + k * S(n-1,k)
```

**Example values:**
| n\k | 0 | 1 | 2 | 3 | 4 |
|-----|---|---|---|---|---|
| 0 | 1 | | | | |
| 1 | 0 | 1 | | | |
| 2 | 0 | 1 | 1 | | |
| 3 | 0 | 1 | 3 | 1 | |
| 4 | 0 | 1 | 7 | 6 | 1 |

## Features

- **Two Kinds**: Calculate both first and second kind Stirling numbers
- **Single Value**: Calculate specific s(n,k) or S(n,k)
- **Row Calculation**: Calculate all values for a given n
- **Triangle Display**: Visualize the complete Stirling triangle
- **BigInt Support**: Handle arbitrarily large numbers
- **Progress Reporting**: Real-time progress updates

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page with UI |
| `main.js` | Main thread logic and UI handling |
| `worker.js` | Web Worker with Stirling number algorithms |
| `style.css` | Stylesheet |
| `README.md` | This documentation |

## Usage

1. Select the kind of Stirling number (First or Second)
2. Select calculation type:
   - **Single Value**: Calculate one specific value
   - **Entire Row**: Calculate all k values for given n
   - **Triangle**: Display the complete triangle
3. Enter the value of n (and k for single value)
4. Click "Calculate"

## Technical Details

### Worker Communication

```javascript
// Main -> Worker
worker.postMessage({
    type: 'single' | 'row' | 'triangle',
    n: number,
    k: number,      // for single calculation
    kind: 'first' | 'second'
});

// Worker -> Main (result)
{
    type: 'result',
    calculationType: string,
    kind: string,
    n: number,
    k: number,
    result: string | Array,
    executionTime: string
}
```

### Algorithm Complexity

- **Time**: O(n*k) for single value, O(n²) for row/triangle
- **Space**: O(k) - only stores previous row (space optimized)

### Performance

| Calculation | n | Approximate Time |
|-------------|---|------------------|
| Single | 100 | < 10ms |
| Single | 500 | < 100ms |
| Row | 100 | < 50ms |
| Triangle | 30 | < 100ms |

## Mathematical Background

### Applications of First Kind
- Counting permutations by cycle structure
- Coefficients in rising factorials
- Polynomial conversions

### Applications of Second Kind
- Set partition counting
- Bell numbers: B(n) = Σ S(n,k)
- Polynomial interpolation

## Browser Support

- Chrome 68+
- Firefox 68+
- Safari 14+
- Edge 79+

(Requires BigInt support)

## References

- [Stirling Numbers - Wikipedia](https://en.wikipedia.org/wiki/Stirling_number)
- [Stirling Numbers of the First Kind - OEIS A008275](https://oeis.org/A008275)
- [Stirling Numbers of the Second Kind - OEIS A008277](https://oeis.org/A008277)

## License

MIT License
