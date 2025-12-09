# #061 Boundary Value Problem

## Overview

A Web Worker implementation for solving two-point Boundary Value Problems (BVPs) using various numerical methods including Shooting, Finite Difference, Collocation, and Relaxation methods.

## What are BVPs?

Boundary Value Problems are differential equations where the solution must satisfy conditions at two or more points, rather than just at an initial point.

**General Form:**
```
y'' = f(x, y, y')
y(a) = α  (left boundary)
y(b) = β  (right boundary)
```

## Features

| Feature | Description |
|---------|-------------|
| Shooting Method | Convert to IVP with bisection |
| Finite Difference | Direct discretization |
| Collocation | Polynomial approximation |
| Relaxation (SOR) | Iterative refinement |
| Method Comparison | Compare all methods |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with BVP solvers |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Solution Methods

### Shooting Method

1. Guess initial slope y'(a) = s
2. Solve IVP from a to b
3. Check if y(b) matches boundary condition
4. Adjust s using bisection and repeat

**Advantages:** Simple implementation, uses standard IVP solvers
**Disadvantages:** May not converge for some problems

### Finite Difference Method

Discretize the derivatives using central differences:
```
y'' ≈ (y[i+1] - 2y[i] + y[i-1]) / h²
y' ≈ (y[i+1] - y[i-1]) / (2h)
```

Results in a tridiagonal linear system solved with Thomas algorithm.

**Advantages:** Direct solution, always converges for linear problems
**Disadvantages:** Lower accuracy than higher-order methods

### Collocation Method

Approximate solution as polynomial:
```
y(x) = Σ c_k φ_k(x)
```

Choose coefficients so equation is satisfied at collocation points (Chebyshev nodes).

**Advantages:** High accuracy, smooth solution
**Disadvantages:** More complex implementation

### Relaxation Method (SOR)

Start with initial guess, iteratively improve:
```
y[i]^(new) = (1-ω)y[i]^(old) + ω × y_GS
```

where ω is the over-relaxation parameter (1 < ω < 2).

**Advantages:** Good for nonlinear problems
**Disadvantages:** Convergence depends on ω choice

## Sample Problems

| Name | Equation | Analytical Solution |
|------|----------|---------------------|
| Harmonic | y'' = -y | sin(x), cos(x) |
| Exponential | y'' = y | e^x, e^(-x) |
| Damped | y'' = -0.5y' - y | Damped oscillation |
| Forced | y'' = -y + sin(x) | Particular + homogeneous |

## Boundary Conditions

### Dirichlet
Fixed values at boundaries: y(a) = α, y(b) = β

### Neumann (not yet implemented)
Fixed derivatives: y'(a) = α, y'(b) = β

### Mixed (not yet implemented)
Combination of value and derivative conditions

## Error Analysis

| Method | Error Order |
|--------|-------------|
| Shooting (RK4) | O(h⁴) |
| Finite Difference | O(h²) |
| Collocation | Spectral (exponential) |
| Relaxation | O(h²) |

## Performance

| Method | Grid Points | Typical Time |
|--------|-------------|--------------|
| Shooting | 50 | < 50ms |
| Finite Difference | 50 | < 20ms |
| Collocation | 50 | < 30ms |
| Relaxation | 50 | < 100ms |

## Applications

### Structural Mechanics
- Beam deflection under load
- Elastic rod bending

### Heat Transfer
- Steady-state temperature with fixed boundaries
- Fin analysis

### Quantum Mechanics
- Schrödinger equation in finite wells
- Energy eigenvalue problems

### Fluid Dynamics
- Boundary layer profiles
- Pipe flow with fixed inlet/outlet

## Tips for Better Results

1. **Start with coarse grid** to check problem setup
2. **Use method comparison** to verify solution
3. **Check boundary values** - they significantly affect the solution
4. **For stiff problems**, finite difference may be more stable than shooting
5. **Increase grid points** for smoother, more accurate solutions

## Browser Support

All modern browsers with Web Worker support.

## References

- [Boundary Value Problem](https://en.wikipedia.org/wiki/Boundary_value_problem)
- [Shooting Method](https://en.wikipedia.org/wiki/Shooting_method)
- [Finite Difference Method](https://en.wikipedia.org/wiki/Finite_difference_method)
- [Collocation Method](https://en.wikipedia.org/wiki/Collocation_method)

## License

MIT License
