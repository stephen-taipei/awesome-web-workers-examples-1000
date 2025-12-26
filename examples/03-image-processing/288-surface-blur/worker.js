/**
 * 表面模糊 Worker
 */

self.onmessage = function(e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'APPLY_BLUR':
            applySurfaceBlur(payload.imageData, payload.radius, payload.threshold);
            break;
    }
};

/**
 * 執行表面模糊
 * 表面模糊：類似雙邊濾波，但權重函數較簡單。
 * 公式：
 * Output(x,y) = Sum(Input(i,j) * Weight(i,j)) / Sum(Weight(i,j))
 * Weight(i,j) = 1 if |Input(i,j) - Input(x,y)| < Threshold, else 0 (簡化版)
 * 或者使用更平滑的函數：Weight(i,j) = 1 - |Input(i,j) - Input(x,y)| / (2.5 * Threshold) (Photoshop近似)
 */
function applySurfaceBlur(imageData, radius, threshold) {
    const startTime = performance.now();
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const outputData = new Uint8ClampedArray(data.length);

    // 預計算閾值相關參數，避免重複計算
    // 使用類似 Photoshop 的權重衰減公式
    // weight = max(0, 1 - abs(diff) / (2.5 * threshold))
    const thresholdScale = 2.5 * threshold;

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
            // Alpha 通道通常保持不變或平均，這裡簡單起見我們複製中心Alpha
            // 若要模糊 Alpha，邏輯相同

            let sumR = 0, sumG = 0, sumB = 0;
            let sumWeightR = 0, sumWeightG = 0, sumWeightB = 0;

            // 遍歷鄰域
            for (let ky = -radius; ky <= radius; ky++) {
                const ny = y + ky;
                if (ny < 0 || ny >= height) continue;

                for (let kx = -radius; kx <= radius; kx++) {
                    const nx = x + kx;
                    if (nx < 0 || nx >= width) continue;

                    const neighborPos = (ny * width + nx) * 4;
                    const neighborR = data[neighborPos];
                    const neighborG = data[neighborPos + 1];
                    const neighborB = data[neighborPos + 2];

                    // 計算每個通道的權重
                    // 權重取決於亮度差
                    const diffR = Math.abs(neighborR - centerR);
                    const diffG = Math.abs(neighborG - centerG);
                    const diffB = Math.abs(neighborB - centerB);

                    // 權重函數：差異越大，權重越小
                    // 當差異 > 2.5 * threshold 時權重為 0

                    let weightR = 1.0 - (diffR / thresholdScale);
                    if (weightR < 0) weightR = 0;

                    let weightG = 1.0 - (diffG / thresholdScale);
                    if (weightG < 0) weightG = 0;

                    let weightB = 1.0 - (diffB / thresholdScale);
                    if (weightB < 0) weightB = 0;

                    sumR += neighborR * weightR;
                    sumWeightR += weightR;

                    sumG += neighborG * weightG;
                    sumWeightG += weightG;

                    sumB += neighborB * weightB;
                    sumWeightB += weightB;
                }
            }

            // 正規化
            outputData[centerPos] = sumWeightR > 0 ? sumR / sumWeightR : centerR;
            outputData[centerPos + 1] = sumWeightG > 0 ? sumG / sumWeightG : centerG;
            outputData[centerPos + 2] = sumWeightB > 0 ? sumB / sumWeightB : centerB;
            outputData[centerPos + 3] = data[centerPos + 3]; // 保持 Alpha
        }
    }

    const endTime = performance.now();
    imageData.data.set(outputData);

    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: imageData,
            duration: endTime - startTime,
            radius: radius,
            threshold: threshold
        }
    }, [imageData.data.buffer]);
}
