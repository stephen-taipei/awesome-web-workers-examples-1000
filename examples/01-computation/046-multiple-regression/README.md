# #046 Multiple Regression

## Overview

A Web Worker implementation for multiple linear regression with multiple independent variables, including VIF analysis for multicollinearity detection.

## What is Multiple Regression?

Multiple regression extends simple linear regression to include multiple predictor variables, allowing modeling of relationships where the outcome depends on several factors simultaneously.

## Features

| Feature | Description |
|---------|-------------|
| OLS Estimation | Ordinary Least Squares fitting |
| VIF Analysis | Variance Inflation Factor for multicollinearity |
| Stepwise Selection | Forward/Backward variable selection |
| Predictions | Predict Y for new X values |
| Diagnostics | t-statistics, F-statistic, standard errors |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic |
| `worker.js` | Web Worker with regression algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Enter X matrix (multiple columns) and Y vector
2. Select calculation mode
3. Click "Fit Regression"

## Data Format

X Matrix: Each row is an observation, columns are variables
```
x1, x2, x3;    <- Observation 1
x1, x2, x3;    <- Observation 2
...
```

Y Vector: One value per observation
```
y1, y2, y3, ...
```

## The Model

```
y = β₀ + β₁x₁ + β₂x₂ + ... + βₚxₚ + ε
```

## Matrix Solution

```
β = (X'X)⁻¹X'y

Where X includes intercept column:
| 1  x₁₁  x₁₂  ... x₁ₚ |
| 1  x₂₁  x₂₂  ... x₂ₚ |
| ...                   |
| 1  xₙ₁  xₙ₂  ... xₙₚ |
```

## VIF (Variance Inflation Factor)

VIF measures multicollinearity by regressing each predictor on all others:

```
VIF_j = 1 / (1 - R²_j)
```

| VIF Value | Interpretation |
|-----------|----------------|
| 1 | No multicollinearity |
| 1-5 | Low, acceptable |
| 5-10 | Moderate, concerning |
| >10 | High, problematic |

## Stepwise Selection

### Forward Selection
1. Start with no variables
2. Add variable that most improves AIC
3. Repeat until no improvement

### Backward Elimination
1. Start with all variables
2. Remove variable that most improves AIC
3. Repeat until no improvement

## Output Statistics

| Statistic | Description |
|-----------|-------------|
| R² | Variance explained |
| Adjusted R² | R² penalized for variables |
| F-statistic | Overall model significance |
| t-statistics | Individual coefficient significance |
| Standard Errors | Coefficient uncertainty |
| AIC/BIC | Model comparison criteria |

## Assumptions

1. **Linearity**: Y is linear in X
2. **Independence**: Observations are independent
3. **Homoscedasticity**: Constant error variance
4. **Normality**: Errors are normally distributed
5. **No multicollinearity**: Variables not highly correlated

## Performance

| Observations | Variables | Approximate Time |
|--------------|-----------|------------------|
| 1,000 | 5 | < 30ms |
| 10,000 | 5 | < 100ms |
| 100,000 | 5 | < 500ms |

## Use Cases

- **Economics**: Price prediction models
- **Marketing**: Sales forecasting
- **Healthcare**: Patient outcome prediction
- **Real Estate**: Property valuation
- **Social Science**: Behavioral modeling

## Browser Support

All modern browsers with Web Worker support.

## References

- [Multiple Regression](https://en.wikipedia.org/wiki/Multiple_regression)
- [Variance Inflation Factor](https://en.wikipedia.org/wiki/Variance_inflation_factor)
- [Stepwise Regression](https://en.wikipedia.org/wiki/Stepwise_regression)

## License

MIT License
