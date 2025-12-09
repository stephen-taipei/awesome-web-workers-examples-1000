# #050 Fourier Analysis

## Overview

A Web Worker implementation for Fourier Analysis including Discrete Fourier Transform (DFT), Fast Fourier Transform (FFT), spectral analysis, and frequency domain filtering.

## What is Fourier Analysis?

Fourier Analysis decomposes a signal into its constituent frequencies. Any periodic signal can be represented as a sum of sinusoids at different frequencies, amplitudes, and phases.

## Features

| Feature | Description |
|---------|-------------|
| DFT | Discrete Fourier Transform O(n²) |
| FFT | Fast Fourier Transform O(n log n) |
| IFFT | Inverse FFT for reconstruction |
| Spectral Analysis | Power spectrum and peak detection |
| Filtering | Low-pass, high-pass frequency filters |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with FFT algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Enter signal data or generate a composite signal
2. Select analysis type (FFT, DFT, Spectrum, Filter)
3. Set sample rate if using spectrum analysis
4. Click "Analyze"

## The Fourier Transform

### DFT Formula

```
X(k) = Σ[n=0 to N-1] x(n) × e^(-j2πkn/N)
```

Where:
- X(k) = Frequency domain representation
- x(n) = Time domain signal
- N = Number of samples
- k = Frequency bin index

### FFT (Cooley-Tukey Algorithm)

The FFT reduces DFT complexity from O(n²) to O(n log n) by recursively splitting the DFT into smaller DFTs.

## Output

| Output | Description |
|--------|-------------|
| Magnitude | |X(k)| = √(Re² + Im²) |
| Phase | ∠X(k) = atan2(Im, Re) |
| Power | |X(k)|² |

## Frequency Resolution

```
Δf = Sample Rate / N
```

Maximum detectable frequency (Nyquist):
```
f_max = Sample Rate / 2
```

## Spectral Statistics

| Statistic | Description |
|-----------|-------------|
| Spectral Centroid | Center of mass of spectrum |
| Bandwidth | Spread of frequencies |
| Dominant Frequency | Highest power component |

## Filtering

### Low-pass Filter
Removes frequencies above cutoff:
- Keeps f < cutoff
- Removes f ≥ cutoff

### High-pass Filter
Removes frequencies below cutoff:
- Removes f < cutoff
- Keeps f ≥ cutoff

## Applications

- **Audio Processing**: Equalization, noise removal
- **Image Processing**: Frequency domain filtering
- **Communications**: Signal modulation analysis
- **Vibration Analysis**: Machinery diagnostics
- **Medical**: ECG, EEG frequency analysis

## Performance

| Samples | DFT Time | FFT Time |
|---------|----------|----------|
| 256 | ~50ms | <5ms |
| 1024 | ~500ms | <10ms |
| 4096 | ~8s | <30ms |

## Implementation Notes

- FFT pads signals to next power of 2
- Uses Cooley-Tukey radix-2 algorithm
- Bit-reversal permutation for in-place computation

## Browser Support

All modern browsers with Web Worker support.

## References

- [Fourier Transform](https://en.wikipedia.org/wiki/Fourier_transform)
- [FFT Algorithm](https://en.wikipedia.org/wiki/Cooley%E2%80%93Tukey_FFT_algorithm)
- [Spectral Analysis](https://en.wikipedia.org/wiki/Spectral_analysis)

## License

MIT License
