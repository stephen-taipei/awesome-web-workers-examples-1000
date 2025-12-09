# #027 Palindrome Number Detection

## Overview

A Web Worker implementation for detecting palindrome numbers in various bases and formats.

## What is a Palindrome Number?

A palindrome number reads the same forwards and backwards.

**Examples**:
- Base 10: 121, 1331, 12321
- Base 2: 9 = 1001₂ (palindrome in binary)
- Base 16: 255 = FF (palindrome in hex)

## Features

### Detection Types

| Type | Description |
|------|-------------|
| Single Check | Check if one number is palindrome |
| Range Search | Find all palindromes in range |
| Multi-Base | Check palindrome in multiple bases |
| Statistics | Calculate palindrome distribution |
| Special | Find prime, square palindromes |

### Multi-Base Support

Check palindromes in bases 2-36:
- Binary (2)
- Octal (8)
- Decimal (10)
- Hexadecimal (16)
- Any base up to 36

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
3. Choose base (if applicable)
4. Click "Detect"

## Examples

### Single Digit Palindromes
All single-digit numbers (0-9) are palindromes.

### Multi-Digit Palindromes

| Digits | Count | Examples |
|--------|-------|----------|
| 2 | 9 | 11, 22, 33, ..., 99 |
| 3 | 90 | 101, 111, 121, ..., 999 |
| 4 | 90 | 1001, 1111, 1221, ... |
| 5 | 900 | 10001, 10101, ... |

### Formula for Count

For n-digit palindromes:
- n=1: 10 palindromes
- n=2: 9 palindromes
- n≥3: 9 × 10^⌊(n-1)/2⌋

## Special Palindromes

### Prime Palindromes

| Number | Digits |
|--------|--------|
| 2, 3, 5, 7 | 1 |
| 11 | 2 |
| 101, 131, 151, ... | 3 |

### Square Palindromes

Numbers that are both perfect squares and palindromes:
1, 4, 9, 121 (11²), 484 (22²), 676 (26²), ...

### Binary-Decimal Palindromes

Numbers palindromic in both bases 2 and 10:
1, 3, 5, 7, 9, 33, 99, 313, 585, 717, ...

## Algorithm

### Palindrome Check

```javascript
function isPalindrome(str) {
    const len = str.length;
    for (let i = 0; i < len / 2; i++) {
        if (str[i] !== str[len - 1 - i]) return false;
    }
    return true;
}
```

### Base Conversion

```javascript
function toBase(n, base) {
    return n.toString(base).toUpperCase();
}
```

## Performance

| Range | Time |
|-------|------|
| 1-10,000 | < 50ms |
| 1-100,000 | < 200ms |
| 1-1,000,000 | < 1s |

## Properties

### Palindrome Density

In base 10, approximately 0.1% of n-digit numbers are palindromes for large n.

### Reversal Addition

Some non-palindromes become palindromes when repeatedly added to their reverse:
- 56 + 65 = 121 (palindrome!)
- 57 + 75 = 132 → 132 + 231 = 363 (palindrome!)

Numbers that never form palindromes this way are called "Lychrel numbers" (196 is a candidate).

## Browser Support

All modern browsers with Web Worker and BigInt support.

## References

- [Palindromic Number - Wikipedia](https://en.wikipedia.org/wiki/Palindromic_number)
- [Palindromic Prime - Wikipedia](https://en.wikipedia.org/wiki/Palindromic_prime)

## License

MIT License
