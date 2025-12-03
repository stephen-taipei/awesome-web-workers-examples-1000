# #056 Z-Transform

## Overview

A Web Worker implementation for Z-transform analysis, including digital filter design, frequency response, impulse/step responses, and pole-zero analysis for discrete-time systems.

## What is the Z-Transform?

The Z-transform is the discrete-time equivalent of the Laplace transform. It converts discrete sequences into the z-domain, enabling analysis and design of digital signal processing systems.

## Features

| Feature | Description |
|---------|-------------|
| Frequency Response | Magnitude and phase on unit circle |
| Impulse Response | System output for δ[n] input |
| Step Response | System output for u[n] input |
| Pole-Zero Analysis | Stability analysis in z-plane |
| Digital Filtering | Apply transfer function to signals |
| Numerical Transform | Direct Z-transform computation |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with Z-transform algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select analysis type
2. Enter filter coefficients B(z) and A(z)
3. Configure parameters
4. Click "Analyze System"

## Mathematical Background

### Z-Transform Definition

```
X(z) = Z{x[n]} = Σ x[n]z⁻ⁿ  (n = 0 to ∞)
```

where z is a complex variable.

### Digital Transfer Function

```
H(z) = B(z)/A(z) = (b₀ + b₁z⁻¹ + b₂z⁻² + ...) / (a₀ + a₁z⁻¹ + a₂z⁻² + ...)
```

### Difference Equation

```
y[n] = Σ bₖx[n-k] - Σ aₖy[n-k]
```

## Analysis Methods

### 1. Frequency Response

Evaluates H(e^(jω)) on the unit circle:
- **Magnitude**: |H(e^(jω))| in dB
- **Phase**: ∠H(e^(jω)) in degrees
- **Normalized frequency**: 0 to 0.5 (Nyquist)

### 2. Impulse Response h[n]

The system output when input is δ[n]:
- Shows filter decay characteristics
- Energy = Σ|h[n]|²
- Settling time estimation

### 3. Step Response

The system output when input is u[n]:
- Final value (DC response)
- Rise time (10% to 90%)
- Overshoot percentage
- Settling time

### 4. Pole-Zero Analysis

**Stability Criterion:**
- **Stable**: All poles |z| < 1 (inside unit circle)
- **Marginally stable**: Poles on unit circle
- **Unstable**: Any pole |z| > 1

### 5. Digital Filtering

Applies the transfer function to an input signal using Direct Form II transposed structure.

## Sample Filters

### Lowpass FIR (Moving Average)
```
B(z) = [0.2, 0.2, 0.2, 0.2, 0.2]
A(z) = [1]
```

### Highpass Differentiator
```
B(z) = [0.5, -0.5]
A(z) = [1]
```

### IIR Butterworth
```
B(z) = [0.0675, 0.2025, 0.2025, 0.0675]
A(z) = [1, -0.8, 0.44, -0.08]
```

### Resonator
```
B(z) = [0.1, 0, -0.1]
A(z) = [1, -1.6, 0.81]
```

## Common Z-Transforms

| x[n] | X(z) | ROC |
|------|------|-----|
| δ[n] | 1 | All z |
| u[n] | z/(z-1) | \|z\| > 1 |
| aⁿu[n] | z/(z-a) | \|z\| > \|a\| |
| nαⁿu[n] | az/(z-a)² | \|z\| > \|a\| |
| cos(ωn)u[n] | z(z-cosω)/(z²-2zcosω+1) | \|z\| > 1 |

## Key Relationships

### Laplace to Z-Transform

Bilinear transform (with prewarping):
```
s = (2/T) × (z-1)/(z+1)
```

### Frequency Mapping

```
z = e^(jωT)
ω_digital = ω_analog × T
```

where T is the sampling period.

## Filter Types

| Type | Characteristics |
|------|-----------------|
| FIR | Linear phase, always stable |
| IIR | More efficient, can be unstable |
| Lowpass | Passes low frequencies |
| Highpass | Passes high frequencies |
| Bandpass | Passes band of frequencies |
| Notch | Rejects specific frequency |

## Performance

| Analysis | Typical Time |
|----------|-------------|
| Freq Response (256 pts) | < 30ms |
| Impulse Response (100) | < 20ms |
| Step Response (100) | < 25ms |
| Pole-Zero | < 20ms |
| Filtering (1000 samples) | < 50ms |

## Applications

- **Audio Processing**: Equalizers, filters, effects
- **Communications**: Modems, channel equalization
- **Control Systems**: Digital controllers, PID
- **Image Processing**: 2D filtering
- **Biomedical**: ECG/EEG filtering
- **Radar/Sonar**: Signal conditioning

## Browser Support

All modern browsers with Web Worker support.

## References

- [Z-Transform](https://en.wikipedia.org/wiki/Z-transform)
- [Digital Filter](https://en.wikipedia.org/wiki/Digital_filter)
- [Discrete-Time Signal Processing](https://en.wikipedia.org/wiki/Digital_signal_processing)

## License

MIT License
