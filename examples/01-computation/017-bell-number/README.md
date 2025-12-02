# #017 Bell Number Calculator

## Overview

A Web Worker implementation that calculates Bell numbers using the Bell Triangle method (also known as Aitken's array).

## Bell Numbers

Bell numbers count the number of ways to partition a set of n elements into non-empty subsets. The sequence starts with:

```
B(0) = 1
B(1) = 1
B(2) = 2
B(3) = 5
B(4) = 15
B(5) = 52
B(6) = 203
B(7) = 877
...
```

## Bell Triangle Method

The Bell Triangle is constructed as follows:

```
Row 0:  1
Row 1:  1   2
Row 2:  2   3   5
Row 3:  5   7  10  15
Row 4: 15  20  27  37  52
Row 5: 52  67  87 114 151 203
```

### Construction Rules:
1. Row 0 starts with 1
2. The first element of each row equals the last element of the previous row
3. Each subsequent element = element to its left + element above the left element
4. B(n) = first element of row n

## Features

- **Sequence Calculation**: Calculate B(0) to B(n)
- **Single Value**: Calculate just B(n)
- **Triangle Display**: Visualize the Bell Triangle
- **BigInt Support**: Handle arbitrarily large numbers
- **Progress Reporting**: Real-time progress updates
- **Cancellation**: Stop long-running calculations

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page with UI |
| `main.js` | Main thread logic and UI handling |
| `worker.js` | Web Worker with Bell number algorithms |
| `style.css` | Stylesheet |
| `README.md` | This documentation |

## Usage

1. Select calculation type:
   - **Sequence**: Calculate all Bell numbers from B(0) to B(n)
   - **Single**: Calculate only B(n)
   - **Triangle**: Display the Bell Triangle

2. Enter the value of n

3. Click "Calculate" to start

4. View results with execution time

## Technical Details

### Worker Communication

```javascript
// Main -> Worker
worker.postMessage({
    type: 'sequence' | 'single' | 'triangle',
    n: number
});

// Worker -> Main (progress)
{
    type: 'progress',
    current: number,
    total: number,
    percentage: number
}

// Worker -> Main (result)
{
    type: 'result',
    calculationType: string,
    n: number,
    result: Array | string,
    executionTime: string
}
```

### Algorithm Complexity

- **Time**: O(n²) for building the triangle
- **Space**: O(n) - only stores two rows at a time

### Performance

| n | Approximate Time |
|---|------------------|
| 50 | < 10ms |
| 100 | < 100ms |
| 500 | < 1s |
| 1000 | < 5s |

## Example Output

For n = 10, the Bell number sequence is:

| n | B(n) |
|---|------|
| 0 | 1 |
| 1 | 1 |
| 2 | 2 |
| 3 | 5 |
| 4 | 15 |
| 5 | 52 |
| 6 | 203 |
| 7 | 877 |
| 8 | 4140 |
| 9 | 21147 |
| 10 | 115975 |

## Browser Support

- Chrome 68+
- Firefox 68+
- Safari 14+
- Edge 79+

(Requires BigInt support)

## References

- [Bell Number - Wikipedia](https://en.wikipedia.org/wiki/Bell_number)
- [Bell Triangle - OEIS](https://oeis.org/A011971)
- [Partition of a Set - Wikipedia](https://en.wikipedia.org/wiki/Partition_of_a_set)

## License

MIT License
