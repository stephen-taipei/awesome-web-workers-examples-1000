/**
 * Web Worker: Convolution Operations
 * Implements 1D and 2D convolution for signal and image processing
 */

self.onmessage = function(e) {
    const { type, data } = e.data;
    const startTime = performance.now();

    try {
        let result;

        switch (type) {
            case 'convolve1d':
                result = convolve1D(data.signal, data.kernel, data.mode);
                break;
            case 'convolve2d':
                result = convolve2D(data.matrix, data.kernel, data.mode);
                break;
            case 'filter1d':
                result = applyFilter1D(data.signal, data.filterType);
                break;
            case 'filter2d':
                result = applyFilter2D(data.matrix, data.filterType);
                break;
            case 'custom':
                result = customConvolution(data.signal, data.kernel);
                break;
            default:
                throw new Error('Unknown calculation type');
        }

        const executionTime = (performance.now() - startTime).toFixed(2);
        self.postMessage({ type: 'result', calculationType: type, result, executionTime });
    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};

// Predefined 1D kernels
const KERNELS_1D = {
    smooth3: { name: 'Smoothing (3-point)', kernel: [1/3, 1/3, 1/3] },
    smooth5: { name: 'Smoothing (5-point)', kernel: [1/5, 1/5, 1/5, 1/5, 1/5] },
    gaussian: { name: 'Gaussian', kernel: [0.0625, 0.25, 0.375, 0.25, 0.0625] },
    derivative: { name: 'Derivative', kernel: [-1, 0, 1] },
    laplacian: { name: 'Laplacian', kernel: [1, -2, 1] },
    highpass: { name: 'High-pass', kernel: [-1, 2, -1] },
    lowpass: { name: 'Low-pass', kernel: [0.25, 0.5, 0.25] }
};

// Predefined 2D kernels
const KERNELS_2D = {
    identity: {
        name: 'Identity',
        kernel: [[0, 0, 0], [0, 1, 0], [0, 0, 0]]
    },
    blur: {
        name: 'Box Blur',
        kernel: [[1/9, 1/9, 1/9], [1/9, 1/9, 1/9], [1/9, 1/9, 1/9]]
    },
    gaussian: {
        name: 'Gaussian Blur',
        kernel: [[1/16, 2/16, 1/16], [2/16, 4/16, 2/16], [1/16, 2/16, 1/16]]
    },
    sharpen: {
        name: 'Sharpen',
        kernel: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]
    },
    edgeDetect: {
        name: 'Edge Detection',
        kernel: [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]
    },
    sobelX: {
        name: 'Sobel X',
        kernel: [[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]
    },
    sobelY: {
        name: 'Sobel Y',
        kernel: [[-1, -2, -1], [0, 0, 0], [1, 2, 1]]
    },
    emboss: {
        name: 'Emboss',
        kernel: [[-2, -1, 0], [-1, 1, 1], [0, 1, 2]]
    },
    laplacian: {
        name: 'Laplacian',
        kernel: [[0, 1, 0], [1, -4, 1], [0, 1, 0]]
    }
};

/**
 * 1D Convolution
 */
function convolve1D(signal, kernel, mode = 'same') {
    const n = signal.length;
    const m = kernel.length;

    self.postMessage({ type: 'progress', percentage: 10 });

    let output;
    let outputLength;

    if (mode === 'full') {
        outputLength = n + m - 1;
    } else if (mode === 'valid') {
        outputLength = Math.max(n - m + 1, 0);
    } else { // 'same'
        outputLength = n;
    }

    output = new Array(outputLength).fill(0);

    // Compute convolution
    for (let i = 0; i < outputLength; i++) {
        if (i % Math.max(1, Math.floor(outputLength / 20)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((i / outputLength) * 80) });
        }

        let sum = 0;
        for (let j = 0; j < m; j++) {
            let signalIdx;

            if (mode === 'full') {
                signalIdx = i - j;
            } else if (mode === 'valid') {
                signalIdx = i + j;
            } else { // 'same'
                signalIdx = i - Math.floor(m / 2) + j;
            }

            if (signalIdx >= 0 && signalIdx < n) {
                sum += signal[signalIdx] * kernel[j];
            }
        }
        output[i] = sum;
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Calculate statistics
    const maxAbs = Math.max(...output.map(Math.abs));
    const energy = output.reduce((sum, v) => sum + v * v, 0);

    return {
        mode,
        kernelSize: m,
        inputLength: n,
        outputLength,
        output,
        kernel,
        stats: {
            maxAbsValue: maxAbs.toFixed(4),
            energy: energy.toFixed(4),
            rms: Math.sqrt(energy / outputLength).toFixed(4)
        }
    };
}

/**
 * 2D Convolution
 */
function convolve2D(matrix, kernel, mode = 'same') {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const kRows = kernel.length;
    const kCols = kernel[0].length;

    const kCenterRow = Math.floor(kRows / 2);
    const kCenterCol = Math.floor(kCols / 2);

    self.postMessage({ type: 'progress', percentage: 10 });

    let output;
    let outRows, outCols;

    if (mode === 'full') {
        outRows = rows + kRows - 1;
        outCols = cols + kCols - 1;
    } else if (mode === 'valid') {
        outRows = Math.max(rows - kRows + 1, 0);
        outCols = Math.max(cols - kCols + 1, 0);
    } else { // 'same'
        outRows = rows;
        outCols = cols;
    }

    output = Array.from({ length: outRows }, () => new Array(outCols).fill(0));

    // Compute convolution
    for (let i = 0; i < outRows; i++) {
        if (i % Math.max(1, Math.floor(outRows / 10)) === 0) {
            self.postMessage({ type: 'progress', percentage: 10 + Math.round((i / outRows) * 80) });
        }

        for (let j = 0; j < outCols; j++) {
            let sum = 0;

            for (let ki = 0; ki < kRows; ki++) {
                for (let kj = 0; kj < kCols; kj++) {
                    let matRow, matCol;

                    if (mode === 'full') {
                        matRow = i - ki;
                        matCol = j - kj;
                    } else if (mode === 'valid') {
                        matRow = i + ki;
                        matCol = j + kj;
                    } else { // 'same'
                        matRow = i - kCenterRow + ki;
                        matCol = j - kCenterCol + kj;
                    }

                    if (matRow >= 0 && matRow < rows && matCol >= 0 && matCol < cols) {
                        sum += matrix[matRow][matCol] * kernel[ki][kj];
                    }
                }
            }
            output[i][j] = sum;
        }
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    // Calculate statistics
    let minVal = Infinity, maxVal = -Infinity, sum = 0;
    for (const row of output) {
        for (const v of row) {
            minVal = Math.min(minVal, v);
            maxVal = Math.max(maxVal, v);
            sum += v;
        }
    }

    return {
        mode,
        kernelSize: `${kRows}x${kCols}`,
        inputSize: `${rows}x${cols}`,
        outputSize: `${outRows}x${outCols}`,
        output,
        kernel,
        stats: {
            min: minVal.toFixed(4),
            max: maxVal.toFixed(4),
            mean: (sum / (outRows * outCols)).toFixed(4)
        }
    };
}

/**
 * Apply predefined 1D filter
 */
function applyFilter1D(signal, filterType) {
    const filterInfo = KERNELS_1D[filterType];
    if (!filterInfo) {
        throw new Error(`Unknown filter type: ${filterType}`);
    }

    const result = convolve1D(signal, filterInfo.kernel, 'same');

    return {
        filterName: filterInfo.name,
        filterType,
        original: signal,
        ...result
    };
}

/**
 * Apply predefined 2D filter
 */
function applyFilter2D(matrix, filterType) {
    const filterInfo = KERNELS_2D[filterType];
    if (!filterInfo) {
        throw new Error(`Unknown filter type: ${filterType}`);
    }

    const result = convolve2D(matrix, filterInfo.kernel, 'same');

    return {
        filterName: filterInfo.name,
        filterType,
        original: matrix,
        ...result
    };
}

/**
 * Custom convolution with analysis
 */
function customConvolution(signal, kernel) {
    self.postMessage({ type: 'progress', percentage: 10 });

    // Compute all three modes
    const fullResult = convolve1D(signal, kernel, 'full');
    self.postMessage({ type: 'progress', percentage: 40 });

    const sameResult = convolve1D(signal, kernel, 'same');
    self.postMessage({ type: 'progress', percentage: 70 });

    const validResult = convolve1D(signal, kernel, 'valid');
    self.postMessage({ type: 'progress', percentage: 90 });

    // Analyze kernel properties
    const kernelSum = kernel.reduce((a, b) => a + b, 0);
    const isNormalized = Math.abs(kernelSum - 1) < 0.001;
    const isSymmetric = kernel.every((v, i) => Math.abs(v - kernel[kernel.length - 1 - i]) < 0.001);

    // Determine kernel type
    let kernelType = 'Custom';
    if (Math.abs(kernelSum) < 0.001) {
        kernelType = 'High-pass / Derivative';
    } else if (isNormalized) {
        kernelType = 'Low-pass / Smoothing';
    }

    self.postMessage({ type: 'progress', percentage: 100 });

    return {
        original: signal,
        kernel,
        kernelAnalysis: {
            sum: kernelSum.toFixed(4),
            isNormalized,
            isSymmetric,
            type: kernelType
        },
        results: {
            full: fullResult,
            same: sameResult,
            valid: validResult
        }
    };
}
