/**
 * 訊息序列化 - 主執行緒腳本
 *
 * 功能：展示不同的訊息序列化格式和效能比較
 * 通訊模式：可配置的序列化方式
 *
 * @description
 * 此腳本展示如何使用不同的序列化格式在主執行緒和 Worker 之間傳遞資料，
 * 並提供效能比較功能。
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 當前選擇的格式
let currentFormat = 'json';

// 當前測試資料類型
let currentDataType = 'simple';

// 待處理的測試回應
const pendingTests = new Map();
let testIdCounter = 0;

// ===== 序列化器 =====

const serializers = {
    /**
     * JSON 序列化器
     */
    json: {
        name: 'JSON',
        serialize: (data) => JSON.stringify(data),
        deserialize: (str) => JSON.parse(str),
        getSize: (serialized) => new Blob([serialized]).size
    },

    /**
     * Structured Clone (直接傳遞，由瀏覽器處理)
     */
    'structured-clone': {
        name: 'Structured Clone',
        serialize: (data) => data,
        deserialize: (data) => data,
        getSize: (data) => new Blob([JSON.stringify(data)]).size
    },

    /**
     * MessagePack 模擬 (簡化實現)
     */
    messagepack: {
        name: 'MessagePack',
        serialize: (data) => {
            // 簡化版 MessagePack 編碼
            const json = JSON.stringify(data);
            const encoder = new TextEncoder();
            return encoder.encode(json);
        },
        deserialize: (buffer) => {
            const decoder = new TextDecoder();
            return JSON.parse(decoder.decode(buffer));
        },
        getSize: (buffer) => buffer.byteLength,
        transferable: true
    },

    /**
     * 自訂格式 (針對數值陣列優化)
     */
    custom: {
        name: '自訂格式',
        serialize: (data) => {
            // 對於數值陣列，使用 Float64Array
            if (Array.isArray(data) && data.every(n => typeof n === 'number')) {
                const buffer = new Float64Array(data).buffer;
                return { type: 'float64array', buffer };
            }
            // 其他資料使用 JSON
            return { type: 'json', data: JSON.stringify(data) };
        },
        deserialize: (serialized) => {
            if (serialized.type === 'float64array') {
                return Array.from(new Float64Array(serialized.buffer));
            }
            return JSON.parse(serialized.data);
        },
        getSize: (serialized) => {
            if (serialized.type === 'float64array') {
                return serialized.buffer.byteLength;
            }
            return new Blob([serialized.data]).size;
        },
        transferable: true
    }
};

// ===== 測試資料生成器 =====

const dataGenerators = {
    /**
     * 簡單物件
     */
    simple: () => ({
        name: 'Test Object',
        value: 42,
        active: true,
        timestamp: Date.now()
    }),

    /**
     * 巢狀物件
     */
    nested: () => ({
        user: {
            id: 12345,
            name: 'John Doe',
            email: 'john@example.com',
            profile: {
                age: 30,
                location: {
                    city: 'Taipei',
                    country: 'Taiwan',
                    coordinates: { lat: 25.0330, lng: 121.5654 }
                },
                interests: ['coding', 'music', 'travel']
            }
        },
        metadata: {
            createdAt: Date.now(),
            version: '1.0.0',
            tags: ['user', 'profile', 'active']
        }
    }),

    /**
     * 大型數值陣列
     */
    array: (size = 1000) => {
        return Array.from({ length: size }, () => Math.random() * 1000);
    },

    /**
     * 二進位資料
     */
    binary: (size = 1024) => {
        const buffer = new ArrayBuffer(size);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < size; i++) {
            view[i] = Math.floor(Math.random() * 256);
        }
        return { type: 'binary', data: Array.from(view) };
    },

    /**
     * 混合資料
     */
    mixed: () => ({
        id: 'mixed-001',
        numbers: Array.from({ length: 100 }, () => Math.random()),
        strings: Array.from({ length: 50 }, (_, i) => `item-${i}`),
        nested: {
            deep: {
                value: { data: [1, 2, 3, 4, 5] }
            }
        },
        boolean: true,
        nullable: null,
        timestamp: Date.now()
    })
};

// ===== DOM 元素參考 =====

const elements = {
    formatInputs: null,
    dataTypeButtons: null,
    dataPreview: null,
    arraySizeGroup: null,
    arraySize: null,
    iterations: null,
    runTestBtn: null,
    runAllBtn: null,
    sendOnceBtn: null,
    progressContainer: null,
    progressBar: null,
    progressText: null,
    resultSection: null,
    singleResult: null,
    comparisonResult: null,
    serializeTime: null,
    deserializeTime: null,
    transferTime: null,
    dataSize: null,
    comparisonTbody: null,
    logContainer: null,
    clearLogBtn: null,
    errorMessage: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    updateDataPreview();
    log('系統', '訊息序列化系統已初始化', 'system');
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.formatInputs = document.querySelectorAll('input[name="format"]');
    elements.dataTypeButtons = document.querySelectorAll('.data-type-btn');
    elements.dataPreview = document.getElementById('data-preview');
    elements.arraySizeGroup = document.getElementById('array-size-group');
    elements.arraySize = document.getElementById('array-size');
    elements.iterations = document.getElementById('iterations');
    elements.runTestBtn = document.getElementById('run-test-btn');
    elements.runAllBtn = document.getElementById('run-all-btn');
    elements.sendOnceBtn = document.getElementById('send-once-btn');
    elements.progressContainer = document.getElementById('progress-container');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.singleResult = document.getElementById('single-result');
    elements.comparisonResult = document.getElementById('comparison-result');
    elements.serializeTime = document.getElementById('serialize-time');
    elements.deserializeTime = document.getElementById('deserialize-time');
    elements.transferTime = document.getElementById('transfer-time');
    elements.dataSize = document.getElementById('data-size');
    elements.comparisonTbody = document.getElementById('comparison-tbody');
    elements.logContainer = document.getElementById('log-container');
    elements.clearLogBtn = document.getElementById('clear-log-btn');
    elements.errorMessage = document.getElementById('error-message');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    // 格式選擇
    elements.formatInputs.forEach(input => {
        input.addEventListener('change', function() {
            currentFormat = this.value;
            log('格式', `已切換到 ${serializers[currentFormat].name}`, 'format');
        });
    });

    // 資料類型選擇
    elements.dataTypeButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            elements.dataTypeButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentDataType = this.dataset.type;
            updateDataPreview();

            // 顯示/隱藏陣列大小設定
            elements.arraySizeGroup.style.display =
                (currentDataType === 'array' || currentDataType === 'binary') ? 'block' : 'none';
        });
    });

    // 陣列大小變更
    elements.arraySize.addEventListener('change', updateDataPreview);

    // 測試按鈕
    elements.runTestBtn.addEventListener('click', runPerformanceTest);
    elements.runAllBtn.addEventListener('click', runComparisonTest);
    elements.sendOnceBtn.addEventListener('click', sendOnce);
    elements.clearLogBtn.addEventListener('click', clearLog);
}

/**
 * 初始化 Web Worker
 */
function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

// ===== 測試函數 =====

/**
 * 生成測試資料
 */
function generateTestData() {
    const size = parseInt(elements.arraySize.value) || 1000;

    if (currentDataType === 'array') {
        return dataGenerators.array(size);
    } else if (currentDataType === 'binary') {
        return dataGenerators.binary(size);
    } else {
        return dataGenerators[currentDataType]();
    }
}

/**
 * 更新資料預覽
 */
function updateDataPreview() {
    const data = generateTestData();
    let preview = JSON.stringify(data, null, 2);

    // 限制預覽長度
    if (preview.length > 500) {
        preview = preview.substring(0, 500) + '\n... (已截斷)';
    }

    elements.dataPreview.textContent = preview;
}

/**
 * 發送一次訊息
 */
function sendOnce() {
    const data = generateTestData();
    const serializer = serializers[currentFormat];
    const testId = ++testIdCounter;

    const startSerialize = performance.now();
    const serialized = serializer.serialize(data);
    const serializeTime = performance.now() - startSerialize;

    const size = serializer.getSize(serialized);

    // 記錄待處理測試
    pendingTests.set(testId, {
        startTime: performance.now(),
        serializeTime
    });

    // 準備傳輸資料
    const message = {
        type: 'ECHO',
        testId,
        format: currentFormat,
        data: serialized,
        serializeTime
    };

    // 如果支援 Transferable，使用它
    if (serializer.transferable && serialized.buffer) {
        worker.postMessage(message, [serialized.buffer]);
    } else {
        worker.postMessage(message);
    }

    log('發送', `[${serializer.name}] 大小: ${formatBytes(size)}`, 'send');
}

/**
 * 執行效能測試
 */
async function runPerformanceTest() {
    const iterations = parseInt(elements.iterations.value) || 100;
    const data = generateTestData();
    const serializer = serializers[currentFormat];

    showProgress(true);
    updateProgress(0, '準備測試...');

    const results = {
        serializeTimes: [],
        deserializeTimes: [],
        transferTimes: []
    };

    for (let i = 0; i < iterations; i++) {
        // 序列化測試
        const startSerialize = performance.now();
        const serialized = serializer.serialize(data);
        results.serializeTimes.push(performance.now() - startSerialize);

        // 反序列化測試
        const startDeserialize = performance.now();
        serializer.deserialize(serialized);
        results.deserializeTimes.push(performance.now() - startDeserialize);

        // 更新進度
        if (i % 10 === 0) {
            updateProgress((i / iterations) * 100, `測試中... ${i}/${iterations}`);
            await sleep(0);
        }
    }

    // 計算統計
    const avgSerialize = average(results.serializeTimes);
    const avgDeserialize = average(results.deserializeTimes);
    const dataSize = serializer.getSize(serializer.serialize(data));

    // 顯示結果
    showProgress(false);
    showSingleResult({
        serializeTime: avgSerialize,
        deserializeTime: avgDeserialize,
        transferTime: avgSerialize + avgDeserialize,
        dataSize
    });

    log('結果', `[${serializer.name}] 序列化: ${avgSerialize.toFixed(3)}ms, 反序列化: ${avgDeserialize.toFixed(3)}ms`, 'result');
}

/**
 * 執行比較測試
 */
async function runComparisonTest() {
    const iterations = parseInt(elements.iterations.value) || 100;
    const data = generateTestData();

    showProgress(true);
    const results = [];
    const formats = Object.keys(serializers);

    for (let f = 0; f < formats.length; f++) {
        const format = formats[f];
        const serializer = serializers[format];

        updateProgress((f / formats.length) * 100, `測試 ${serializer.name}...`);

        const serializeTimes = [];
        const deserializeTimes = [];

        for (let i = 0; i < iterations; i++) {
            try {
                const startSerialize = performance.now();
                const serialized = serializer.serialize(data);
                serializeTimes.push(performance.now() - startSerialize);

                const startDeserialize = performance.now();
                serializer.deserialize(serialized);
                deserializeTimes.push(performance.now() - startDeserialize);
            } catch (error) {
                console.error(`${format} 錯誤:`, error);
            }

            if (i % 50 === 0) {
                await sleep(0);
            }
        }

        const avgSerialize = average(serializeTimes);
        const avgDeserialize = average(deserializeTimes);

        results.push({
            format: serializer.name,
            serializeTime: avgSerialize,
            deserializeTime: avgDeserialize,
            totalTime: avgSerialize + avgDeserialize,
            dataSize: serializer.getSize(serializer.serialize(data))
        });
    }

    showProgress(false);
    showComparisonResult(results);

    log('比較', `完成 ${formats.length} 種格式的比較測試`, 'result');
}

// ===== Worker 通訊 =====

/**
 * 處理 Worker 訊息
 */
function handleWorkerMessage(event) {
    const { type, testId, deserializeTime, processTime } = event.data;

    if (type === 'ECHO_RESPONSE') {
        const pending = pendingTests.get(testId);
        if (pending) {
            const transferTime = performance.now() - pending.startTime;

            showSingleResult({
                serializeTime: pending.serializeTime,
                deserializeTime: deserializeTime,
                transferTime: transferTime,
                dataSize: 0  // 由 Worker 回報
            });

            log('接收', `往返時間: ${transferTime.toFixed(3)}ms`, 'receive');
            pendingTests.delete(testId);
        }
    }
}

/**
 * 處理 Worker 錯誤
 */
function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    log('錯誤', error.message, 'error');
}

// ===== UI 更新函數 =====

/**
 * 顯示/隱藏進度
 */
function showProgress(show) {
    elements.progressContainer.style.display = show ? 'block' : 'none';
}

/**
 * 更新進度
 */
function updateProgress(percent, text) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${Math.round(percent)}%`;
    elements.progressText.textContent = text;
}

/**
 * 顯示單一測試結果
 */
function showSingleResult(result) {
    elements.resultSection.style.display = 'block';
    elements.singleResult.style.display = 'block';
    elements.comparisonResult.style.display = 'none';

    elements.serializeTime.textContent = `${result.serializeTime.toFixed(3)} ms`;
    elements.deserializeTime.textContent = `${result.deserializeTime.toFixed(3)} ms`;
    elements.transferTime.textContent = `${result.transferTime.toFixed(3)} ms`;
    elements.dataSize.textContent = formatBytes(result.dataSize);
}

/**
 * 顯示比較結果
 */
function showComparisonResult(results) {
    elements.resultSection.style.display = 'block';
    elements.singleResult.style.display = 'none';
    elements.comparisonResult.style.display = 'block';

    // 找出最快的
    const fastest = Math.min(...results.map(r => r.totalTime));
    const smallest = Math.min(...results.map(r => r.dataSize));

    let html = '';
    results.forEach(result => {
        const isFastest = result.totalTime === fastest;
        const isSmallest = result.dataSize === smallest;

        html += `
            <tr class="${isFastest ? 'fastest' : ''}">
                <td>
                    ${result.format}
                    ${isFastest ? '<span class="badge badge-success">最快</span>' : ''}
                    ${isSmallest ? '<span class="badge badge-primary">最小</span>' : ''}
                </td>
                <td>${result.serializeTime.toFixed(3)} ms</td>
                <td>${result.deserializeTime.toFixed(3)} ms</td>
                <td>${result.totalTime.toFixed(3)} ms</td>
                <td>${formatBytes(result.dataSize)}</td>
            </tr>
        `;
    });

    elements.comparisonTbody.innerHTML = html;
}

/**
 * 添加日誌訊息
 */
function log(type, message, className = '') {
    const logContainer = elements.logContainer;

    const emptyMessage = logContainer.querySelector('.empty-message');
    if (emptyMessage) {
        emptyMessage.remove();
    }

    const logItem = document.createElement('div');
    logItem.className = `log-item ${className}`;

    const timestamp = new Date().toLocaleTimeString();
    logItem.innerHTML = `
        <span class="log-time">${timestamp}</span>
        <span class="log-type">[${type}]</span>
        <span class="log-message">${message}</span>
    `;

    logContainer.insertBefore(logItem, logContainer.firstChild);

    const maxLogs = 50;
    while (logContainer.children.length > maxLogs) {
        logContainer.removeChild(logContainer.lastChild);
    }
}

/**
 * 清除日誌
 */
function clearLog() {
    elements.logContainer.innerHTML = '<p class="empty-message">尚無通訊記錄</p>';
}

/**
 * 顯示錯誤訊息
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

/**
 * 隱藏錯誤訊息
 */
function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// ===== 工具函數 =====

/**
 * 計算陣列平均值
 */
function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

/**
 * 格式化位元組大小
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 延遲函數
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
