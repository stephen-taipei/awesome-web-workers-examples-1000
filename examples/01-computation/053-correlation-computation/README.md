# #053 Correlation Computation

## Overview

A Web Worker implementation for various correlation analysis methods, including autocorrelation, cross-correlation, Pearson correlation, time delay estimation, and correlogram analysis.

## What is Correlation?

Correlation measures the statistical relationship between signals or variables. It quantifies how similar two datasets are or how a signal relates to itself at different time lags.

## Features

| Feature | Description |
|---------|-------------|
| Autocorrelation | Signal correlation with itself |
| Cross-Correlation | Similarity between two signals |
| Pearson Correlation | Linear relationship coefficient |
| Time Delay | Find optimal signal alignment |
| Correlogram | ACF/PACF analysis |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with correlation algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select analysis type
2. Enter signal data (comma or space separated)
3. Use sample buttons for test data
4. Click "Compute Correlation"

## Correlation Methods

### Autocorrelation

Measures how a signal correlates with a delayed version of itself.

```
R(k) = Σ (x[i] - μ)(x[i+k] - μ) / σ²
```

**Applications:**
- Detect periodicity in signals
- Identify repeating patterns
- Analyze stationarity

### Cross-Correlation

Measures similarity between two signals at different time shifts.

```
(f ★ g)[k] = Σ f[i] × g[i+k]
```

**Applications:**
- Template matching
- Signal synchronization
- Echo detection

### Pearson Correlation

Measures linear relationship between two variables.

```
r = Σ(x - μx)(y - μy) / (σx × σy × n)
```

**Interpretation:**
| r Value | Strength |
|---------|----------|
| 0.9-1.0 | Very strong |
| 0.7-0.9 | Strong |
| 0.5-0.7 | Moderate |
| 0.3-0.5 | Weak |
| 0.0-0.3 | Very weak |

### Time Delay Estimation

Finds the lag at which two signals are most correlated.

**Method:**
1. Compute cross-correlation
2. Find peak correlation
3. Interpolate for sub-sample precision
4. Estimate confidence from peak sharpness

### Correlogram (ACF/PACF)

**ACF (Autocorrelation Function):**
- Shows correlation at all lags
- Used for MA model identification

**PACF (Partial Autocorrelation):**
- Direct correlation after removing intermediate lags
- Used for AR model identification
- Computed via Levinson-Durbin recursion

## Output Modes

| Mode | Description |
|------|-------------|
| Full | Complete correlation output |
| Same | Same length as larger input |

## Statistical Output

### For Autocorrelation
- Lag values and correlation coefficients
- Detected peaks (potential periods)
- Estimated periodicity
- Variance

### For Pearson
- Correlation coefficient (r)
- Coefficient of determination (R²)
- Covariance
- t-statistic for significance
- Linear regression equation
- RMSE of fit

### For Correlogram
- 95% confidence bounds (±1.96/√n)
- White noise detection
- Time series model suggestions

## Performance

| Signal Size | Autocorr | Cross-Corr | Pearson |
|-------------|----------|------------|---------|
| 100 | < 5ms | < 10ms | < 2ms |
| 500 | < 20ms | < 50ms | < 5ms |
| 1000 | < 50ms | < 150ms | < 10ms |

## Applications

- **Signal Processing**: Pattern detection, noise analysis
- **Finance**: Stock correlation, lead/lag analysis
- **Audio**: Echo detection, pitch estimation
- **Radar/Sonar**: Target detection, ranging
- **Econometrics**: Time series modeling (ARIMA)
- **Neuroscience**: Neural synchronization

## Sample Data Types

| Sample | Description |
|--------|-------------|
| Periodic | Sum of sine waves |
| Noisy Sine | Sine with random noise |
| White Noise | Random uncorrelated data |
| Delayed Pair | Two signals with time shift |
| Correlated XY | Linear relationship with noise |

## Algorithm Details

### Levinson-Durbin Recursion (PACF)

```javascript
// Compute partial autocorrelation
φ[k,k] = (r[k] - Σ φ[k-1,j] × r[k-j]) / (1 - Σ φ[k-1,j] × r[j])
```

### Sub-sample Interpolation (Time Delay)

Uses parabolic interpolation around peak for precision better than sample rate.

## Browser Support

All modern browsers with Web Worker support.

## References

- [Autocorrelation](https://en.wikipedia.org/wiki/Autocorrelation)
- [Cross-correlation](https://en.wikipedia.org/wiki/Cross-correlation)
- [Pearson Correlation](https://en.wikipedia.org/wiki/Pearson_correlation_coefficient)
- [Correlogram](https://en.wikipedia.org/wiki/Correlogram)

## License

MIT License
