# #030 Narcissistic Number Search

## Overview

A Web Worker implementation for searching narcissistic numbers with various power configurations.

## What is a Narcissistic Number?

A narcissistic number (also called pluperfect digital invariant) equals the sum of its digits each raised to some power k.

When k equals the digit count, these are specifically called **Armstrong numbers**.

**Example**: 153 = 1³ + 5³ + 3³ = 1 + 125 + 27 = 153

## Features

### Search Types

| Type | Description |
|------|-------------|
| Search by Power | Find numbers for specific power k |
| All Powers | Find numbers narcissistic for any power |
| Verify | Check if a number is narcissistic |
| Munchausen | Numbers where d^d sum equals number |
| Perfect Digital | PDIs where k ≠ digit count |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with search algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select search type
2. Configure parameters (power, max digits, etc.)
3. Click "Search"

## Munchausen Numbers

A Munchausen number equals the sum of its digits each raised to itself:
```
n = d₁^d₁ + d₂^d₂ + ... + dₖ^dₖ
```

Using convention 0⁰ = 0, there are only four Munchausen numbers in base 10:
- **1** = 1¹
- **3435** = 3³ + 4⁴ + 3³ + 5⁵ = 27 + 256 + 27 + 3125

Using convention 0⁰ = 1, only **1** qualifies.

## Perfect Digital Invariants

Numbers where sum of k-th powers equals the number, but k differs from digit count:

| Number | Power | Digits | Type |
|--------|-------|--------|------|
| 1 | any | 1 | Trivial |
| 2 | 1 | 1 | Sub-Armstrong |
| 89 | 1 | 2 | Sub-Armstrong |

## Algorithm

### Combination Search

For large digit counts, instead of checking every number:
1. Enumerate all digit combinations with repetition
2. Calculate sum of powers
3. Check if sum has same digits as combination

This reduces search space from O(10^n) to O(C(n+9, 9)).

### Power Optimization

Precompute d^k for all digits d (0-9) and power k:
```javascript
const powers = [];
for (let d = 0; d <= 9; d++) {
    powers[d] = d ** k;
}
```

## Performance

| Digits | Direct Search | Combination |
|--------|---------------|-------------|
| 1-6 | < 1s | < 100ms |
| 7 | ~10s | < 1s |
| 8+ | Minutes | < 10s |

## Known Narcissistic Numbers

### Power = 3 (Armstrong)

```
0, 1, 153, 370, 371, 407
```

### Power = 4

```
1, 2, 8208, 9474
```

### Power = 5

```
1, 4150, 4151, 54748, 92727, 93084
```

## Mathematical Properties

### Finite Count

For any base b and power k, there are finitely many narcissistic numbers because:
- Maximum digit sum: n × (b-1)^k
- For large enough n, this is less than b^(n-1)

### Trivial Solutions

- 0 is narcissistic for all powers (0^k = 0)
- 1 is narcissistic for all powers (1^k = 1)

## Browser Support

All modern browsers with Web Worker and BigInt support.

## References

- [Narcissistic Number - Wikipedia](https://en.wikipedia.org/wiki/Narcissistic_number)
- [Munchausen Number - Wikipedia](https://en.wikipedia.org/wiki/Perfect_digit-to-digit_invariant#Munchausen_numbers)
- [OEIS A005188](https://oeis.org/A005188)

## License

MIT License
