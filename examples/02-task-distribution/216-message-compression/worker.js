/**
 * 訊息壓縮 Web Worker
 *
 * 功能：使用 CompressionStream API 進行訊息壓縮與解壓縮
 * 通訊模式：postMessage
 *
 * @description
 * 此 Worker 接收訊息內容，使用指定的壓縮演算法進行壓縮或解壓縮，
 * 並回傳處理結果與統計資訊。
 */

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 */
self.onmessage = async function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'COMPRESS':
            await handleCompress(payload);
            break;

        case 'DECOMPRESS':
            await handleDecompress(payload);
            break;

        case 'COMPARE':
            await handleCompare(payload);
            break;

        default:
            sendError(`未知的訊息類型: ${type}`);
    }
};

// ===== 壓縮處理 =====

/**
 * 處理壓縮請求
 * @param {Object} payload - 壓縮參數
 * @param {string} payload.data - 要壓縮的數據
 * @param {string} payload.algorithm - 壓縮演算法
 */
async function handleCompress(payload) {
    const { data, algorithm } = payload;
    const startTime = performance.now();

    try {
        sendLog('info', `開始壓縮... 演算法: ${algorithm}`);

        // 將字串轉換為 Uint8Array
        const encoder = new TextEncoder();
        const originalData = encoder.encode(data);
        const originalSize = originalData.length;

        sendLog('info', `原始數據大小: ${formatBytes(originalSize)}`);

        // 使用 CompressionStream 進行壓縮
        const compressedData = await compressData(originalData, algorithm);
        const compressedSize = compressedData.length;

        const endTime = performance.now();
        const duration = endTime - startTime;

        // 計算壓縮率
        const ratio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

        sendLog('success', `壓縮完成！壓縮後大小: ${formatBytes(compressedSize)} (節省 ${ratio}%)`);

        // 發送結果
        sendResult('COMPRESS_RESULT', {
            originalSize,
            compressedSize,
            ratio,
            duration,
            compressedData: Array.from(compressedData), // 轉換為普通陣列以便傳輸
            algorithm
        });

    } catch (error) {
        sendError(`壓縮失敗: ${error.message}`);
    }
}

/**
 * 處理解壓縮請求
 * @param {Object} payload - 解壓縮參數
 * @param {Array} payload.data - 壓縮後的數據陣列
 * @param {string} payload.algorithm - 壓縮演算法
 */
async function handleDecompress(payload) {
    const { data, algorithm } = payload;
    const startTime = performance.now();

    try {
        sendLog('info', `開始解壓縮... 演算法: ${algorithm}`);

        // 將陣列轉換回 Uint8Array
        const compressedData = new Uint8Array(data);
        const compressedSize = compressedData.length;

        sendLog('info', `壓縮數據大小: ${formatBytes(compressedSize)}`);

        // 使用 DecompressionStream 進行解壓縮
        const decompressedData = await decompressData(compressedData, algorithm);
        const decompressedSize = decompressedData.length;

        // 將 Uint8Array 轉換回字串
        const decoder = new TextDecoder();
        const decompressedText = decoder.decode(decompressedData);

        const endTime = performance.now();
        const duration = endTime - startTime;

        sendLog('success', `解壓縮完成！還原大小: ${formatBytes(decompressedSize)}`);

        // 發送結果
        sendResult('DECOMPRESS_RESULT', {
            compressedSize,
            decompressedSize,
            duration,
            decompressedText,
            algorithm
        });

    } catch (error) {
        sendError(`解壓縮失敗: ${error.message}`);
    }
}

/**
 * 處理演算法比較請求
 * @param {Object} payload - 比較參數
 * @param {string} payload.data - 要壓縮的數據
 */
async function handleCompare(payload) {
    const { data } = payload;
    const algorithms = ['gzip', 'deflate', 'deflate-raw'];
    const results = [];

    const encoder = new TextEncoder();
    const originalData = encoder.encode(data);
    const originalSize = originalData.length;

    sendLog('info', '開始演算法效能比較...');

    for (const algorithm of algorithms) {
        try {
            // 測試壓縮
            const compressStart = performance.now();
            const compressedData = await compressData(originalData, algorithm);
            const compressEnd = performance.now();
            const compressTime = compressEnd - compressStart;

            // 測試解壓縮
            const decompressStart = performance.now();
            await decompressData(compressedData, algorithm);
            const decompressEnd = performance.now();
            const decompressTime = decompressEnd - decompressStart;

            const ratio = ((1 - compressedData.length / originalSize) * 100).toFixed(2);

            results.push({
                algorithm,
                compressedSize: compressedData.length,
                ratio,
                compressTime,
                decompressTime
            });

            sendLog('info', `${algorithm}: 壓縮率 ${ratio}%, 壓縮時間 ${compressTime.toFixed(2)}ms`);

        } catch (error) {
            sendLog('error', `${algorithm} 測試失敗: ${error.message}`);
            results.push({
                algorithm,
                error: error.message
            });
        }
    }

    sendLog('success', '演算法比較完成！');

    sendResult('COMPARE_RESULT', {
        originalSize,
        results
    });
}

// ===== 壓縮工具函數 =====

/**
 * 使用 CompressionStream 壓縮數據
 * @param {Uint8Array} data - 原始數據
 * @param {string} algorithm - 壓縮演算法
 * @returns {Promise<Uint8Array>} 壓縮後的數據
 */
async function compressData(data, algorithm) {
    // 建立壓縮串流
    const cs = new CompressionStream(algorithm);

    // 建立可讀串流
    const readableStream = new ReadableStream({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        }
    });

    // 將數據通過壓縮串流
    const compressedStream = readableStream.pipeThrough(cs);

    // 讀取壓縮後的數據
    const reader = compressedStream.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    // 合併所有 chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
}

/**
 * 使用 DecompressionStream 解壓縮數據
 * @param {Uint8Array} data - 壓縮後的數據
 * @param {string} algorithm - 壓縮演算法
 * @returns {Promise<Uint8Array>} 解壓縮後的數據
 */
async function decompressData(data, algorithm) {
    // 建立解壓縮串流
    const ds = new DecompressionStream(algorithm);

    // 建立可讀串流
    const readableStream = new ReadableStream({
        start(controller) {
            controller.enqueue(data);
            controller.close();
        }
    });

    // 將數據通過解壓縮串流
    const decompressedStream = readableStream.pipeThrough(ds);

    // 讀取解壓縮後的數據
    const reader = decompressedStream.getReader();
    const chunks = [];

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
    }

    // 合併所有 chunks
    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const result = new Uint8Array(totalLength);
    let offset = 0;

    for (const chunk of chunks) {
        result.set(chunk, offset);
        offset += chunk.length;
    }

    return result;
}

// ===== 通訊函數 =====

/**
 * 發送處理結果
 * @param {string} type - 結果類型
 * @param {Object} payload - 結果數據
 */
function sendResult(type, payload) {
    self.postMessage({
        type,
        payload
    });
}

/**
 * 發送日誌訊息
 * @param {string} level - 日誌級別 (info, success, error, warning)
 * @param {string} message - 日誌訊息
 */
function sendLog(level, message) {
    self.postMessage({
        type: 'LOG',
        payload: {
            level,
            message,
            timestamp: new Date().toISOString()
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
            message
        }
    });
}

// ===== 工具函數 =====

/**
 * 格式化位元組大小
 * @param {number} bytes - 位元組數
 * @returns {string} 格式化後的字串
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
