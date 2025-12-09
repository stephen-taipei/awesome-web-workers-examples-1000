# #019 Euler Number Calculator

## Overview

A Web Worker implementation that calculates Euler numbers, zigzag numbers (alternating permutations), and tangent numbers using dynamic programming.

## Number Types

### Euler Numbers |E(n)|

Euler numbers appear in the Taylor series expansion of sec(x). All odd-indexed Euler numbers are 0.

```
|E(0)| = 1
|E(2)| = 1
|E(4)| = 5
|E(6)| = 61
|E(8)| = 1385
|E(10)| = 50521
...
```

**Series**: sec(x) = E(0) + E(2)x²/2! + E(4)x⁴/4! + ...

### Zigzag Numbers A(n)

Zigzag numbers count the number of alternating permutations of n elements (sequences where elements alternately rise and fall).

```
A(0) = 1
A(1) = 1
A(2) = 1
A(3) = 2
A(4) = 5
A(5) = 16
A(6) = 61
A(7) = 272
...
```

**Relationship**: |E(2n)| = A(2n), T(n) = A(2n+1)

### Tangent Numbers T(n)

Tangent numbers are coefficients in the Taylor series of tan(x).

```
T(0) = 1
T(1) = 2
T(2) = 16
T(3) = 272
T(4) = 7936
...
```

**Series**: tan(x) = T(0)x + T(1)x³/3! + T(2)x⁵/5! + ...

## Features

- **Three Number Types**: Euler, zigzag, and tangent numbers
- **Sequence Calculation**: Calculate multiple values at once
- **Single Value**: Calculate specific Euler number
- **BigInt Support**: Handle arbitrarily large numbers
- **Progress Reporting**: Real-time progress updates

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page with UI |
| `main.js` | Main thread logic and UI handling |
| `worker.js` | Web Worker with number algorithms |
| `style.css` | Stylesheet |
| `README.md` | This documentation |

## Usage

1. Select number type (Euler, Zigzag, or Tangent)
2. Select calculation type (Sequence or Single)
3. Enter the value of n
4. Click "Calculate"

## Technical Details

### Algorithm

The implementation uses the recurrence relation for zigzag numbers:

```
A(n) = (1/2) * Σ C(n-1,k) * A(k) * A(n-1-k)  for k=0 to n-1
```

Where C(n,k) is the binomial coefficient.

### Worker Communication

```javascript
// Main -> Worker
worker.postMessage({
    type: 'sequence' | 'single',
    n: number,
    numberType: 'euler' | 'zigzag' | 'tangent'
});

// Worker -> Main (result)
{
    type: 'result',
    calculationType: string,
    numberType: string,
    n: number,
    result: string | Array,
    executionTime: string
}
```

### Complexity

- **Time**: O(n²) for computing n terms
- **Space**: O(n²) for binomial table, O(n) for results

### Performance

| n | Type | Approximate Time |
|---|------|------------------|
| 50 | Sequence | < 50ms |
| 100 | Sequence | < 200ms |
| 200 | Single | < 500ms |

## Mathematical Background

### Key Relationships

1. **Euler and Zigzag**: |E(2n)| = A(2n)
2. **Tangent and Zigzag**: T(n) = A(2n+1)
3. **Generating Function**: sec(x) + tan(x) = Σ A(n) * xⁿ/n!

### Applications

- Combinatorics: counting alternating permutations
- Number theory: properties of special sequences
- Analysis: Taylor series expansions

## Browser Support

- Chrome 68+
- Firefox 68+
- Safari 14+
- Edge 79+

(Requires BigInt support)

## References

- [Euler Number - Wikipedia](https://en.wikipedia.org/wiki/Euler_number)
- [Alternating Permutation - Wikipedia](https://en.wikipedia.org/wiki/Alternating_permutation)
- [OEIS A000111](https://oeis.org/A000111) - Zigzag numbers
- [OEIS A000364](https://oeis.org/A000364) - Euler numbers

## License

MIT License
