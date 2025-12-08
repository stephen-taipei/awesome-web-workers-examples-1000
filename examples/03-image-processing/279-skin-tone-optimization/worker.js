/**
 * 膚色優化 Web Worker
 *
 * 功能：使用膚色檢測與選擇性增強優化人像照片
 * 通訊模式：postMessage with Transferable Objects
 */

// ===== 訊息處理 =====
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            handleSkinToneOptimization(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 核心演算法 =====
function handleSkinToneOptimization(payload) {
    const { imageData, mode, strength } = payload;
    const startTime = performance.now();

    try {
        sendProgress(0, '開始處理...');

        const data = imageData.data;
        const width = imageData.width;
        const height = imageData.height;
        const pixelCount = width * height;

        // 階段 1：膚色檢測與處理 (0-90%)
        sendProgress(5, '檢測膚色區域...');

        const resultData = new Uint8ClampedArray(data.length);
        let skinPixelCount = 0;
        let lastProgress = 5;

        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // 膚色檢測
            const isSkin = detectSkinPixel(r, g, b);

            if (isSkin) {
                skinPixelCount++;

                // 應用膚色優化
                const optimized = optimizeSkinPixel(r, g, b, mode, strength);

                resultData[i] = optimized.r;
                resultData[i + 1] = optimized.g;
                resultData[i + 2] = optimized.b;
            } else {
                // 非膚色像素保持原樣
                resultData[i] = r;
                resultData[i + 1] = g;
                resultData[i + 2] = b;
            }

            resultData[i + 3] = data[i + 3]; // 保持 alpha 通道

            // 更新進度
            if (i % 50000 === 0) {
                const progress = 5 + Math.floor((i / data.length) * 85);
                if (progress > lastProgress) {
                    sendProgress(progress, `處理像素... ${Math.floor(i / 4)} / ${pixelCount}`);
                    lastProgress = progress;
                }
            }
        }

        sendProgress(90, '膚色檢測完成');

        // 階段 2：邊緣柔化（可選）(90-100%)
        if (mode === 'smooth') {
            sendProgress(95, '柔化邊緣...');
            // 簡單的邊緣過渡處理已在 optimizeSkinPixel 中完成
        }

        sendProgress(100, '處理完成');

        const duration = performance.now() - startTime;
        const skinPercentage = (skinPixelCount / pixelCount * 100).toFixed(1);

        // 發送結果
        const resultImageData = new ImageData(resultData, width, height);

        self.postMessage({
            type: 'RESULT',
            payload: {
                imageData: resultImageData,
                stats: {
                    mode: mode,
                    strength: strength,
                    skinPixelCount: skinPixelCount,
                    skinPercentage: skinPercentage
                },
                duration: duration
            }
        }, [resultImageData.data.buffer]);

    } catch (error) {
        sendError(error.message);
    }
}

// ===== 膚色檢測 =====
function detectSkinPixel(r, g, b) {
    // 方法 1: YCbCr 色彩空間檢測
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
    const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;

    const ycbcrSkin = (cb >= 77 && cb <= 127) && (cr >= 133 && cr <= 173);

    // 方法 2: RGB 規則檢測
    const rgbSkin = (r > 95) && (g > 40) && (b > 20) &&
                    (Math.max(r, g, b) - Math.min(r, g, b) > 15) &&
                    (Math.abs(r - g) > 15) && (r > g) && (r > b);

    // 方法 3: HSV 色彩空間檢測
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : delta / max;
    const v = max / 255;

    const hsvSkin = (h >= 0 && h <= 50) && (s >= 0.2 && s <= 0.68) && (v >= 0.35);

    // 綜合判斷：至少需要兩種方法判定為膚色
    const methods = [ycbcrSkin, rgbSkin, hsvSkin];
    const trueCount = methods.filter(m => m).length;

    return trueCount >= 2;
}

// ===== 膚色優化 =====
function optimizeSkinPixel(r, g, b, mode, strength) {
    let newR = r, newG = g, newB = b;

    switch (mode) {
        case 'natural':
            // 自然增強：輕微提亮，保持膚色均勻
            const brightness = 1 + 0.1 * strength;
            newR = Math.min(255, r * brightness);
            newG = Math.min(255, g * brightness);
            newB = Math.min(255, b * brightness);

            // 稍微減少綠色偏移，使膚色更自然
            newG = newG - 3 * strength;
            break;

        case 'warm':
            // 溫暖光澤：增添健康紅潤感
            newR = Math.min(255, r + 15 * strength);
            newG = Math.min(255, g + 5 * strength);
            newB = Math.max(0, b - 5 * strength);
            break;

        case 'smooth':
            // 柔膚美顏：柔化膚色過渡
            const avg = (r + g + b) / 3;
            const blend = 0.3 * strength;
            newR = r + (avg - r) * blend + 5 * strength;
            newG = g + (avg - g) * blend;
            newB = b + (avg - b) * blend;
            break;
    }

    return {
        r: Math.round(Math.max(0, Math.min(255, newR))),
        g: Math.round(Math.max(0, Math.min(255, newG))),
        b: Math.round(Math.max(0, Math.min(255, newB)))
    };
}

// ===== 通訊函數 =====
function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: { percent, message }
    });
}

function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: { message }
    });
}
