// worker.js

self.onmessage = function(e) {
    const { imageData, threshold } = e.data;

    try {
        const startTime = performance.now();
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;

        // 1. Grayscale
        const gray = new Float32Array(width * height);
        for (let i = 0; i < width * height; i++) {
            const r = data[i * 4];
            const g = data[i * 4 + 1];
            const b = data[i * 4 + 2];
            gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
        }

        self.postMessage({ type: 'progress', data: 10 });

        // 2. Compute Gradients Ix, Iy (Sobel)
        const Ix = new Float32Array(width * height);
        const Iy = new Float32Array(width * height);

        const sobelX = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
        const sobelY = [-1, -2, -1, 0, 0, 0, 1, 2, 1];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0;
                let gy = 0;

                // Unrolled 3x3 convolution
                let idx = 0;
                for(let ky=-1; ky<=1; ky++) {
                    for(let kx=-1; kx<=1; kx++) {
                         const val = gray[(y+ky)*width + (x+kx)];
                         gx += val * sobelX[idx];
                         gy += val * sobelY[idx];
                         idx++;
                    }
                }

                const pIdx = y * width + x;
                Ix[pIdx] = gx;
                Iy[pIdx] = gy;
            }
        }

        self.postMessage({ type: 'progress', data: 40 });

        // 3. Compute products of derivatives Ix2, Iy2, Ixy
        const Ix2 = new Float32Array(width * height);
        const Iy2 = new Float32Array(width * height);
        const Ixy = new Float32Array(width * height);

        for (let i = 0; i < width * height; i++) {
            Ix2[i] = Ix[i] * Ix[i];
            Iy2[i] = Iy[i] * Iy[i];
            Ixy[i] = Ix[i] * Iy[i];
        }

        // 4. Gaussian smooth Ix2, Iy2, Ixy (Window function)
        // Simple Box filter or Gaussian 3x3/5x5
        // Let's use 3x3 box for speed, or Gaussian if possible. Gaussian is better.
        // Approx Gaussian 5x5: [1 4 6 4 1]

        // Let's use a separable Gaussian blur for efficiency.
        // But for simplicity in single worker, 2-pass box blur or simple weighted average.
        // Let's do a simple 3x3 weighted average window.

        const smooth = (input, output) => {
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    let sum = 0;
                    // Gaussian kernel 3x3 approx:
                    // 1 2 1
                    // 2 4 2
                    // 1 2 1
                    // / 16

                    const idx = y * width + x;
                    const w = width;

                    sum += input[idx - w - 1] * 1;
                    sum += input[idx - w] * 2;
                    sum += input[idx - w + 1] * 1;

                    sum += input[idx - 1] * 2;
                    sum += input[idx] * 4;
                    sum += input[idx + 1] * 2;

                    sum += input[idx + w - 1] * 1;
                    sum += input[idx + w] * 2;
                    sum += input[idx + w + 1] * 1;

                    output[idx] = sum / 16;
                }
            }
        };

        const S_Ix2 = new Float32Array(width * height);
        const S_Iy2 = new Float32Array(width * height);
        const S_Ixy = new Float32Array(width * height);

        smooth(Ix2, S_Ix2);
        smooth(Iy2, S_Iy2);
        smooth(Ixy, S_Ixy);

        self.postMessage({ type: 'progress', data: 70 });

        // 5. Compute Harris Response R
        // R = det(M) - k * (trace(M))^2
        // det(M) = S_Ix2 * S_Iy2 - S_Ixy^2
        // trace(M) = S_Ix2 + S_Iy2
        // k is typically 0.04 - 0.06

        const k = 0.04;
        const R = new Float32Array(width * height);
        let maxR = 0;

        for (let i = 0; i < width * height; i++) {
            const det = (S_Ix2[i] * S_Iy2[i]) - (S_Ixy[i] * S_Ixy[i]);
            const trace = S_Ix2[i] + S_Iy2[i];
            const val = det - k * (trace * trace);
            R[i] = val;
            if (val > maxR) maxR = val;
        }

        self.postMessage({ type: 'progress', data: 90 });

        // 6. Non-maximum suppression & Thresholding
        const corners = [];
        // Threshold relative to max? Or absolute? User provided absolute like "10000".
        // Harris scores can be huge.

        // Let's interpret user threshold as relative if maxR is huge, or absolute if small.
        // Actually, let's normalize R for consistent thresholding? Or just use raw.
        // Usually R is very large.

        // Let's iterate and check local max in 3x3 window
        for (let y = 2; y < height - 2; y++) {
            for (let x = 2; x < width - 2; x++) {
                const idx = y * width + x;
                const val = R[idx];

                if (val > threshold) {
                    // Check if local max
                    let isMax = true;
                    for (let ny = -2; ny <= 2; ny++) {
                        for (let nx = -2; nx <= 2; nx++) {
                             if (ny === 0 && nx === 0) continue;
                             if (R[(y+ny)*width + (x+nx)] > val) {
                                 isMax = false;
                                 break;
                             }
                        }
                        if (!isMax) break;
                    }

                    if (isMax) {
                        corners.push({x, y, score: val});
                    }
                }
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                corners: corners,
                time: endTime - startTime,
                width: width,
                height: height
            }
        });

    } catch (error) {
        self.postMessage({ type: 'error', message: error.message });
    }
};
