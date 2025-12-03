# #059 ODE Solver

## Overview

A Web Worker implementation for solving Ordinary Differential Equations (ODEs) using various numerical methods including Euler, Midpoint, Runge-Kutta, and adaptive methods.

## What are ODEs?

Ordinary Differential Equations describe how a quantity changes with respect to an independent variable (usually time). The general form is:

```
dy/dt = f(t, y)
```

with initial condition y(t₀) = y₀.

## Features

| Feature | Description |
|---------|-------------|
| Euler's Method | First-order O(h) |
| Midpoint Method | Second-order O(h²) |
| Heun's Method | Second-order O(h²) |
| Runge-Kutta 4 | Fourth-order O(h⁴) |
| RK45 Adaptive | Error-controlled step size |
| System Solver | Multiple coupled equations |
| Method Comparison | Compare accuracy of methods |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with ODE algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select solution method
2. Enter differential equation dy/dt = f(t, y)
3. Set initial conditions and time range
4. Click "Solve ODE"

## Numerical Methods

### Euler's Method (First Order)

```
y_{n+1} = y_n + h × f(t_n, y_n)
```

- Simplest method
- Accuracy: O(h)
- May require very small h for stability

### Midpoint Method (Second Order)

```
k₁ = f(t_n, y_n)
y_{n+1} = y_n + h × f(t_n + h/2, y_n + (h/2)×k₁)
```

- Accuracy: O(h²)
- Better stability than Euler

### Heun's Method (Second Order)

```
k₁ = f(t_n, y_n)
k₂ = f(t_n + h, y_n + h×k₁)
y_{n+1} = y_n + (h/2) × (k₁ + k₂)
```

- Also called Improved Euler
- Accuracy: O(h²)

### Runge-Kutta 4 (Fourth Order)

```
k₁ = f(t_n, y_n)
k₂ = f(t_n + h/2, y_n + (h/2)×k₁)
k₃ = f(t_n + h/2, y_n + (h/2)×k₂)
k₄ = f(t_n + h, y_n + h×k₃)
y_{n+1} = y_n + (h/6) × (k₁ + 2k₂ + 2k₃ + k₄)
```

- The "workhorse" of ODE solvers
- Accuracy: O(h⁴)
- Excellent balance of accuracy and efficiency

### RK45 (Runge-Kutta-Fehlberg)

- Uses 4th and 5th order estimates
- Automatically adjusts step size based on error
- User specifies tolerance, not step size

## System of ODEs

For systems like:
```
dy₀/dt = f₀(t, y₀, y₁, ...)
dy₁/dt = f₁(t, y₀, y₁, ...)
```

Use array notation in equations: `y[0]`, `y[1]`, etc.

### Converting Higher-Order ODEs

Second-order ODEs can be converted to first-order systems:

**Original:** `y'' + y = 0` (harmonic oscillator)

**System form:**
```
y[0] = y      → dy[0]/dt = y[1]
y[1] = y'     → dy[1]/dt = -y[0]
```

## Sample Problems

| Problem | Equation | Solution |
|---------|----------|----------|
| Exponential | dy/dt = y | y = e^t |
| Decay | dy/dt = -0.5y | y = e^(-0.5t) |
| Sine | dy/dt = cos(t) | y = sin(t) |
| Logistic | dy/dt = y(1-y) | Sigmoid curve |
| Harmonic | dy₀/dt = y₁, dy₁/dt = -y₀ | sin/cos oscillation |

## Supported Functions

The equation parser supports:
- Arithmetic: `+`, `-`, `*`, `/`
- Powers: `pow(base, exp)`
- Trigonometric: `sin`, `cos`, `tan`
- Exponential: `exp`, `log`
- Other: `sqrt`, `abs`
- Constants: `PI`, `E`

## Error Analysis

| Method | Local Error | Global Error |
|--------|-------------|--------------|
| Euler | O(h²) | O(h) |
| Midpoint | O(h³) | O(h²) |
| Heun | O(h³) | O(h²) |
| RK4 | O(h⁵) | O(h⁴) |

## Stability

- **Explicit methods** (Euler, RK4) have stability limits
- **Stiff equations** (large negative eigenvalues) require small h or implicit methods
- **RK45** adapts step size to maintain accuracy

## Performance

| Method | Evaluations/Step | Typical Time (1000 steps) |
|--------|-----------------|--------------------------|
| Euler | 1 | < 5ms |
| Midpoint | 2 | < 5ms |
| Heun | 2 | < 5ms |
| RK4 | 4 | < 10ms |
| RK45 | 6 (variable) | 10-50ms |

## Applications

- **Physics**: Motion, oscillations, decay
- **Biology**: Population dynamics, epidemiology
- **Chemistry**: Reaction kinetics
- **Engineering**: Control systems, circuit analysis
- **Economics**: Growth models

## Choosing a Method

**Simple problems:**
- Use RK4 (good default choice)

**Accuracy-critical:**
- Use RK45 with tight tolerance

**Learning/debugging:**
- Use method comparison to see differences

**Systems:**
- Use system solver with RK4

## Browser Support

All modern browsers with Web Worker support.

## References

- [Runge-Kutta Methods](https://en.wikipedia.org/wiki/Runge%E2%80%93Kutta_methods)
- [Numerical ODE Methods](https://en.wikipedia.org/wiki/Numerical_methods_for_ordinary_differential_equations)
- [Dormand-Prince Method](https://en.wikipedia.org/wiki/Dormand%E2%80%93Prince_method)

## License

MIT License
