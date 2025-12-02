# #026 Digital Root Calculator

## Overview

A Web Worker implementation for calculating digital roots and persistence of numbers.

## Digital Root

The digital root is obtained by repeatedly summing digits until a single digit remains.

**Example**: 9875 → 9+8+7+5=29 → 2+9=11 → 1+1=2

So dr(9875) = 2

## Features

### Calculation Types

| Type | Description |
|------|-------------|
| Additive Digital Root | Sum digits repeatedly |
| Multiplicative Digital Root | Multiply digits repeatedly |
| Persistence Analysis | Both types with step counts |
| Batch Distribution | DR distribution over range |
| High Persistence | Find numbers with high persistence |

## Formulas

### Additive Digital Root (Direct Formula)

```
dr(n) = 1 + ((n - 1) mod 9)  for n > 0
dr(0) = 0
```

### Additive Persistence

Number of iterations needed to reach single digit by summing.

### Multiplicative Persistence

Number of iterations needed to reach single digit by multiplying.

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with DR algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter number or range
3. Click "Calculate"

## Examples

### Digital Root

| Number | Steps | Digital Root |
|--------|-------|--------------|
| 123 | 123→6 | 6 |
| 9875 | 9875→29→11→2 | 2 |
| 999999 | 999999→54→9 | 9 |

### Multiplicative Persistence

| Number | Steps | Result |
|--------|-------|--------|
| 39 | 39→27→14→4 | 3 |
| 77 | 77→49→36→18→8 | 4 |
| 277777788888899 | 11 steps | 0 |

## Distribution

For any range, digital roots are uniformly distributed:
- Each digit 1-9 appears approximately 1/9 of the time
- Digital root 9 corresponds to multiples of 9

## High Persistence Records

### Multiplicative Persistence

| Digits | Smallest Number | Persistence |
|--------|-----------------|-------------|
| 2 | 77 | 4 |
| 3 | 679 | 5 |
| 4 | 6788 | 6 |
| 5 | 68889 | 7 |
| 7 | 2677889 | 8 |
| 11 | 26888999999 | 9 |
| 15 | 277777788888899 | 11 |

Note: The maximum known multiplicative persistence is 11.

### Additive Persistence

| n | Additive Persistence |
|---|---------------------|
| 199 | 3 |
| 19999999999999999999999 | 4 |

Additive persistence grows very slowly (logarithmically).

## Technical Details

### BigInt Support

Uses string arithmetic for very large numbers to avoid precision issues.

### Digit Operations

```javascript
// Sum digits of BigInt
function sumDigits(n) {
    return n.toString().split('')
        .reduce((sum, d) => sum + BigInt(d), 0n);
}

// Multiply digits
function multiplyDigits(n) {
    return n.toString().split('')
        .reduce((prod, d) => prod * BigInt(d), 1n);
}
```

### Performance

| Range | Time |
|-------|------|
| 1-10,000 | < 50ms |
| 1-100,000 | < 200ms |
| 1-1,000,000 | < 2s |

## Properties

### Digital Root Properties

1. dr(a + b) = dr(dr(a) + dr(b))
2. dr(a × b) = dr(dr(a) × dr(b))
3. dr(n) = n mod 9, except dr(9k) = 9

### Casting Out Nines

Digital roots are used in "casting out nines" for arithmetic verification.

## Browser Support

All modern browsers with Web Worker and BigInt support.

## References

- [Digital Root - Wikipedia](https://en.wikipedia.org/wiki/Digital_root)
- [Persistence - Wikipedia](https://en.wikipedia.org/wiki/Persistence_of_a_number)
- [Casting Out Nines](https://en.wikipedia.org/wiki/Casting_out_nines)

## License

MIT License
