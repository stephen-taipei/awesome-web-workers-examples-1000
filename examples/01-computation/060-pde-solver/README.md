# #060 PDE Solver

## Overview

A Web Worker implementation for solving Partial Differential Equations (PDEs) using finite difference methods, including Heat, Wave, Laplace, Poisson, and Advection equations.

## What are PDEs?

Partial Differential Equations describe phenomena involving multiple independent variables (e.g., space and time). They are fundamental in physics, engineering, and applied mathematics.

## Features

| Feature | Description |
|---------|-------------|
| 1D Heat Equation | Explicit FTCS scheme with stability check |
| 2D Heat Equation | Explicit time-stepping on 2D grid |
| 1D Wave Equation | CTCS scheme for vibrating strings |
| Laplace Equation | Gauss-Seidel iteration for steady-state |
| Poisson Equation | Source term with iterative solution |
| Advection Equation | Upwind scheme for transport |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with PDE solvers |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## PDE Types

### Heat Equation (Parabolic)

```
∂u/∂t = α ∂²u/∂x²
```

Models heat diffusion and other diffusion processes.

**Stability Condition (Explicit):**
```
r = α × dt / dx² ≤ 0.5
```

### Wave Equation (Hyperbolic)

```
∂²u/∂t² = c² ∂²u/∂x²
```

Models vibrating strings, sound waves, electromagnetic waves.

**CFL Condition:**
```
C = c × dt / dx ≤ 1
```

### Laplace Equation (Elliptic)

```
∇²u = ∂²u/∂x² + ∂²u/∂y² = 0
```

Models steady-state temperature, potential fields, equilibrium states.

### Poisson Equation

```
∇²u = f(x,y)
```

Models electrostatics, gravitational fields with sources.

### Advection Equation

```
∂u/∂t + v ∂u/∂x = 0
```

Models transport phenomena, wave propagation without dispersion.

## Numerical Methods

### Finite Difference Schemes

| Scheme | Equation | Accuracy |
|--------|----------|----------|
| FTCS | Forward Time Central Space | O(dt, dx²) |
| CTCS | Central Time Central Space | O(dt², dx²) |
| Upwind | Forward/Backward based on flow | O(dt, dx) |
| Gauss-Seidel | Iterative relaxation | Converges to exact |

### FTCS for Heat Equation

```
u[i,n+1] = u[i,n] + r × (u[i+1,n] - 2u[i,n] + u[i-1,n])
```

where r = α × dt / dx²

### CTCS for Wave Equation

```
u[i,n+1] = 2u[i,n] - u[i,n-1] + C² × (u[i+1,n] - 2u[i,n] + u[i-1,n])
```

where C = c × dt / dx (Courant number)

## Boundary Conditions

| Type | Description |
|------|-------------|
| Dirichlet | Fixed value at boundary |
| Neumann | Fixed gradient (insulated) |
| Periodic | Wraps around |

## Initial Conditions

| Type | Shape |
|------|-------|
| Sine | sin(πx/L) |
| Gaussian | e^(-(x-x₀)²/σ²) |
| Step | Square pulse |
| Pluck | Triangular (for strings) |

## Stability Analysis

### Von Neumann Stability

- Amplification factor |g| ≤ 1 for stability
- Heat equation: r ≤ 0.5 (explicit)
- Wave equation: C ≤ 1 (CFL condition)

### Practical Tips

- Start with coarse grid to test
- Check stability conditions BEFORE running
- Use adaptive time stepping when possible
- Monitor conservation properties

## Performance

| Equation | Grid | Time Steps | Typical Time |
|----------|------|------------|--------------|
| Heat 1D | 50 | 1000 | < 50ms |
| Heat 2D | 30×30 | 500 | < 200ms |
| Wave 1D | 100 | 500 | < 100ms |
| Laplace | 30×30 | 5000 iter | < 500ms |

## Applications

### Heat Equation
- Thermal conduction
- Chemical diffusion
- Financial modeling (Black-Scholes)

### Wave Equation
- String vibrations
- Acoustics
- Seismic waves

### Laplace/Poisson
- Electrostatics
- Fluid flow (potential)
- Steady-state temperature

### Advection
- Pollutant transport
- Weather prediction
- Traffic flow

## Visualization

- **1D Problems**: Time evolution curves
- **2D Problems**: Heatmap/contour plots
- **Color Scale**: Blue (cold) → Red (hot)

## Browser Support

All modern browsers with Web Worker support.

## References

- [Finite Difference Method](https://en.wikipedia.org/wiki/Finite_difference_method)
- [Heat Equation](https://en.wikipedia.org/wiki/Heat_equation)
- [Wave Equation](https://en.wikipedia.org/wiki/Wave_equation)
- [Laplace Equation](https://en.wikipedia.org/wiki/Laplace%27s_equation)

## License

MIT License
