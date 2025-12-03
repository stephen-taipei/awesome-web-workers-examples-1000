# #051 Wavelet Transform

## Overview

A Web Worker implementation for Wavelet Transform including Discrete Wavelet Transform (DWT), Continuous Wavelet Transform (CWT), multi-level decomposition, and signal denoising.

## What is Wavelet Transform?

Wavelet Transform decomposes signals into scaled and shifted versions of a mother wavelet, providing both time and frequency information simultaneously - unlike Fourier Transform which only provides frequency information.

## Features

| Feature | Description |
|---------|-------------|
| DWT | Discrete Wavelet Transform |
| IDWT | Inverse DWT for reconstruction |
| CWT | Continuous Wavelet Transform |
| Denoising | Wavelet thresholding |
| Multi-level | Hierarchical decomposition |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with wavelet algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Enter signal data or load a sample
2. Select analysis type (DWT, CWT, Denoise)
3. Choose wavelet type and level
4. Click "Analyze"

## Supported Wavelets

| Wavelet | Filter Length | Properties |
|---------|---------------|------------|
| Haar | 2 | Simplest, discontinuous |
| db2 | 4 | Daubechies, compact |
| db4 | 8 | Smoother, better frequency |
| sym4 | 8 | Near-symmetric |

## DWT Algorithm

The DWT decomposes a signal into approximation (low frequency) and detail (high frequency) coefficients:

```
Signal → [Low-pass filter → Downsample] → Approximation
       → [High-pass filter → Downsample] → Detail
```

## Multi-Resolution Analysis

```
Level 1: A1, D1
Level 2: A2, D2 (from A1)
Level 3: A3, D3 (from A2)
...
```

Each level captures different frequency bands.

## Denoising

### Threshold Selection
- Universal threshold: σ√(2 log n)
- σ estimated from MAD of finest detail coefficients

### Thresholding Types

| Type | Formula | Effect |
|------|---------|--------|
| Soft | sign(x)(|x|-t)⁺ | Smoother, some bias |
| Hard | x·1(|x|>t) | Preserves peaks |

## CWT and Scalogram

The CWT provides a 2D time-scale representation:

```
W(a,b) = (1/√a) ∫ x(t) ψ*((t-b)/a) dt
```

Where:
- a = scale (inverse frequency)
- b = translation (time)
- ψ = mother wavelet

## Energy Distribution

Energy is partitioned across scales:
- Approximation: Low-frequency energy
- Details: High-frequency energy at each scale

## Applications

- **Signal Processing**: Noise removal, compression
- **Image Processing**: Edge detection, compression
- **Medical**: ECG/EEG analysis
- **Finance**: Multi-scale trend analysis
- **Seismology**: Earthquake signal analysis

## Performance

| Signal Length | DWT Time | CWT Time |
|---------------|----------|----------|
| 256 | < 10ms | ~100ms |
| 1024 | < 30ms | ~1s |
| 4096 | < 100ms | ~10s |

## Browser Support

All modern browsers with Web Worker support.

## References

- [Wavelet Transform](https://en.wikipedia.org/wiki/Wavelet_transform)
- [Discrete Wavelet Transform](https://en.wikipedia.org/wiki/Discrete_wavelet_transform)
- [Wavelet Denoising](https://en.wikipedia.org/wiki/Wavelet_noise_reduction)

## License

MIT License
