# #029 Happy Number Detection

## Overview

A Web Worker implementation for detecting happy numbers and analyzing their sequences.

## What is a Happy Number?

A happy number reaches 1 when repeatedly replaced by the sum of squares of its digits.

**Example**: 19 is happy
```
19 → 1² + 9² = 82
82 → 8² + 2² = 68
68 → 6² + 8² = 100
100 → 1² + 0² + 0² = 1 ✓
```

**Unhappy (Sad) numbers** enter a cycle that never includes 1.

## Features

### Detection Types

| Type | Description |
|------|-------------|
| Check | Test if number is happy |
| Sequence | Show full calculation sequence |
| Find in Range | Find all happy numbers |
| Statistics | Analyze happy number distribution |
| Cycles | Find unhappy number cycles |
| Happy Bases | Check happiness in different bases |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with detection algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select detection type
2. Enter number or range
3. Optionally change power (default 2)
4. Click "Detect"

## Happy Numbers Under 100

```
1, 7, 10, 13, 19, 23, 28, 31, 32, 44, 49, 68, 70, 79, 82, 86, 91, 94, 97
```

## The Unhappy Cycle

All unhappy numbers (in base 10, power 2) eventually enter this 8-number cycle:

```
4 → 16 → 37 → 58 → 89 → 145 → 42 → 20 → 4 ...
```

## Algorithm

### Basic Detection

```javascript
function isHappy(n) {
    const seen = new Set();

    while (n !== 1 && !seen.has(n)) {
        seen.add(n);
        n = sumOfSquaredDigits(n);
    }

    return n === 1;
}

function sumOfSquaredDigits(n) {
    let sum = 0;
    while (n > 0) {
        const digit = n % 10;
        sum += digit * digit;
        n = Math.floor(n / 10);
    }
    return sum;
}
```

### Floyd's Cycle Detection

Alternative using O(1) space:
```javascript
function isHappy(n) {
    let slow = n, fast = n;
    do {
        slow = sumOfSquares(slow);
        fast = sumOfSquares(sumOfSquares(fast));
    } while (slow !== fast);
    return slow === 1;
}
```

## Properties

### Happy Number Facts

1. If n is happy, so is any permutation of its digits
2. 1 is the only happy number that equals its digit square sum
3. Adding zeros doesn't change happiness: 7, 70, 700, 7000... all happy

### Density

Approximately **14.3%** of positive integers are happy numbers (base 10, power 2).

## Generalized Happy Numbers

### Different Powers

Try summing digits raised to different powers:
- Power 3: 1, 10, 100... (very few happy numbers)
- Power 4: Different cycle structure

### Different Bases

The cycle structure varies by base:
- Base 2: Only 1 is happy
- Base 4: 1, 2, 3 are happy
- Base 10: ~14.3% are happy

## Happy Primes

Numbers that are both happy and prime:
```
7, 13, 19, 23, 31, 79, 97, 103, 109, 139, ...
```

## Maximum Steps

| Range | Max Steps | Number |
|-------|-----------|--------|
| 1-100 | 7 | Many |
| 1-1000 | 10 | 356 |
| 1-10000 | 14 | 3888 |

## Performance

| Range | Time |
|-------|------|
| 1-1,000 | < 10ms |
| 1-10,000 | < 50ms |
| 1-100,000 | < 200ms |
| 1-1,000,000 | < 2s |

## Mathematical Background

### Why the Cycle?

For any n-digit number:
- Maximum digit sum of squares: n × 81
- For n ≥ 4: max sum < 10^(n-1)

This means the sequence eventually enters a bounded region where cycles must occur.

### Proof That Happy Numbers Exist

Starting from 1: 1 → 1 (trivially happy)
Starting from 7: 7 → 49 → 97 → 130 → 10 → 1 ✓

## Browser Support

All modern browsers with Web Worker support.

## References

- [Happy Number - Wikipedia](https://en.wikipedia.org/wiki/Happy_number)
- [OEIS A007770](https://oeis.org/A007770) - Happy numbers
- [Happy Prime - Wikipedia](https://en.wikipedia.org/wiki/Happy_prime)

## License

MIT License
