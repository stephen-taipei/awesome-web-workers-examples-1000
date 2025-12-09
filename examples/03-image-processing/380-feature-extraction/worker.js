// Feature Extraction Worker
// Implements a simplified SIFT-like algorithm:
// 1. Grayscale conversion
// 2. Difference of Gaussians (DoG) for keypoint detection
// 3. Orientation assignment

self.onmessage = function(e) {
    const { imageData, params } = e.data;
    const { width, height, data } = imageData;
    const { threshold, maxKeypoints } = params;

    try {
        const startTime = performance.now();

        // 1. Convert to grayscale
        self.postMessage({ type: 'progress', progress: 10, message: '轉換灰階...' });
        const gray = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) {
            // Rec. 601 luma
            gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
        }

        // 2. Compute Gaussian Blurs at different scales
        // Simplified: using 3 scales (simulated octaves)
        self.postMessage({ type: 'progress', progress: 30, message: '計算高斯模糊...' });

        const sigma1 = 1.6;
        const sigma2 = 2.0; // k * sigma1
        // const sigma3 = 2.5; // k^2 * sigma1

        const blur1 = applyGaussianBlur(gray, width, height, sigma1);
        self.postMessage({ type: 'progress', progress: 40, message: '計算高斯模糊 (2/2)...' });
        const blur2 = applyGaussianBlur(gray, width, height, sigma2);

        // 3. Difference of Gaussians (DoG)
        self.postMessage({ type: 'progress', progress: 50, message: '計算高斯差分...' });
        const dog = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) {
            dog[i] = blur2[i] - blur1[i];
        }

        // 4. Keypoint Detection (Local Extrema)
        self.postMessage({ type: 'progress', progress: 60, message: '檢測關鍵點...' });
        let keypoints = detectExtrema(dog, width, height, threshold);

        // 5. Orientation Assignment
        self.postMessage({ type: 'progress', progress: 80, message: '計算方向...' });
        assignOrientations(keypoints, blur1, width, height);

        // Sort by magnitude/strength (simplified here as raw DoG response)
        keypoints.sort((a, b) => Math.abs(b.response) - Math.abs(a.response));

        // Limit keypoints
        if (keypoints.length > maxKeypoints) {
            keypoints = keypoints.slice(0, maxKeypoints);
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: { keypoints },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

// Gaussian Blur (Separable)
function applyGaussianBlur(data, width, height, sigma) {
    const kernelSize = Math.ceil(sigma * 3) * 2 + 1;
    const kernel = createGaussianKernel(sigma, kernelSize);

    // Horizontal pass
    const temp = new Float32Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            let weightSum = 0;
            for (let k = 0; k < kernelSize; k++) {
                const offset = k - Math.floor(kernelSize / 2);
                const px = Math.min(Math.max(x + offset, 0), width - 1);
                sum += data[y * width + px] * kernel[k];
                weightSum += kernel[k];
            }
            temp[y * width + x] = sum / weightSum;
        }
    }

    // Vertical pass
    const result = new Float32Array(width * height);
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            let sum = 0;
            let weightSum = 0;
            for (let k = 0; k < kernelSize; k++) {
                const offset = k - Math.floor(kernelSize / 2);
                const py = Math.min(Math.max(y + offset, 0), height - 1);
                sum += temp[py * width + x] * kernel[k];
                weightSum += kernel[k];
            }
            result[y * width + x] = sum / weightSum;
        }
    }

    return result;
}

function createGaussianKernel(sigma, size) {
    const kernel = new Float32Array(size);
    const center = Math.floor(size / 2);
    let sum = 0;

    for (let i = 0; i < size; i++) {
        const x = i - center;
        const g = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernel[i] = g;
        sum += g;
    }

    // Normalize
    for (let i = 0; i < size; i++) {
        kernel[i] /= sum;
    }

    return kernel;
}

// Detect Local Extrema in DoG image (simplified to 2D local maxima/minima with threshold)
// Real SIFT checks 26 neighbors in 3D space (scale, x, y), here we check 8 neighbors in 2D for simplicity
function detectExtrema(dog, width, height, threshold) {
    const keypoints = [];
    const border = 5;

    for (let y = border; y < height - border; y++) {
        for (let x = border; x < width - border; x++) {
            const val = dog[y * width + x];

            // Contrast threshold check
            if (Math.abs(val) < threshold) continue;

            let isMax = true;
            let isMin = true;

            // Check 8 neighbors
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    const neighbor = dog[(y + dy) * width + (x + dx)];

                    if (neighbor >= val) isMax = false;
                    if (neighbor <= val) isMin = false;
                }
            }

            if (isMax || isMin) {
                keypoints.push({
                    x, y,
                    response: val,
                    size: 3 // Default visual size
                });
            }
        }
    }
    return keypoints;
}

// Assign Orientation based on Gradient Histograms
function assignOrientations(keypoints, img, width, height) {
    const radius = 3; // Window radius

    for (let k = 0; k < keypoints.length; k++) {
        const kp = keypoints[k];
        const cx = kp.x;
        const cy = kp.y;

        const histogram = new Float32Array(36); // 36 bins (10 degrees each)

        for (let y = -radius; y <= radius; y++) {
            for (let x = -radius; x <= radius; x++) {
                // Bounds check already roughly handled by keypoint border skip
                const px = cx + x;
                const py = cy + y;

                // Calculate gradient
                const idx = py * width + px;
                const idxRight = py * width + (px + 1);
                const idxLeft = py * width + (px - 1);
                const idxDown = (py + 1) * width + px;
                const idxUp = (py - 1) * width + px;

                // Simple central difference
                const dx = (img[idxRight] - img[idxLeft]) * 0.5;
                const dy = (img[idxDown] - img[idxUp]) * 0.5;

                const magnitude = Math.sqrt(dx * dx + dy * dy);
                let angle = Math.atan2(dy, dx) * (180 / Math.PI); // -180 to 180

                if (angle < 0) angle += 360;

                const bin = Math.floor(angle / 10) % 36;

                // Gaussian weight window (sigma = 1.5 * scale, let scale=1.0)
                const weight = Math.exp(-(x * x + y * y) / (2 * 1.5 * 1.5));

                histogram[bin] += magnitude * weight;
            }
        }

        // Find dominant orientation
        let maxBin = 0;
        let maxVal = 0;
        for (let i = 0; i < 36; i++) {
            if (histogram[i] > maxVal) {
                maxVal = histogram[i];
                maxBin = i;
            }
        }

        // Parabolic interpolation for more accurate peak
        // ... omitted for simplicity

        const angleRad = (maxBin * 10 + 5) * (Math.PI / 180); // Center of bin
        kp.angle = angleRad;
    }
}
