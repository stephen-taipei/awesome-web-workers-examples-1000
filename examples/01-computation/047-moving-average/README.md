# #047 Moving Average

## Overview

A Web Worker implementation for calculating various types of moving averages including Simple (SMA), Exponential (EMA), and Weighted (WMA) moving averages.

## What is a Moving Average?

A moving average smooths time series data by creating a constantly updated average of past values. It reduces noise and helps identify trends.

## Features

| Feature | Description |
|---------|-------------|
| SMA | Simple Moving Average - equal weights |
| EMA | Exponential Moving Average - exponential decay |
| WMA | Weighted Moving Average - linear weights |
| Comparison | Side-by-side comparison of all types |
| Analysis | Crossover detection, lag estimation |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and chart rendering |
| `worker.js` | Web Worker with MA algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Enter time series data or load sample
2. Select period (window size)
3. Choose MA type or compare all
4. Click "Calculate Moving Average"

## Types of Moving Averages

### Simple Moving Average (SMA)

```
SMA(t) = (1/n) * [X(t) + X(t-1) + ... + X(t-n+1)]
```

- Equal weight to all values in the window
- Most lag, smoothest output
- Best for: Noise reduction, long-term trends

### Exponential Moving Average (EMA)

```
EMA(t) = α * X(t) + (1-α) * EMA(t-1)
α = 2 / (n + 1)
```

- Exponentially decreasing weights
- Fastest response to changes
- Best for: Trend following, trading signals

### Weighted Moving Average (WMA)

```
WMA(t) = Σ(n-i) * X(t-i) / Σ(1 to n)
```

- Linear weights (recent values weighted more)
- Balance between SMA and EMA
- Best for: Moderate smoothing with responsiveness

## Comparison

| Property | SMA | EMA | WMA |
|----------|-----|-----|-----|
| Weight Distribution | Equal | Exponential | Linear |
| Lag | High | Low | Medium |
| Smoothness | High | Low | Medium |
| Responsiveness | Low | High | Medium |

## Output Metrics

| Metric | Description |
|--------|-------------|
| MAE | Mean Absolute Error from original |
| RMSE | Root Mean Square Error |
| Estimated Lag | Optimal lag for correlation |
| Crossovers | EMA/SMA crossover signals |

## Trading Signals

Moving average crossovers are common trading signals:

- **Bullish**: EMA crosses above SMA (uptrend signal)
- **Bearish**: EMA crosses below SMA (downtrend signal)

## Applications

- **Finance**: Stock price trends, trading signals
- **Signal Processing**: Noise reduction, filtering
- **Economics**: GDP, inflation smoothing
- **IoT**: Sensor data smoothing
- **Quality Control**: Process monitoring

## Performance

| Data Points | Approximate Time |
|-------------|------------------|
| 500 | < 10ms |
| 5,000 | < 50ms |
| 50,000 | < 200ms |

## Browser Support

All modern browsers with Web Worker support.

## References

- [Moving Average](https://en.wikipedia.org/wiki/Moving_average)
- [Exponential Smoothing](https://en.wikipedia.org/wiki/Exponential_smoothing)
- [Technical Analysis](https://en.wikipedia.org/wiki/Technical_analysis)

## License

MIT License
