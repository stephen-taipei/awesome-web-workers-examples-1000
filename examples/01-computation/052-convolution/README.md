# #052 Convolution

## Overview

A Web Worker implementation for 1D and 2D convolution operations, supporting signal processing and image filtering with predefined and custom kernels.

## What is Convolution?

Convolution is a mathematical operation that combines two functions (signal and kernel) to produce a third function. It's fundamental to signal processing, image filtering, and neural networks.

## Features

| Feature | Description |
|---------|-------------|
| 1D Convolution | Signal filtering |
| 2D Convolution | Image/matrix filtering |
| Predefined Filters | Common signal/image filters |
| Custom Kernels | User-defined kernels |
| Multiple Modes | Full, same, valid output |

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page |
| `main.js` | Main thread logic and visualization |
| `worker.js` | Web Worker with convolution algorithms |
| `style.css` | Stylesheet |
| `README.md` | Documentation |

## Usage

1. Select convolution type (1D/2D, filter/custom)
2. Enter signal/matrix data
3. Choose filter or enter custom kernel
4. Click "Convolve"

## Convolution Formula

### 1D Discrete Convolution

```
(f * g)[n] = Σ f[m] × g[n - m]
```

### 2D Discrete Convolution

```
(f * g)[i,j] = ΣΣ f[m,n] × g[i-m, j-n]
```

## Output Modes

| Mode | Output Size | Description |
|------|-------------|-------------|
| Full | N + M - 1 | Complete convolution |
| Same | N | Same as input size |
| Valid | N - M + 1 | Only fully overlapping |

## 1D Filters

| Filter | Kernel | Use |
|--------|--------|-----|
| Smoothing | [1/3, 1/3, 1/3] | Noise reduction |
| Gaussian | [0.0625, 0.25, 0.375, 0.25, 0.0625] | Weighted smooth |
| Derivative | [-1, 0, 1] | Edge detection |
| Laplacian | [1, -2, 1] | Second derivative |

## 2D Filters

| Filter | Effect |
|--------|--------|
| Box Blur | Uniform smoothing |
| Gaussian Blur | Weighted smoothing |
| Sharpen | Edge enhancement |
| Sobel X/Y | Gradient detection |
| Edge Detection | Find boundaries |
| Emboss | 3D relief effect |
| Laplacian | Edge detection |

## Common 2D Kernels

### Box Blur (3×3)
```
[1/9  1/9  1/9]
[1/9  1/9  1/9]
[1/9  1/9  1/9]
```

### Sharpen
```
[ 0  -1   0]
[-1   5  -1]
[ 0  -1   0]
```

### Edge Detection
```
[-1  -1  -1]
[-1   8  -1]
[-1  -1  -1]
```

### Sobel X
```
[-1   0   1]
[-2   0   2]
[-1   0   1]
```

## Applications

- **Signal Processing**: Filtering, smoothing
- **Image Processing**: Blur, sharpen, edge detection
- **Audio**: Effects, filtering
- **Neural Networks**: CNN layers
- **Computer Vision**: Feature extraction

## Performance

| Signal Size | 1D Time | 2D Time |
|-------------|---------|---------|
| 100 | < 5ms | - |
| 1000 | < 20ms | - |
| 100×100 | - | < 50ms |
| 500×500 | - | ~500ms |

## Browser Support

All modern browsers with Web Worker support.

## References

- [Convolution](https://en.wikipedia.org/wiki/Convolution)
- [Kernel (Image Processing)](https://en.wikipedia.org/wiki/Kernel_(image_processing))
- [Digital Filter](https://en.wikipedia.org/wiki/Digital_filter)

## License

MIT License
