/**
 * 批量濾鏡 Web Worker
 *
 * 功能：處理多個濾鏡的組合應用
 * 通訊模式：postMessage with Transferable Objects
 *
 * @description
 * 此 Worker 接收圖片數據和濾鏡鏈，依序套用多個濾鏡效果，
 * 並即時回報處理進度。
 */

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 * 訊息格式：{ type: string, payload: any }
 */
self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'APPLY_FILTERS':
            applyFilterChain(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 濾鏡處理 =====

/**
 * 套用濾鏡鏈
 * @param {Object} payload - 處理參數
 * @param {ImageData} payload.imageData - 圖片數據
 * @param {string[]} payload.filters - 濾鏡列表
 */
function applyFilterChain(payload) {
    const { imageData, filters } = payload;
    const startTime = performance.now();

    // 複製像素數據以進行處理
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    const totalFilters = filters.length;

    sendProgress(0, `開始處理 ${totalFilters} 個濾鏡...`);

    // 依序套用每個濾鏡
    for (let i = 0; i < totalFilters; i++) {
        const filter = filters[i];
        const filterName = getFilterName(filter);

        sendProgress(
            Math.floor((i / totalFilters) * 100),
            `套用濾鏡 ${i + 1}/${totalFilters}: ${filterName}`
        );

        applyFilter(data, width, height, filter);
    }

    const endTime = performance.now();
    const duration = endTime - startTime;

    sendProgress(100, '處理完成');

    // 建立新的 ImageData
    const resultData = new ImageData(data, width, height);

    // 發送結果
    self.postMessage({
        type: 'RESULT',
        payload: {
            imageData: resultData,
            filters: filters,
            duration: duration
        }
    }, [resultData.data.buffer]);
}

/**
 * 套用單一濾鏡
 * @param {Uint8ClampedArray} data - 像素數據
 * @param {number} width - 圖片寬度
 * @param {number} height - 圖片高度
 * @param {string} filter - 濾鏡名稱
 */
function applyFilter(data, width, height, filter) {
    const length = data.length;

    switch (filter) {
        case 'grayscale':
            // 灰階轉換
            for (let i = 0; i < length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = data[i + 1] = data[i + 2] = gray;
            }
            break;

        case 'invert':
            // 反色
            for (let i = 0; i < length; i += 4) {
                data[i] = 255 - data[i];
                data[i + 1] = 255 - data[i + 1];
                data[i + 2] = 255 - data[i + 2];
            }
            break;

        case 'brightness':
            // 增加亮度 +20%
            for (let i = 0; i < length; i += 4) {
                data[i] = Math.min(255, data[i] * 1.2);
                data[i + 1] = Math.min(255, data[i + 1] * 1.2);
                data[i + 2] = Math.min(255, data[i + 2] * 1.2);
            }
            break;

        case 'brightness-down':
            // 降低亮度 -20%
            for (let i = 0; i < length; i += 4) {
                data[i] = data[i] * 0.8;
                data[i + 1] = data[i + 1] * 0.8;
                data[i + 2] = data[i + 2] * 0.8;
            }
            break;

        case 'contrast':
            // 增加對比度 +20%
            const factor = (259 * (255 * 0.2 + 255)) / (255 * (259 - 255 * 0.2));
            for (let i = 0; i < length; i += 4) {
                data[i] = clamp(factor * (data[i] - 128) + 128);
                data[i + 1] = clamp(factor * (data[i + 1] - 128) + 128);
                data[i + 2] = clamp(factor * (data[i + 2] - 128) + 128);
            }
            break;

        case 'saturate':
            // 增加飽和度 +50%
            for (let i = 0; i < length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                data[i] = clamp(gray + (data[i] - gray) * 1.5);
                data[i + 1] = clamp(gray + (data[i + 1] - gray) * 1.5);
                data[i + 2] = clamp(gray + (data[i + 2] - gray) * 1.5);
            }
            break;

        case 'sepia':
            // 懷舊效果
            for (let i = 0; i < length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];
                data[i] = clamp(r * 0.393 + g * 0.769 + b * 0.189);
                data[i + 1] = clamp(r * 0.349 + g * 0.686 + b * 0.168);
                data[i + 2] = clamp(r * 0.272 + g * 0.534 + b * 0.131);
            }
            break;

        case 'warm':
            // 暖色調
            for (let i = 0; i < length; i += 4) {
                data[i] = clamp(data[i] + 30);      // 增加紅色
                data[i + 1] = clamp(data[i + 1] + 10); // 稍微增加綠色
                data[i + 2] = clamp(data[i + 2] - 20); // 減少藍色
            }
            break;

        case 'cool':
            // 冷色調
            for (let i = 0; i < length; i += 4) {
                data[i] = clamp(data[i] - 20);       // 減少紅色
                data[i + 1] = clamp(data[i + 1] + 5);  // 稍微增加綠色
                data[i + 2] = clamp(data[i + 2] + 30); // 增加藍色
            }
            break;

        case 'threshold':
            // 二值化 (閾值 128)
            for (let i = 0; i < length; i += 4) {
                const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
                const value = gray > 128 ? 255 : 0;
                data[i] = data[i + 1] = data[i + 2] = value;
            }
            break;

        case 'posterize':
            // 色調分離 (4 級)
            const levels = 4;
            const step = 255 / (levels - 1);
            for (let i = 0; i < length; i += 4) {
                data[i] = Math.round(Math.round(data[i] / step) * step);
                data[i + 1] = Math.round(Math.round(data[i + 1] / step) * step);
                data[i + 2] = Math.round(Math.round(data[i + 2] / step) * step);
            }
            break;

        case 'gamma':
            // Gamma 校正 (gamma = 1.5)
            const gamma = 1.5;
            const gammaCorrection = 1 / gamma;
            for (let i = 0; i < length; i += 4) {
                data[i] = 255 * Math.pow(data[i] / 255, gammaCorrection);
                data[i + 1] = 255 * Math.pow(data[i + 1] / 255, gammaCorrection);
                data[i + 2] = 255 * Math.pow(data[i + 2] / 255, gammaCorrection);
            }
            break;
    }
}

/**
 * 取得濾鏡名稱
 * @param {string} filter - 濾鏡代碼
 * @returns {string} 濾鏡中文名稱
 */
function getFilterName(filter) {
    const names = {
        'grayscale': '灰階',
        'invert': '反色',
        'brightness': '亮度+20%',
        'brightness-down': '亮度-20%',
        'contrast': '對比度+20%',
        'saturate': '飽和度+50%',
        'sepia': '懷舊',
        'warm': '暖色調',
        'cool': '冷色調',
        'threshold': '二值化',
        'posterize': '色調分離',
        'gamma': 'Gamma校正'
    };
    return names[filter] || filter;
}

/**
 * 將值限制在 0-255 範圍內
 * @param {number} value - 輸入值
 * @returns {number} 限制後的值
 */
function clamp(value) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

// ===== 通訊函數 =====

/**
 * 發送進度更新
 * @param {number} percent - 進度百分比 (0-100)
 * @param {string} message - 進度訊息
 */
function sendProgress(percent, message) {
    self.postMessage({
        type: 'PROGRESS',
        payload: {
            percent: percent,
            message: message
        }
    });
}

/**
 * 發送錯誤訊息
 * @param {string} message - 錯誤訊息
 */
function sendError(message) {
    self.postMessage({
        type: 'ERROR',
        payload: {
            message: message
        }
    });
}
