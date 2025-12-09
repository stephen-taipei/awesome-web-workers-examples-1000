# #044 Linear Regression

## Overview

A Web Worker implementation for simple linear regression using the Ordinary Least Squares (OLS) method to fit a line to data points.

## What is Linear Regression?

Linear regression models the relationship between a dependent variable (Y) and an independent variable (X) by fitting a straight line that minimizes the sum of squared residuals.

## Features

| Feature | Description |
|---------|-------------|
| OLS Fitting | Ordinary Least Squares estimation |
| R-squared | Coefficient of determination |
| Predictions | Predict Y for new X values |
| Confidence Intervals | 95% prediction intervals |
| Residual Analysis | Outlier detection, Durbin-Watson |
| ANOVA Table | Sum of squares breakdown |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with regression algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select calculation mode
2. Enter X and Y data points
3. Click "Fit Regression"

## The Model

```
y = β₀ + β₁x + ε

Where:
- β₀ = intercept (value of y when x = 0)
- β₁ = slope (change in y per unit change in x)
- ε = error term
```

## OLS Formulas

### Slope (β₁)

```
β₁ = Σ(xᵢ - x̄)(yᵢ - ȳ) / Σ(xᵢ - x̄)²
   = (Σxᵢyᵢ - nx̄ȳ) / (Σxᵢ² - nx̄²)
```

### Intercept (β₀)

```
β₀ = ȳ - β₁x̄
```

### R-squared

```
R² = 1 - SSR/SST = SSE/SST

Where:
- SST = Σ(yᵢ - ȳ)² (Total Sum of Squares)
- SSE = Σ(ŷᵢ - ȳ)² (Explained Sum of Squares)
- SSR = Σ(yᵢ - ŷᵢ)² (Residual Sum of Squares)
```

## R² Interpretation

| R² Value | Interpretation |
|----------|----------------|
| 0.9 - 1.0 | Excellent fit |
| 0.7 - 0.9 | Good fit |
| 0.5 - 0.7 | Moderate fit |
| 0.3 - 0.5 | Weak fit |
| 0.0 - 0.3 | Poor fit |

## Statistics Provided

| Statistic | Description |
|-----------|-------------|
| R² | Proportion of variance explained |
| Adjusted R² | R² corrected for sample size |
| Standard Error | Average prediction error |
| F-statistic | Overall model significance |
| t-statistics | Parameter significance |

## ANOVA Table

| Source | SS | df | MS |
|--------|----|----|-------|
| Regression | SSE | 1 | SSE/1 |
| Residual | SSR | n-2 | SSR/(n-2) |
| Total | SST | n-1 | - |

## Assumptions

Linear regression assumes:

1. **Linearity**: Relationship is linear
2. **Independence**: Observations are independent
3. **Homoscedasticity**: Constant variance of errors
4. **Normality**: Errors are normally distributed

## Residual Analysis

### Durbin-Watson Statistic
- Tests for autocorrelation
- Range: 0 to 4
- Value near 2 indicates no autocorrelation

### Standardized Residuals
- Values > |2| may indicate outliers
- Should be approximately normally distributed

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 1,000 | < 5ms |
| 10,000 | < 15ms |
| 100,000 | < 100ms |
| 1,000,000 | < 500ms |

## Use Cases

- **Trend Analysis**: Sales forecasting
- **Scientific Studies**: Variable relationships
- **Economics**: Demand estimation
- **Engineering**: Calibration curves
- **Quality Control**: Process optimization

## Browser Support

All modern browsers with Web Worker support.

## References

- [Linear Regression - Wikipedia](https://en.wikipedia.org/wiki/Linear_regression)
- [Ordinary Least Squares](https://en.wikipedia.org/wiki/Ordinary_least_squares)
- [Coefficient of Determination](https://en.wikipedia.org/wiki/Coefficient_of_determination)

## License

MIT License
