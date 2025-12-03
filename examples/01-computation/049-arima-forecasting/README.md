# #049 ARIMA Forecasting

## Overview

A Web Worker implementation for ARIMA (AutoRegressive Integrated Moving Average) time series forecasting, including AR, MA, ARMA models and automatic model selection.

## What is ARIMA?

ARIMA is a popular statistical method for time series forecasting that combines:
- **AR** (AutoRegressive): Relationship between observation and lagged observations
- **I** (Integrated): Differencing to achieve stationarity
- **MA** (Moving Average): Relationship between observation and residual errors

## Features

| Feature | Description |
|---------|-------------|
| AR(p) | Pure autoregressive model |
| MA(q) | Pure moving average model |
| ARMA(p,q) | Combined AR and MA |
| ARIMA(p,d,q) | With differencing |
| Auto ARIMA | Automatic parameter selection |
| Forecasting | Multi-step ahead predictions |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with ARIMA algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Enter time series data (at least 10 values)
2. Select model type
3. Set order parameters (p, d, q)
4. Click "Fit Model"

## The ARIMA Model

### General Form

```
ARIMA(p, d, q)
```

Where:
- **p**: Number of autoregressive terms
- **d**: Degree of differencing
- **q**: Number of moving average terms

### AR Component

```
Y(t) = c + φ₁Y(t-1) + φ₂Y(t-2) + ... + φₚY(t-p) + ε(t)
```

### MA Component

```
Y(t) = μ + ε(t) + θ₁ε(t-1) + θ₂ε(t-2) + ... + θqε(t-q)
```

### Combined ARIMA

```
Y'(t) = c + Σφᵢ Y'(t-i) + Σθⱼ ε(t-j) + ε(t)
```

Where Y' is the differenced series.

## Parameter Selection

| Parameter | How to Choose |
|-----------|---------------|
| p | PACF cutoff lag |
| d | Number of differences for stationarity |
| q | ACF cutoff lag |

## Model Selection Criteria

| Criterion | Description |
|-----------|-------------|
| AIC | Akaike Information Criterion |
| BIC | Bayesian Information Criterion |
| RMSE | Root Mean Square Error |

Lower values indicate better models.

## Common Models

| Model | Description |
|-------|-------------|
| ARIMA(0,0,0) | White noise |
| ARIMA(1,0,0) | AR(1) process |
| ARIMA(0,0,1) | MA(1) process |
| ARIMA(0,1,0) | Random walk |
| ARIMA(0,1,1) | Simple exponential smoothing |
| ARIMA(1,1,1) | Common choice for many series |

## Output

- Model coefficients (φ, θ)
- Fitted values
- Residuals
- ACF plot
- Accuracy metrics (RMSE, MAE, MAPE)
- Forecasts with confidence intervals

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 50 | < 50ms |
| 200 | < 200ms |
| 1000 | < 1s |

## Use Cases

- **Economics**: GDP, inflation forecasting
- **Finance**: Stock price prediction
- **Sales**: Demand forecasting
- **Weather**: Temperature trends
- **Energy**: Load forecasting

## Limitations

- Assumes linear relationships
- Requires stationary data (after differencing)
- May not capture complex patterns
- Not suitable for very short series

## Browser Support

All modern browsers with Web Worker support.

## References

- [ARIMA Model](https://en.wikipedia.org/wiki/Autoregressive_integrated_moving_average)
- [Box-Jenkins Method](https://en.wikipedia.org/wiki/Box%E2%80%93Jenkins_method)
- [Time Series Analysis](https://otexts.com/fpp3/arima.html)

## License

MIT License
