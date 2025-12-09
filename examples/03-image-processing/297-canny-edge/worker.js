/**
 * Canny Edge Detection Web Worker
 */

self.onmessage = function(event) {
    const { type, payload } = event.data;
    switch (type) {
        case 'APPLY_CANNY':
            applyCanny(payload);
            break;
        default:
            self.postMessage({ type: 'ERROR', payload: { message: `未知的訊息類型: ${type}` } });
    }
};

function applyCanny(payload) {
    const { imageData, sigma, highThreshold, lowThreshold } = payload;
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;

    // 1. Grayscale
    const gray = toGrayscale(imageData.data, width, height);
    self.postMessage({ type: 'PROGRESS', payload: { percent: 10, message: '灰階轉換完成...' } });

    // 2. Gaussian Blur
    const blurred = gaussianBlur(gray, width, height, sigma);
    self.postMessage({ type: 'PROGRESS', payload: { percent: 30, message: '高斯模糊完成...' } });

    // 3. Sobel Gradient
    const { magnitude, direction } = computeGradients(blurred, width, height);
    self.postMessage({ type: 'PROGRESS', payload: { percent: 50, message: '梯度計算完成...' } });

    // 4. Non-Maximum Suppression
    const suppressed = nonMaximumSuppression(magnitude, direction, width, height);
    self.postMessage({ type: 'PROGRESS', payload: { percent: 70, message: '非極大值抑制完成...' } });

    // 5. Double Threshold & Hysteresis
    const edges = hysteresis(suppressed, width, height, highThreshold, lowThreshold);
    self.postMessage({ type: 'PROGRESS', payload: { percent: 90, message: '邊緣追蹤完成...' } });

    // Output
    const dstData = new Uint8ClampedArray(width * height * 4);
    for (let i = 0; i < width * height; i++) {
        const val = edges[i];
        dstData[i*4] = val;
        dstData[i*4+1] = val;
        dstData[i*4+2] = val;
        dstData[i*4+3] = 255;
    }

    const endTime = performance.now();
    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: new ImageData(dstData, width, height),
            sigma,
            highThreshold,
            lowThreshold,
            duration: endTime - startTime
        }
    }, [dstData.buffer]);
}

function toGrayscale(data, width, height) {
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        gray[i] = 0.299 * data[i*4] + 0.587 * data[i*4+1] + 0.114 * data[i*4+2];
    }
    return gray;
}

function gaussianBlur(src, width, height, sigma) {
    // Generate 1D kernel
    const size = Math.ceil(sigma * 6);
    const kernelSize = size % 2 === 0 ? size + 1 : size;
    const half = Math.floor(kernelSize / 2);
    const kernel = new Float32Array(kernelSize);
    let sum = 0;

    for (let i = 0; i < kernelSize; i++) {
        const x = i - half;
        const val = Math.exp(-(x*x) / (2*sigma*sigma));
        kernel[i] = val;
        sum += val;
    }
    // Normalize
    for (let i = 0; i < kernelSize; i++) kernel[i] /= sum;

    // Separable convolution
    const temp = new Float32Array(src.length);
    const dst = new Float32Array(src.length);

    // Horizontal
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let s = 0;
            for (let k = 0; k < kernelSize; k++) {
                const kx = x + (k - half);
                // Clamp
                const cx = Math.min(Math.max(kx, 0), width - 1);
                s += src[y*width + cx] * kernel[k];
            }
            temp[y*width + x] = s;
        }
    }

    // Vertical
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let s = 0;
            for (let k = 0; k < kernelSize; k++) {
                const ky = y + (k - half);
                const cy = Math.min(Math.max(ky, 0), height - 1);
                s += temp[cy*width + x] * kernel[k];
            }
            dst[y*width + x] = s;
        }
    }
    return dst;
}

function computeGradients(src, width, height) {
    const magnitude = new Float32Array(src.length);
    const direction = new Float32Array(src.length); // stores quantized direction (0, 45, 90, 135)

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            // Sobel
            // Gx
            const gx = -1*src[(y-1)*width + (x-1)] + 1*src[(y-1)*width + (x+1)]
                       -2*src[y*width + (x-1)]     + 2*src[y*width + (x+1)]
                       -1*src[(y+1)*width + (x-1)] + 1*src[(y+1)*width + (x+1)];

            // Gy
            const gy = -1*src[(y-1)*width + (x-1)] - 2*src[(y-1)*width + x] - 1*src[(y-1)*width + (x+1)]
                       +1*src[(y+1)*width + (x-1)] + 2*src[(y+1)*width + x] + 1*src[(y+1)*width + (x+1)];

            magnitude[y*width + x] = Math.sqrt(gx*gx + gy*gy);

            let angle = Math.atan2(gy, gx) * (180 / Math.PI);
            if (angle < 0) angle += 180; // 0-180

            // Quantize angle to 0, 45, 90, 135
            // 0: [0, 22.5) U [157.5, 180]
            // 45: [22.5, 67.5)
            // 90: [67.5, 112.5)
            // 135: [112.5, 157.5)

            let q = 0;
            if (angle >= 22.5 && angle < 67.5) q = 45;
            else if (angle >= 67.5 && angle < 112.5) q = 90;
            else if (angle >= 112.5 && angle < 157.5) q = 135;

            direction[y*width + x] = q;
        }
    }
    return { magnitude, direction };
}

function nonMaximumSuppression(mag, dir, width, height) {
    const dst = new Float32Array(mag.length);

    for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
            const angle = dir[y*width + x];
            const m = mag[y*width + x];
            let m1 = 0, m2 = 0;

            if (angle === 0) {
                m1 = mag[y*width + (x-1)];
                m2 = mag[y*width + (x+1)];
            } else if (angle === 45) {
                // 45 degrees (Gradient \): Check Top-Left (x-1, y-1) and Bottom-Right (x+1, y+1)
                m1 = mag[(y-1)*width + (x-1)];
                m2 = mag[(y+1)*width + (x+1)];
            } else if (angle === 90) {
                m1 = mag[(y-1)*width + x];
                m2 = mag[(y+1)*width + x];
            } else if (angle === 135) {
                // 135 degrees (Gradient /): Check Top-Right (x+1, y-1) and Bottom-Left (x-1, y+1)
                m1 = mag[(y-1)*width + (x+1)];
                m2 = mag[(y+1)*width + (x-1)];
            }

            if (m >= m1 && m >= m2) {
                dst[y*width + x] = m;
            } else {
                dst[y*width + x] = 0;
            }
        }
    }
    return dst;
}

function hysteresis(src, width, height, highThresh, lowThresh) {
    const dst = new Uint8Array(src.length); // 0, 128 (weak), 255 (strong)
    const stack = [];

    // 1. Thresholding
    for (let i = 0; i < src.length; i++) {
        if (src[i] >= highThresh) {
            dst[i] = 255;
            stack.push(i); // Strong edge
        } else if (src[i] >= lowThresh) {
            dst[i] = 128; // Weak edge
        } else {
            dst[i] = 0; // Non-edge
        }
    }

    // 2. Edge Tracking
    while (stack.length > 0) {
        const idx = stack.pop();
        const x = idx % width;
        const y = Math.floor(idx / width);

        // Check 8 neighbors
        for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
                if (kx === 0 && ky === 0) continue;

                const nx = x + kx;
                const ny = y + ky;

                if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                    const nIdx = ny * width + nx;
                    if (dst[nIdx] === 128) { // If weak edge
                        dst[nIdx] = 255; // Promote to strong
                        stack.push(nIdx); // Add to stack to check its neighbors
                    }
                }
            }
        }
    }

    // Clear remaining weak edges
    for (let i = 0; i < dst.length; i++) {
        if (dst[i] === 128) dst[i] = 0;
    }

    return dst;
}
