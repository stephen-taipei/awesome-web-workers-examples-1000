/**
 * 訊息序列化 Web Worker
 *
 * 功能：接收序列化訊息並回傳反序列化結果
 * 通訊模式：支援多種序列化格式
 *
 * @description
 * 此 Worker 接收不同格式的序列化資料，進行反序列化並返回結果，
 * 用於測試不同序列化格式的效能。
 */

// ===== 序列化器 =====

const serializers = {
    /**
     * JSON 序列化器
     */
    json: {
        deserialize: (str) => JSON.parse(str),
        serialize: (data) => JSON.stringify(data)
    },

    /**
     * Structured Clone (直接傳遞)
     */
    'structured-clone': {
        deserialize: (data) => data,
        serialize: (data) => data
    },

    /**
     * MessagePack 模擬
     */
    messagepack: {
        deserialize: (buffer) => {
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(buffer));
        },
        serialize: (data) => {
            const encoder = new TextEncoder();
            return encoder.encode(JSON.stringify(data));
        }
    },

    /**
     * 自訂格式
     */
    custom: {
        deserialize: (serialized) => {
            if (serialized.type === 'float64array') {
                return Array.from(new Float64Array(serialized.buffer));
            }
            return JSON.parse(serialized.data);
        },
        serialize: (data) => {
            if (Array.isArray(data) && data.every(n => typeof n === 'number')) {
                return { type: 'float64array', buffer: new Float64Array(data).buffer };
            }
            return { type: 'json', data: JSON.stringify(data) };
        }
    }
};

// ===== 訊息處理 =====

/**
 * 監聽主執行緒傳來的訊息
 */
self.onmessage = function(event) {
    const { type, testId, format, data, serializeTime } = event.data;

    switch (type) {
        case 'ECHO':
            handleEcho(testId, format, data, serializeTime);
            break;

        case 'BENCHMARK':
            handleBenchmark(testId, format, data);
            break;

        default:
            console.warn(`[Worker] 未知的訊息類型: ${type}`);
    }
};

/**
 * 處理 Echo 請求 (接收並返回)
 * @param {number} testId - 測試 ID
 * @param {string} format - 序列化格式
 * @param {*} data - 序列化後的資料
 * @param {number} serializeTime - 序列化耗時
 */
function handleEcho(testId, format, data, serializeTime) {
    const serializer = serializers[format];

    if (!serializer) {
        self.postMessage({
            type: 'ERROR',
            testId,
            error: `未知的序列化格式: ${format}`
        });
        return;
    }

    // 反序列化
    const startDeserialize = performance.now();
    let deserialized;
    try {
        deserialized = serializer.deserialize(data);
    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            testId,
            error: `反序列化失敗: ${error.message}`
        });
        return;
    }
    const deserializeTime = performance.now() - startDeserialize;

    // 處理資料 (簡單處理，用於驗證)
    const processStart = performance.now();
    const processed = processData(deserialized);
    const processTime = performance.now() - processStart;

    // 重新序列化並返回
    const startSerialize = performance.now();
    const serialized = serializer.serialize(processed);
    const reserializeTime = performance.now() - startSerialize;

    // 發送回應
    const response = {
        type: 'ECHO_RESPONSE',
        testId,
        format,
        data: serialized,
        deserializeTime,
        processTime,
        reserializeTime
    };

    // 檢查是否有 Transferable
    if (serialized && serialized.buffer instanceof ArrayBuffer) {
        self.postMessage(response, [serialized.buffer]);
    } else if (serialized instanceof Uint8Array) {
        self.postMessage(response, [serialized.buffer]);
    } else {
        self.postMessage(response);
    }
}

/**
 * 處理效能測試請求
 * @param {number} testId - 測試 ID
 * @param {string} format - 序列化格式
 * @param {*} data - 測試資料
 */
function handleBenchmark(testId, format, data) {
    const serializer = serializers[format];
    const iterations = 100;

    const results = {
        serializeTimes: [],
        deserializeTimes: []
    };

    for (let i = 0; i < iterations; i++) {
        // 序列化
        const startSerialize = performance.now();
        const serialized = serializer.serialize(data);
        results.serializeTimes.push(performance.now() - startSerialize);

        // 反序列化
        const startDeserialize = performance.now();
        serializer.deserialize(serialized);
        results.deserializeTimes.push(performance.now() - startDeserialize);
    }

    // 計算平均值
    const avgSerialize = average(results.serializeTimes);
    const avgDeserialize = average(results.deserializeTimes);

    self.postMessage({
        type: 'BENCHMARK_RESULT',
        testId,
        format,
        results: {
            avgSerialize,
            avgDeserialize,
            totalTime: avgSerialize + avgDeserialize,
            iterations
        }
    });
}

/**
 * 處理資料 (簡單驗證)
 * @param {*} data - 原始資料
 * @returns {*} 處理後的資料
 */
function processData(data) {
    // 簡單處理：如果是陣列，計算一些統計
    if (Array.isArray(data)) {
        return {
            original: data,
            stats: {
                length: data.length,
                sum: data.reduce((a, b) => (typeof b === 'number' ? a + b : a), 0)
            }
        };
    }

    // 其他資料直接返回
    return {
        original: data,
        processedAt: Date.now()
    };
}

/**
 * 計算陣列平均值
 * @param {number[]} arr - 數值陣列
 * @returns {number} 平均值
 */
function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// 通知主執行緒 Worker 已就緒
self.postMessage({ type: 'READY' });
