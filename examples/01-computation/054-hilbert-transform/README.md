# #054 Hilbert Transform

## Overview

A Web Worker implementation for computing the Hilbert transform, analytic signal, envelope detection, and instantaneous parameters of signals.

## What is the Hilbert Transform?

The Hilbert transform is a linear operator that produces the analytic signal from a real-valued signal. It shifts all frequency components by 90° in phase while preserving their amplitudes.

## Features

| Feature | Description |
|---------|-------------|
| Hilbert Transform | 90° phase shift of signal |
| Envelope Detection | Instantaneous amplitude |
| Instantaneous Parameters | Amplitude, phase, frequency |
| Hilbert-Huang Transform | EMD + Hilbert spectral analysis |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with Hilbert algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select analysis type
2. Enter signal data or use sample signals
3. Set sample rate if needed
4. Click "Compute Transform"

## Mathematical Background

### Hilbert Transform Definition

```
H{x(t)} = (1/π) × P.V. ∫ x(τ)/(t-τ) dτ
```

In frequency domain:
```
H(f) = -j × sign(f)
```

### Analytic Signal

```
z(t) = x(t) + j × H{x(t)}
```

The analytic signal has only positive frequency components.

### Instantaneous Parameters

| Parameter | Formula |
|-----------|---------|
| Amplitude | A(t) = \|z(t)\| = √(x² + H{x}²) |
| Phase | φ(t) = atan2(H{x}, x) |
| Frequency | f(t) = (1/2π) × dφ/dt |

## Analysis Methods

### 1. Hilbert Transform

Computes the 90° phase-shifted version of the signal using FFT-based method.

**Output:**
- Original signal
- Hilbert transform
- Correlation between them

### 2. Signal Envelope

Extracts the instantaneous amplitude (envelope) of the signal.

**Applications:**
- AM demodulation
- Speech analysis
- Vibration monitoring

### 3. Instantaneous Parameters

Computes time-varying amplitude, phase, and frequency.

**Key Steps:**
1. Compute analytic signal
2. Extract envelope (magnitude)
3. Extract phase (angle)
4. Unwrap phase
5. Differentiate for frequency

### 4. Hilbert-Huang Transform (HHT)

Combines Empirical Mode Decomposition (EMD) with Hilbert spectral analysis.

**Process:**
1. Decompose signal into IMFs
2. Apply Hilbert transform to each IMF
3. Generate time-frequency representation

## Sample Signals

| Signal | Description |
|--------|-------------|
| AM Signal | Amplitude modulated carrier |
| FM Signal | Frequency modulated carrier |
| Chirp | Linear frequency sweep |
| Multi-Component | Sum of sinusoids |

## Algorithm Implementation

### FFT-Based Hilbert Transform

```javascript
// 1. Compute FFT
// 2. Multiply by H(f) = 2 for f > 0, 1 for f = 0, 0 for f < 0
// 3. Inverse FFT
// 4. Take imaginary part
```

### Phase Unwrapping

Removes 2π discontinuities in phase:
```javascript
if (diff > π) phase -= 2π
if (diff < -π) phase += 2π
```

## Performance

| Signal Length | Transform | Envelope | Instant. | HHT |
|---------------|-----------|----------|----------|-----|
| 256 | < 10ms | < 15ms | < 20ms | < 50ms |
| 1024 | < 30ms | < 40ms | < 50ms | < 150ms |
| 4096 | < 100ms | < 120ms | < 150ms | < 500ms |

## Applications

- **Communications**: AM/FM demodulation, SSB modulation
- **Audio Processing**: Pitch detection, envelope following
- **Biomedical**: ECG/EEG analysis, heart rate variability
- **Vibration Analysis**: Bearing fault detection
- **Seismology**: Time-frequency analysis
- **Image Processing**: Edge detection (2D Hilbert)

## Properties of Hilbert Transform

1. **Linearity**: H{ax + by} = aH{x} + bH{y}
2. **Self-inverse**: H{H{x}} = -x
3. **Energy preservation**: Energy(x) = Energy(H{x})
4. **Orthogonality**: x and H{x} are orthogonal

## Browser Support

All modern browsers with Web Worker support.

## References

- [Hilbert Transform](https://en.wikipedia.org/wiki/Hilbert_transform)
- [Analytic Signal](https://en.wikipedia.org/wiki/Analytic_signal)
- [Hilbert-Huang Transform](https://en.wikipedia.org/wiki/Hilbert%E2%80%93Huang_transform)

## License

MIT License
