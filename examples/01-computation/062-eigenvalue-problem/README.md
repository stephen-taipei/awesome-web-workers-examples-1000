# #062 Eigenvalue Problem

## Overview

A Web Worker implementation for solving matrix eigenvalue problems using various numerical methods including Power Method, QR Algorithm, Jacobi Method, and Rayleigh Quotient Iteration.

## What are Eigenvalues?

For a square matrix A, eigenvalues λ and eigenvectors v satisfy:

```
Av = λv
```

Eigenvalues are fundamental in linear algebra and have applications across science and engineering.

## Features

| Feature | Description |
|---------|-------------|
| Power Method | Finds dominant eigenvalue |
| Inverse Power | Finds smallest or shifted eigenvalue |
| QR Algorithm | Finds all eigenvalues |
| Jacobi Method | All eigenvalues/vectors (symmetric) |
| Rayleigh Quotient | Fast convergence to nearest eigenvalue |
| Method Comparison | Compare all methods |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with eigenvalue algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Solution Methods

### Power Method

Iteratively apply A to find dominant eigenvalue:
```
x_{k+1} = A x_k / ||A x_k||
λ ≈ x_k^T A x_k
```

**Convergence:** Linear, rate = |λ₂/λ₁|

### Inverse Power Method

Apply (A - σI)⁻¹ to find eigenvalue closest to shift σ:
```
(A - σI) y_{k+1} = x_k
x_{k+1} = y_{k+1} / ||y_{k+1}||
```

### QR Algorithm

Transform A to upper triangular (Schur form):
```
A_k = Q_k R_k  (QR factorization)
A_{k+1} = R_k Q_k
```

Diagonal of limit matrix contains eigenvalues.

### Jacobi Method

For symmetric matrices, eliminate off-diagonal elements using rotations:
```
A_{k+1} = G_k^T A_k G_k
```

where G is a Givens rotation.

### Rayleigh Quotient Iteration

Adaptive shift using Rayleigh quotient:
```
σ_k = x_k^T A x_k / x_k^T x_k
(A - σ_k I) y_{k+1} = x_k
```

**Convergence:** Cubic (fastest)

## Convergence Rates

| Method | Convergence | Best For |
|--------|-------------|----------|
| Power | Linear | Dominant eigenvalue |
| Inverse Power | Linear | Smallest eigenvalue |
| QR | Cubic | All eigenvalues |
| Jacobi | Quadratic | Symmetric matrices |
| Rayleigh | Cubic | Single eigenvalue |

## Sample Matrices

| Type | Description |
|------|-------------|
| Symmetric | Real eigenvalues, orthogonal eigenvectors |
| Diagonal | Eigenvalues on diagonal |
| Hilbert | Ill-conditioned, all positive eigenvalues |
| Rotation | Complex eigenvalues (unit circle) |
| Stochastic | Dominant eigenvalue = 1 |

## Theoretical Background

### Characteristic Polynomial
```
det(A - λI) = 0
```

### Spectral Theorem
Symmetric matrices have:
- Real eigenvalues
- Orthogonal eigenvectors
- A = VΛV^T decomposition

### Gershgorin Circle Theorem
Eigenvalues lie in disks centered at diagonal elements.

## Performance

| Method | Matrix Size | Typical Time |
|--------|-------------|--------------|
| Power | 5×5 | < 10ms |
| Inverse | 5×5 | < 20ms |
| QR | 5×5 | < 50ms |
| Jacobi | 5×5 | < 100ms |
| Rayleigh | 5×5 | < 10ms |

## Applications

### Data Science
- Principal Component Analysis (PCA)
- Dimensionality reduction
- Spectral clustering

### Physics
- Quantum mechanics (energy levels)
- Vibration analysis (natural frequencies)
- Stability analysis

### Engineering
- Structural dynamics
- Control systems (stability)
- Signal processing (filters)

### Network Science
- Google PageRank
- Community detection
- Centrality measures

## Tips for Better Results

1. **For dominant eigenvalue:** Use Power Method
2. **For all eigenvalues:** Use QR Algorithm
3. **For symmetric matrices:** Use Jacobi (also gets eigenvectors)
4. **For specific eigenvalue:** Use Inverse Power with shift
5. **For fast convergence:** Use Rayleigh Quotient Iteration

## Numerical Considerations

### Conditioning
- Hilbert matrices are ill-conditioned
- Small perturbations can cause large changes in eigenvalues

### Complex Eigenvalues
- Real non-symmetric matrices may have complex eigenvalues
- Current implementation handles real eigenvalues only

### Deflation
- After finding one eigenvalue, can "deflate" to find others
- QR Algorithm does this automatically

## Browser Support

All modern browsers with Web Worker support.

## References

- [Eigenvalue Algorithm](https://en.wikipedia.org/wiki/Eigenvalue_algorithm)
- [Power Iteration](https://en.wikipedia.org/wiki/Power_iteration)
- [QR Algorithm](https://en.wikipedia.org/wiki/QR_algorithm)
- [Jacobi Eigenvalue Algorithm](https://en.wikipedia.org/wiki/Jacobi_eigenvalue_algorithm)

## License

MIT License
