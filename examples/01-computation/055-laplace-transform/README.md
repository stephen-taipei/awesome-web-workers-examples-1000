# #055 Laplace Transform

## Overview

A Web Worker implementation for Laplace transform analysis, including transfer function evaluation, Bode plots, impulse/step responses, and pole-zero analysis.

## What is the Laplace Transform?

The Laplace transform converts time-domain signals into the complex s-domain, enabling powerful analysis techniques for linear time-invariant (LTI) systems.

## Features

| Feature | Description |
|---------|-------------|
| Transfer Function | Bode magnitude and phase plots |
| Impulse Response | System response to impulse input |
| Step Response | System response to step input |
| Pole-Zero Analysis | Stability and system characteristics |
| Numerical Transform | Direct Laplace computation |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with Laplace algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select analysis type
2. Enter transfer function coefficients or signal data
3. Configure analysis parameters
4. Click "Analyze System"

## Mathematical Background

### Laplace Transform Definition

```
F(s) = L{f(t)} = ∫₀^∞ f(t)e^(-st) dt
```

where s = σ + jω is the complex frequency.

### Transfer Function

```
H(s) = N(s)/D(s) = (a₀ + a₁s + a₂s² + ...) / (b₀ + b₁s + b₂s² + ...)
```

### Inverse Laplace Transform

```
f(t) = L⁻¹{F(s)} = (1/2πj) ∫ F(s)e^(st) ds
```

## Analysis Methods

### 1. Transfer Function (Bode Plot)

Evaluates H(jω) for frequency response:
- **Magnitude**: |H(jω)| in dB
- **Phase**: ∠H(jω) in degrees

### 2. Impulse Response

The response h(t) when input is δ(t):
```
h(t) = L⁻¹{H(s)}
```

Uses partial fraction expansion:
```
h(t) = Σ residue[k] × e^(pole[k]×t)
```

### 3. Step Response

The response y(t) when input is u(t):
```
y(t) = ∫₀ᵗ h(τ)dτ
```

**Characteristics:**
- Rise time (10% to 90%)
- Overshoot percentage
- Settling time (±2%)
- Final value

### 4. Pole-Zero Analysis

**Poles**: Roots of denominator D(s)
**Zeros**: Roots of numerator N(s)

**Stability Criteria:**
- Stable: All poles in left half-plane (Re(s) < 0)
- Marginally stable: Poles on imaginary axis
- Unstable: Any pole in right half-plane

## Sample Systems

### First-Order System
```
H(s) = 1/(s + 1)
```
- One real pole at s = -1
- Time constant τ = 1s

### Second-Order System
```
H(s) = 1/(s² + 0.5s + 1)
```
- Complex conjugate poles
- Natural frequency ωₙ = 1 rad/s
- Damping ratio ζ = 0.25

### Bandpass Filter
```
H(s) = s/(s² + s + 1)
```
- Zero at origin
- Complex poles

## Common Laplace Transforms

| f(t) | F(s) |
|------|------|
| δ(t) | 1 |
| u(t) | 1/s |
| t | 1/s² |
| e^(-at) | 1/(s+a) |
| sin(ωt) | ω/(s²+ω²) |
| cos(ωt) | s/(s²+ω²) |
| t×e^(-at) | 1/(s+a)² |

## Algorithm Implementation

### Polynomial Root Finding

Uses Durand-Kerner iterative method:
```javascript
z[i] = z[i] - P(z[i]) / Π(z[i] - z[j])
```

### Residue Calculation

For simple poles:
```
residue[k] = N(pole[k]) / D'(pole[k])
```

### Numerical Integration

Trapezoidal rule for Laplace integral:
```
F(s) ≈ Δt × Σ f(t[i])×e^(-s×t[i])
```

## Performance

| Analysis | Typical Time |
|----------|-------------|
| Bode Plot (200 pts) | < 50ms |
| Impulse Response | < 100ms |
| Step Response | < 150ms |
| Pole-Zero | < 30ms |
| Numerical (500 pts) | < 200ms |

## Applications

- **Control Systems**: Stability analysis, controller design
- **Circuit Analysis**: Filter design, transient response
- **Signal Processing**: System identification
- **Mechanical Systems**: Vibration analysis
- **Communications**: Channel modeling

## Browser Support

All modern browsers with Web Worker support.

## References

- [Laplace Transform](https://en.wikipedia.org/wiki/Laplace_transform)
- [Transfer Function](https://en.wikipedia.org/wiki/Transfer_function)
- [Bode Plot](https://en.wikipedia.org/wiki/Bode_plot)
- [Control Theory](https://en.wikipedia.org/wiki/Control_theory)

## License

MIT License
