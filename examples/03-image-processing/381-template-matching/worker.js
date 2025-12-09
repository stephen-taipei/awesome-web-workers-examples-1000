// Template Matching Worker
// Implements Normalized Cross Correlation (NCC)

self.onmessage = function(e) {
    const { sourceImageData, templateImageData } = e.data;

    try {
        const startTime = performance.now();

        // 1. Convert both to Grayscale
        self.postMessage({ type: 'progress', progress: 5, message: '轉換灰階...' });
        const sourceGray = toGrayscale(sourceImageData);
        const templateGray = toGrayscale(templateImageData);

        const srcW = sourceImageData.width;
        const srcH = sourceImageData.height;
        const tplW = templateImageData.width;
        const tplH = templateImageData.height;

        // Output map dimensions
        const mapW = srcW - tplW + 1;
        const mapH = srcH - tplH + 1;

        if (mapW <= 0 || mapH <= 0) {
            throw new Error("模板尺寸必須小於主圖片尺寸");
        }

        // 2. Precompute Template Stats (Mean, StdDev) for NCC
        self.postMessage({ type: 'progress', progress: 10, message: '計算模板統計...' });
        let tplSum = 0;
        let tplSqSum = 0;
        for (let i = 0; i < tplW * tplH; i++) {
            tplSum += templateGray[i];
            tplSqSum += templateGray[i] * templateGray[i];
        }
        const tplMean = tplSum / (tplW * tplH);
        // Variance * N = Sum(x^2) - Sum(x)^2/N
        // We use the denominator part of NCC: sqrt(Sum((T-Tm)^2))
        // Sum((x-mean)^2) = Sum(x^2) - N*mean^2
        const tplDenom = Math.sqrt(tplSqSum - (tplW * tplH) * tplMean * tplMean);

        const resultMap = new Float32Array(mapW * mapH);
        let bestScore = -1;
        let bestX = 0;
        let bestY = 0;

        // 3. Sliding Window (NCC)
        // Optimization: For large images, this is O(N*M). FFT based is O(N log N).
        // Since we don't have FFT library, we use naive implementation but optimize loops.
        // We can precompute Integral Images (Summed Area Tables) for mean and variance of image windows in O(1).

        // Compute Integral Image for Source (Sum and SqSum)
        self.postMessage({ type: 'progress', progress: 15, message: '計算積分圖...' });
        const integralSum = new Float64Array(srcW * srcH);
        const integralSqSum = new Float64Array(srcW * srcH);

        computeIntegralImages(sourceGray, srcW, srcH, integralSum, integralSqSum);

        const totalSteps = mapH;
        let completedSteps = 0;

        // Pre-calculate centered template values to avoid subtraction inside loop
        const tplCentered = new Float32Array(tplW * tplH);
        for(let i=0; i<tplW*tplH; i++) {
            tplCentered[i] = templateGray[i] - tplMean;
        }

        self.postMessage({ type: 'progress', progress: 20, message: '執行匹配...' });

        // Loop through all positions
        for (let y = 0; y < mapH; y++) {
            // Report progress every few rows
            if (y % 10 === 0) {
                const prog = 20 + (y / mapH) * 80;
                self.postMessage({ type: 'progress', progress: prog, message: `匹配中 (${Math.round(prog)}%)...` });
            }

            for (let x = 0; x < mapW; x++) {

                // 1. Get Window Stats from Integral Image O(1)
                // Window coordinates: (x, y) to (x+tplW-1, y+tplH-1)
                const x0 = x, y0 = y;
                const x1 = x + tplW - 1, y1 = y + tplH - 1;

                const winSum = getIntegralArea(integralSum, srcW, x0, y0, x1, y1);
                const winSqSum = getIntegralArea(integralSqSum, srcW, x0, y0, x1, y1);

                const winN = tplW * tplH; // Should be constant
                const winMean = winSum / winN;

                // Denominator part for window
                // Sqrt(Sum((I-Im)^2))
                let winVarTerm = winSqSum - winN * winMean * winMean;
                // Avoid sqrt of negative due to float precision
                if (winVarTerm < 0) winVarTerm = 0;
                const winDenom = Math.sqrt(winVarTerm);

                if (winDenom === 0 || tplDenom === 0) {
                    resultMap[y * mapW + x] = 0;
                    continue;
                }

                // 2. Compute Numerator: Sum((T - Tm) * (I - Im))
                // = Sum(T*I) - Sum(T*Im) - Sum(Tm*I) + Sum(Tm*Im)
                // = Sum(T*I) - Im*Sum(T) - Tm*Sum(I) + N*Tm*Im
                // = Sum(T*I) - Im*(N*Tm) - Tm*(N*Im) + N*Tm*Im
                // = Sum(T*I) - N*Tm*Im

                // So we just need Sum(T*I). This still requires iterating over the template window.
                // We can't use integral image for Cross Term.
                // So complexity is still dominated by this loop.

                let crossSum = 0;
                // Optimization: Loop unrolling or just simple loop
                // To speed up, we access flat arrays.

                for (let ty = 0; ty < tplH; ty++) {
                    const srcRowOffset = (y + ty) * srcW + x;
                    const tplRowOffset = ty * tplW;
                    for (let tx = 0; tx < tplW; tx++) {
                        crossSum += sourceGray[srcRowOffset + tx] * templateGray[tplRowOffset + tx];
                    }
                }

                const numerator = crossSum - winN * tplMean * winMean;
                const score = numerator / (tplDenom * winDenom);

                resultMap[y * mapW + x] = score;

                if (score > bestScore) {
                    bestScore = score;
                    bestX = x;
                    bestY = y;
                }
            }
        }

        const endTime = performance.now();

        self.postMessage({
            type: 'result',
            data: {
                bestMatch: { x: bestX, y: bestY, score: bestScore },
                resultMap: resultMap,
                width: mapW,
                height: mapH
            },
            executionTime: (endTime - startTime).toFixed(2)
        });

    } catch (error) {
        self.postMessage({ type: 'error', data: error.message });
    }
};

function toGrayscale(imageData) {
    const { width, height, data } = imageData;
    const gray = new Float32Array(width * height);
    for (let i = 0; i < width * height; i++) {
        gray[i] = data[i * 4] * 0.299 + data[i * 4 + 1] * 0.587 + data[i * 4 + 2] * 0.114;
    }
    return gray;
}

function computeIntegralImages(gray, width, height, sumArr, sqSumArr) {
    for (let y = 0; y < height; y++) {
        let rowSum = 0;
        let rowSqSum = 0;
        for (let x = 0; x < width; x++) {
            const val = gray[y * width + x];
            rowSum += val;
            rowSqSum += val * val;

            if (y === 0) {
                sumArr[y * width + x] = rowSum;
                sqSumArr[y * width + x] = rowSqSum;
            } else {
                sumArr[y * width + x] = sumArr[(y - 1) * width + x] + rowSum;
                sqSumArr[y * width + x] = sqSumArr[(y - 1) * width + x] + rowSqSum;
            }
        }
    }
}

function getIntegralArea(integral, width, x0, y0, x1, y1) {
    // A = I(x1, y1) - I(x0-1, y1) - I(x1, y0-1) + I(x0-1, y0-1)

    let a = integral[y1 * width + x1];
    let b = (x0 > 0) ? integral[y1 * width + (x0 - 1)] : 0;
    let c = (y0 > 0) ? integral[(y0 - 1) * width + x1] : 0;
    let d = (x0 > 0 && y0 > 0) ? integral[(y0 - 1) * width + (x0 - 1)] : 0;

    return a - b - c + d;
}
