# #028 Armstrong Number Calculator

## Overview

A Web Worker implementation for finding and verifying Armstrong numbers (also known as Narcissistic numbers).

## What is an Armstrong Number?

An Armstrong number (or narcissistic number) equals the sum of its own digits each raised to the power of the number of digits.

**Example**: 153 is a 3-digit number
```
153 = 1³ + 5³ + 3³ = 1 + 125 + 27 = 153 ✓
```

## Features

### Calculation Types

| Type | Description |
|------|-------------|
| Check | Verify if a number is Armstrong |
| Find by Digits | Find all with specific digit count |
| Find in Range | Search within number range |
| All Known | Find all up to N digits |
| Pluperfect | Find PPDI variants |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with search algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation type
2. Enter parameters
3. Click "Calculate"

## All Armstrong Numbers (Base 10)

There are exactly **88** Armstrong numbers in base 10:

### By Digit Count

| Digits | Count | Numbers |
|--------|-------|---------|
| 1 | 9 | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| 3 | 4 | 153, 370, 371, 407 |
| 4 | 3 | 1634, 8208, 9474 |
| 5 | 3 | 54748, 92727, 93084 |
| 6 | 1 | 548834 |
| 7 | 4 | 1741725, 4210818, 9800817, 9926315 |
| 8 | 3 | 24678050, 24678051, 88593477 |
| 9 | 4 | 146511208, 472335975, 534494836, 912985153 |
| ... | ... | ... |

Note: No 2-digit Armstrong numbers exist!

## Algorithm

### Direct Search

```javascript
function isArmstrong(n) {
    const str = n.toString();
    const digits = str.length;
    let sum = 0n;

    for (const char of str) {
        sum += BigInt(char) ** BigInt(digits);
    }

    return sum === BigInt(n);
}
```

### Optimized Combination Search

For larger digit counts, enumerate digit combinations instead of all numbers:
1. Generate all combinations of digits with repetition
2. Calculate sum of powers
3. Check if sum has same digits

## Why No 2-Digit Armstrong Numbers?

For 2-digit number ab:
- Minimum: 10 = 1² + 0² = 1 (needs 2 digits, but sum gives 1)
- Maximum: 99 → 9² + 9² = 162 (exceeds 2 digits)

For any 2-digit number n:
- n ≥ 10, but max sum of two squared digits = 81 + 81 = 162
- The sum a² + b² can never equal the 2-digit number ab

## Largest Known Armstrong Number

The largest Armstrong number in base 10 has **39 digits**:
```
115132219018763992565095597973971522401
```

## Pluperfect Digital Invariants (PPDI)

Numbers where sum of k-th powers of digits equals the number, but k is NOT the digit count:

| Number | Power | Digit Count |
|--------|-------|-------------|
| 1 | any | 1 |
| 89 | 1 | 2 |
| 135 | 1 | 3 |
| 175 | 1 | 3 |

## Performance

| Digits | Approximate Time |
|--------|------------------|
| 1-7 | < 1s |
| 8-9 | < 10s |
| 10+ | Minutes to hours |

## Technical Details

### Precomputed Powers

For efficiency, precompute d^n for all digits 0-9:
```javascript
const powers = [];
for (let d = 0; d <= 9; d++) {
    powers[d] = d ** n;
}
```

### BigInt Usage

Large Armstrong numbers exceed JavaScript's safe integer limit, requiring BigInt.

## Browser Support

All modern browsers with Web Worker and BigInt support.

## References

- [Narcissistic Number - Wikipedia](https://en.wikipedia.org/wiki/Narcissistic_number)
- [OEIS A005188](https://oeis.org/A005188) - Armstrong numbers

## License

MIT License
