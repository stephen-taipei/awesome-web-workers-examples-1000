/**
 * 雙邊濾波 Worker
 */

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'APPLY_FILTER':
            applyBilateralFilter(payload.imageData, payload.sigmaSpace, payload.sigmaColor);
            break;
    }
};

/**
 * 執行雙邊濾波
 * @param {ImageData} imageData
 * @param {number} sigmaSpace 空間域標準差 (控制模糊半徑)
 * @param {number} sigmaColor 顏色域標準差 (控制邊緣保留閾值)
 */
function applyBilateralFilter(imageData, sigmaSpace, sigmaColor) {
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const outputData = new Uint8ClampedArray(data.length);

    // 預計算空間域高斯權重
    // 濾波半徑通常取 3 * sigmaSpace
    const radius = Math.ceil(sigmaSpace * 3);
    const kernelSize = 2 * radius + 1;
    const spaceWeights = new Float32Array(kernelSize * kernelSize);

    const sigmaSpace2 = 2 * sigmaSpace * sigmaSpace;
    const sigmaColor2 = 2 * sigmaColor * sigmaColor;

    for (let y = -radius; y <= radius; y++) {
        for (let x = -radius; x <= radius; x++) {
            const r2 = x*x + y*y;
            const w = Math.exp(-r2 / sigmaSpace2);
            spaceWeights[(y + radius) * kernelSize + (x + radius)] = w;
        }
    }

    // 預計算顏色域權重查找表 (可選優化)
    // 顏色差範圍 0-255 (實際上可能略大，因為三個通道距離)
    // 這裡我們直接計算，避免 LUT 精度問題，JS Math.exp 夠快

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
            const centerPos = (y * width + x) * 4;
            const centerR = data[centerPos];
            const centerG = data[centerPos + 1];
            const centerB = data[centerPos + 2];

            let sumR = 0, sumG = 0, sumB = 0;
            let weightSum = 0;

            for (let ky = -radius; ky <= radius; ky++) {
                const ny = y + ky;
                if (ny < 0 || ny >= height) continue;

                for (let kx = -radius; kx <= radius; kx++) {
                    const nx = x + kx;
                    if (nx < 0 || nx >= width) continue;

                    const neighborPos = (ny * width + nx) * 4;
                    const nr = data[neighborPos];
                    const ng = data[neighborPos + 1];
                    const nb = data[neighborPos + 2];

                    // 空間權重
                    const spaceW = spaceWeights[(ky + radius) * kernelSize + (kx + radius)];

                    // 顏色權重 (歐幾里得距離或絕對差和)
                    // 使用歐幾里得距離更準確：d^2 = dr^2 + dg^2 + db^2
                    // 也可以簡化為亮度差，這裡使用 RGB 向量距離
                    const dr = nr - centerR;
                    const dg = ng - centerG;
                    const db = nb - centerB;
                    const colorDist2 = dr*dr + dg*dg + db*db;
                    // 注意：如果是單通道，colorDist2 就是 diff^2
                    // 因為這裡有三個通道，sigmaColor 應該要適應這種距離尺度
                    // 或者對每個通道分別計算權重 (這樣會產生偽色)
                    // 通常雙邊濾波對三個通道使用相同的聯合權重保持色相

                    const colorW = Math.exp(-colorDist2 / sigmaColor2);

                    const weight = spaceW * colorW;

                    sumR += nr * weight;
                    sumG += ng * weight;
                    sumB += nb * weight;
                    weightSum += weight;
                }
            }

            outputData[centerPos] = sumR / weightSum;
            outputData[centerPos + 1] = sumG / weightSum;
            outputData[centerPos + 2] = sumB / weightSum;
            outputData[centerPos + 3] = data[centerPos + 3];
        }
    }

    const endTime = performance.now();
    imageData.data.set(outputData);

    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: imageData,
            duration: endTime - startTime,
            sigmaSpace: sigmaSpace,
            sigmaColor: sigmaColor
        }
    }, [imageData.data.buffer]);
}
