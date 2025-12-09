/**
 * 銳化 Worker
 */

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'GENERATE_KERNEL':
            generateAndSendKernel(payload.strength);
            break;

        case 'APPLY_SHARPEN':
            applySharpen(payload.imageData, payload.strength);
            break;
    }
};

function generateAndSendKernel(strength) {
    const { kernel, size } = createSharpenKernel(strength);
    self.postMessage({
        type: 'KERNEL',
        payload: {
            kernel: kernel,
            kernelSize: size
        }
    });
}

function createSharpenKernel(strength) {
    // 簡單的 3x3 拉普拉斯銳化核
    // 基礎矩陣：
    //  0 -1  0
    // -1  5 -1
    //  0 -1  0
    //
    // 或者更強的：
    // -1 -1 -1
    // -1  9 -1
    // -1 -1 -1

    // 這裡我們使用一個可調強度的版本
    // 原始圖像 * (1 + strength) - 模糊圖像 * strength
    // 類似 Unsharp Mask，但在單個卷積中完成 (近似)
    // kernel = Identity + strength * (Identity - Smooth)

    // 使用簡單的 3x3 模板
    // 中心權重 = 1 + 4 * k
    // 鄰域權重 = -k
    // k 與 strength 成正比

    const k = strength;
    const kernel = new Float32Array([
        0, -k, 0,
        -k, 1 + 4 * k, -k,
        0, -k, 0
    ]);

    // 另一種常用的 3x3 全鄰域
    /*
    const k = strength;
    const kernel = new Float32Array([
        -k, -k, -k,
        -k, 1 + 8*k, -k,
        -k, -k, -k
    ]);
    */

    return { kernel, size: 3 };
}

function applySharpen(imageData, strength) {
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const outputData = new Uint8ClampedArray(data.length);

    const { kernel, size: kernelSize } = createSharpenKernel(strength);
    const halfSize = Math.floor(kernelSize / 2);

    const progressInterval = Math.ceil(height / 20);

    for (let y = 0; y < height; y++) {
        if (y % progressInterval === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: {
                    percent: Math.round((y / height) * 100),
                    message: `處理中... 第 ${y} / ${height} 行`
                }
            });
        }

        for (let x = 0; x < width; x++) {
            let r = 0, g = 0, b = 0;

            for (let ky = 0; ky < kernelSize; ky++) {
                for (let kx = 0; kx < kernelSize; kx++) {
                    const py = y + ky - halfSize;
                    const px = x + kx - halfSize;

                    // 邊界處理：複製邊緣
                    const clampedY = Math.max(0, Math.min(height - 1, py));
                    const clampedX = Math.max(0, Math.min(width - 1, px));

                    const pos = (clampedY * width + clampedX) * 4;
                    const weight = kernel[ky * kernelSize + kx];

                    r += data[pos] * weight;
                    g += data[pos + 1] * weight;
                    b += data[pos + 2] * weight;
                }
            }

            const outPos = (y * width + x) * 4;
            outputData[outPos] = r;
            outputData[outPos + 1] = g;
            outputData[outPos + 2] = b;
            outputData[outPos + 3] = data[outPos + 3];
        }
    }

    const endTime = performance.now();
    imageData.data.set(outputData);

    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: imageData,
            duration: endTime - startTime,
            strength: strength
        }
    }, [imageData.data.buffer]);
}
