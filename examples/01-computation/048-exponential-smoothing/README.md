# #048 Exponential Smoothing

## Overview

A Web Worker implementation for exponential smoothing methods including Single (SES), Double (Holt), and Triple (Holt-Winters) exponential smoothing for time series forecasting.

## What is Exponential Smoothing?

Exponential smoothing methods weight past observations with exponentially decreasing weights. More recent observations receive higher weights, making these methods effective for time series forecasting.

## Features

| Feature | Description |
|---------|-------------|
| Single ES | Level smoothing for stationary data |
| Double ES | Holt's method for trending data |
| Triple ES | Holt-Winters for trend + seasonality |
| Parameter Optimization | Grid search for best parameters |
| Auto Forecasting | Automatic method selection |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and chart rendering |
| `worker.js` | Web Worker with smoothing algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Enter time series data
2. Select smoothing method
3. Adjust parameters (α, β, γ)
4. Click "Apply Smoothing"

## Methods

### Single Exponential Smoothing (SES)

Best for: Data with no trend or seasonality

```
S(t) = α × Y(t) + (1 - α) × S(t-1)
```

### Double Exponential Smoothing (Holt's Method)

Best for: Data with trend but no seasonality

```
Level:  L(t) = α × Y(t) + (1 - α) × (L(t-1) + T(t-1))
Trend:  T(t) = β × (L(t) - L(t-1)) + (1 - β) × T(t-1)
```

### Triple Exponential Smoothing (Holt-Winters)

Best for: Data with both trend and seasonality

```
Level:    L(t) = α × (Y(t)/S(t-m)) + (1-α) × (L(t-1) + T(t-1))
Trend:    T(t) = β × (L(t) - L(t-1)) + (1-β) × T(t-1)
Seasonal: S(t) = γ × (Y(t)/L(t)) + (1-γ) × S(t-m)
```

## Parameters

| Parameter | Symbol | Range | Effect |
|-----------|--------|-------|--------|
| Level | α | 0-1 | Weight on recent level |
| Trend | β | 0-1 | Weight on recent trend |
| Seasonal | γ | 0-1 | Weight on recent seasonality |

### Parameter Guidelines

| Value | Effect |
|-------|--------|
| Close to 0 | Slow adaptation, smoother |
| Close to 1 | Fast adaptation, more reactive |

## Accuracy Metrics

| Metric | Description |
|--------|-------------|
| MSE | Mean Squared Error |
| RMSE | Root Mean Squared Error |
| MAE | Mean Absolute Error |
| MAPE | Mean Absolute Percentage Error |
| Bias | Average forecast error |

## Method Selection Guide

| Data Pattern | Recommended Method |
|--------------|-------------------|
| No trend, no seasonality | Single ES |
| Trend, no seasonality | Double ES |
| Trend + seasonality | Triple ES |
| Uncertain | Use Auto Forecast |

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 100 | < 10ms |
| 1,000 | < 50ms |
| 10,000 | < 200ms |

## Use Cases

- **Sales Forecasting**: Predict future sales
- **Demand Planning**: Inventory optimization
- **Financial Markets**: Price trend analysis
- **Quality Control**: Process monitoring
- **Resource Planning**: Capacity forecasting

## Browser Support

All modern browsers with Web Worker support.

## References

- [Exponential Smoothing](https://en.wikipedia.org/wiki/Exponential_smoothing)
- [Holt-Winters Method](https://en.wikipedia.org/wiki/Exponential_smoothing#Triple_exponential_smoothing_(Holt_Winters))
- [Time Series Forecasting](https://otexts.com/fpp3/expsmooth.html)

## License

MIT License
