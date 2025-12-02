# #045 Polynomial Regression

## Overview

A Web Worker implementation for polynomial regression using matrix-based least squares, fitting curves of degree N to data points.

## What is Polynomial Regression?

Polynomial regression extends linear regression by fitting a polynomial curve (degree 2 or higher) to data, capturing non-linear relationships while still using linear algebra techniques.

## Features

| Feature | Description |
|---------|-------------|
| Variable Degree | Fit polynomials from degree 1-10 |
| Matrix Solution | Uses Vandermonde matrix and normal equations |
| Degree Comparison | Compare models across different degrees |
| Model Selection | AIC, BIC, Adjusted R² criteria |
| Predictions | Predict Y for new X values |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with polynomial algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation mode
2. Enter X and Y data points
3. Choose polynomial degree
4. Click "Fit Polynomial"

## The Model

```
y = β₀ + β₁x + β₂x² + ... + βₙxⁿ + ε
```

## Method: Normal Equations

The coefficients are found by solving:

```
(X'X)β = X'y

Where X is the Vandermonde matrix:
| 1  x₁   x₁²  ... x₁ⁿ |
| 1  x₂   x₂²  ... x₂ⁿ |
| ...                   |
| 1  xₘ   xₘ²  ... xₘⁿ |
```

## Degree Selection

| Degree | Curve Type | Turning Points |
|--------|------------|----------------|
| 1 | Linear | 0 |
| 2 | Quadratic | 1 |
| 3 | Cubic | 2 |
| n | n-th degree | n-1 |

## Model Selection Criteria

### AIC (Akaike Information Criterion)
```
AIC = n × ln(SSR/n) + 2k
```
Lower is better. Penalizes model complexity.

### BIC (Bayesian Information Criterion)
```
BIC = n × ln(SSR/n) + k × ln(n)
```
Lower is better. Stronger penalty for parameters.

### Adjusted R²
```
Adj R² = 1 - (1 - R²)(n - 1)/(n - k - 1)
```
Adjusts R² for number of parameters.

## Overfitting Warning

High-degree polynomials can:
- Fit training data perfectly
- Perform poorly on new data
- Create unrealistic oscillations
- Be numerically unstable

**Best Practices:**
- Start with low degrees
- Use cross-validation
- Compare AIC/BIC values
- Consider domain knowledge

## Performance

| Data Points | Degree | Approximate Time |
|-------------|--------|------------------|
| 1,000 | 5 | < 20ms |
| 10,000 | 5 | < 100ms |
| 100,000 | 5 | < 500ms |

Higher degrees increase computation time.

## Use Cases

- **Curve Fitting**: Non-linear trend modeling
- **Physics**: Motion equations
- **Economics**: Cost/production curves
- **Biology**: Growth curves
- **Engineering**: Calibration curves

## Limitations

- Requires n > degree + 1 data points
- Degree > 10 may cause numerical instability
- Extrapolation can be unreliable

## Browser Support

All modern browsers with Web Worker support.

## References

- [Polynomial Regression](https://en.wikipedia.org/wiki/Polynomial_regression)
- [Vandermonde Matrix](https://en.wikipedia.org/wiki/Vandermonde_matrix)
- [Model Selection](https://en.wikipedia.org/wiki/Model_selection)

## License

MIT License
