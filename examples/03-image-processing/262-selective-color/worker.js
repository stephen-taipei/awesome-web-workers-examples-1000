/**
 * 選擇性調色 Web Worker
 *
 * 功能：對影像中特定顏色範圍進行調整
 * 技術：HSL 色彩空間、顏色遮罩、平滑過渡
 *
 * @description
 * 此 Worker 接收影像數據和顏色選取參數，
 * 計算每個像素與目標顏色的匹配程度，
 * 並根據匹配程度套用調整。
 */

// ===== 訊息處理 =====

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROCESS':
            handleProcess(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 核心處理 =====

/**
 * 處理選擇性調色
 * @param {Object} payload - 處理參數
 */
function handleProcess(payload) {
    const {
        imageData,
        targetColor,
        tolerance,
        adjustment,
        invertSelection,
        showMask
    } = payload;

    const startTime = performance.now();

    sendProgress(0, '正在分析顏色...');

    // 將目標顏色轉換為 HSL
    const targetHSL = rgbToHsl(targetColor.r, targetColor.g, targetColor.b);

    // 複製像素數據
    const data = new Uint8ClampedArray(imageData.data);
    const totalPixels = data.length / 4;
    const progressInterval = Math.floor(totalPixels / 20);

    let matchedPixels = 0;

    sendProgress(10, '正在處理像素...');

    // 逐像素處理
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // 將像素轉換為 HSL
        const pixelHSL = rgbToHsl(r, g, b);

        // 計算匹配程度 (0-1)
        let match = calculateMatch(pixelHSL, targetHSL, tolerance);

        // 反轉選取
        if (invertSelection) {
            match = 1 - match;
        }

        if (match > 0) {
            matchedPixels++;

            if (showMask) {
                // 顯示遮罩模式：白色表示選中，黑色表示未選中
                const maskValue = Math.round(match * 255);
                data[i] = maskValue;
                data[i + 1] = maskValue;
                data[i + 2] = maskValue;
            } else {
                // 套用調整
                let newHSL = [...pixelHSL];

                // 色相偏移
                newHSL[0] = (newHSL[0] + adjustment.hueShift + 360) % 360;

                // 飽和度調整
                newHSL[1] = Math.max(0, Math.min(100, newHSL[1] + adjustment.satAdjust));

                // 亮度調整
                newHSL[2] = Math.max(0, Math.min(100, newHSL[2] + adjustment.lumAdjust));

                // 轉回 RGB
                const newRGB = hslToRgb(newHSL[0], newHSL[1], newHSL[2]);

                // 根據匹配程度混合原始顏色和調整後顏色
                data[i] = Math.round(r + (newRGB.r - r) * match);
                data[i + 1] = Math.round(g + (newRGB.g - g) * match);
                data[i + 2] = Math.round(b + (newRGB.b - b) * match);
            }
        } else if (showMask) {
            // 遮罩模式：未選中的像素顯示為黑色
            data[i] = 0;
            data[i + 1] = 0;
            data[i + 2] = 0;
        }

        // 更新進度
        const pixelIndex = i / 4;
        if (pixelIndex % progressInterval === 0) {
            const progress = 10 + Math.floor((pixelIndex / totalPixels) * 85);
            sendProgress(progress, `處理中... ${Math.floor((pixelIndex / totalPixels) * 100)}%`);
        }
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '處理完成');

    // 回傳結果
    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: {
                data: data,
                width: imageData.width,
                height: imageData.height
            },
            duration: duration,
            pixelCount: totalPixels,
            matchedPixels: matchedPixels,
            matchPercentage: (matchedPixels / totalPixels * 100).toFixed(1)
        }
    }, [data.buffer]);
}

/**
 * 計算像素與目標顏色的匹配程度
 * @param {Array} pixelHSL - 像素的 HSL 值 [h, s, l]
 * @param {Array} targetHSL - 目標顏色的 HSL 值 [h, s, l]
 * @param {Object} tolerance - 容差設定
 * @returns {number} 匹配程度 (0-1)
 */
function calculateMatch(pixelHSL, targetHSL, tolerance) {
    // 計算色相差異（考慮環形）
    let hueDiff = Math.abs(pixelHSL[0] - targetHSL[0]);
    if (hueDiff > 180) {
        hueDiff = 360 - hueDiff;
    }

    // 計算飽和度和亮度差異
    const satDiff = Math.abs(pixelHSL[1] - targetHSL[1]);
    const lumDiff = Math.abs(pixelHSL[2] - targetHSL[2]);

    // 檢查是否在容差範圍內
    if (hueDiff > tolerance.hue || satDiff > tolerance.sat || lumDiff > tolerance.lum) {
        return 0;
    }

    // 計算平滑過渡的匹配程度
    const hueMatch = 1 - (hueDiff / tolerance.hue);
    const satMatch = 1 - (satDiff / tolerance.sat);
    const lumMatch = 1 - (lumDiff / tolerance.lum);

    // 綜合匹配程度（使用幾何平均）
    return Math.pow(hueMatch * satMatch * lumMatch, 0.5);
}

// ===== 色彩轉換函數 =====

/**
 * RGB 轉 HSL
 * @param {number} r - 紅色 (0-255)
 * @param {number} g - 綠色 (0-255)
 * @param {number} b - 藍色 (0-255)
 * @returns {Array} [h, s, l] h: 0-360, s: 0-100, l: 0-100
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s;
    const l = (max + min) / 2;

    if (max === min) {
        h = s = 0; // 灰色
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

        switch (max) {
            case r:
                h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
                break;
            case g:
                h = ((b - r) / d + 2) / 6;
                break;
            case b:
                h = ((r - g) / d + 4) / 6;
                break;
        }
    }

    return [h * 360, s * 100, l * 100];
}

/**
 * HSL 轉 RGB
 * @param {number} h - 色相 (0-360)
 * @param {number} s - 飽和度 (0-100)
 * @param {number} l - 亮度 (0-100)
 * @returns {Object} {r, g, b} 各 0-255
 */
function hslToRgb(h, s, l) {
    h /= 360;
    s /= 100;
    l /= 100;

    let r, g, b;

    if (s === 0) {
        r = g = b = l; // 灰色
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }

    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
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
