/**
 * 費波那契數列 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理使用者互動與結果顯示
 * 通訊模式：postMessage
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 處理使用者輸入與演算法選擇
 * 3. 傳送計算請求給 Worker
 * 4. 接收並顯示計算結果
 * 5. 提供不同演算法的效能比較
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 是否正在計算中
let isCalculating = false;

// 效能比較數據
const performanceData = {
    iterative: null,
    matrix: null,
    memoization: null
};

// ===== DOM 元素參考 =====

const elements = {
    // 輸入元素
    nInput: null,
    algorithmSelect: null,
    sequenceCountInput: null,

    // 按鈕元素
    calculateBtn: null,
    sequenceBtn: null,
    compareBtn: null,
    stopBtn: null,

    // 顯示元素
    progressBar: null,
    progressText: null,
    resultSection: null,
    resultValue: null,
    resultStats: null,
    sequenceSection: null,
    sequenceList: null,
    errorMessage: null,

    // 效能比較區域
    comparisonSection: null,
    comparisonResults: null
};

// ===== 初始化 =====

/**
 * 頁面載入完成後初始化應用程式
 */
document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    updateUIState(false);
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.nInput = document.getElementById('n-input');
    elements.algorithmSelect = document.getElementById('algorithm-select');
    elements.sequenceCountInput = document.getElementById('sequence-count');
    elements.calculateBtn = document.getElementById('calculate-btn');
    elements.sequenceBtn = document.getElementById('sequence-btn');
    elements.compareBtn = document.getElementById('compare-btn');
    elements.stopBtn = document.getElementById('stop-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultValue = document.getElementById('result-value');
    elements.resultStats = document.getElementById('result-stats');
    elements.sequenceSection = document.getElementById('sequence-section');
    elements.sequenceList = document.getElementById('sequence-list');
    elements.errorMessage = document.getElementById('error-message');
    elements.comparisonSection = document.getElementById('comparison-section');
    elements.comparisonResults = document.getElementById('comparison-results');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    // 計算按鈕
    elements.calculateBtn.addEventListener('click', startCalculation);

    // 數列按鈕
    elements.sequenceBtn.addEventListener('click', startSequenceCalculation);

    // 比較按鈕
    elements.compareBtn.addEventListener('click', startComparison);

    // 停止按鈕
    elements.stopBtn.addEventListener('click', stopCalculation);

    // 輸入欄位驗證
    elements.nInput.addEventListener('input', validateNInput);
    elements.sequenceCountInput.addEventListener('input', validateSequenceInput);

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const n = parseInt(this.dataset.n);
            elements.nInput.value = n;
            validateNInput();
        });
    });
}

/**
 * 初始化 Web Worker
 */
function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        elements.calculateBtn.disabled = true;
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

// ===== Worker 通訊 =====

/**
 * 處理來自 Worker 的訊息
 * @param {MessageEvent} event - 訊息事件
 */
function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;

        case 'RESULT':
            displayResult(payload);
            isCalculating = false;
            updateUIState(false);
            break;

        case 'SEQUENCE_RESULT':
            displaySequence(payload);
            isCalculating = false;
            updateUIState(false);
            break;

        case 'ERROR':
            showError(payload.message);
            isCalculating = false;
            updateUIState(false);
            break;

        default:
            console.warn('未知的訊息類型:', type);
    }
}

/**
 * 處理 Worker 錯誤
 * @param {ErrorEvent} error - 錯誤事件
 */
function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    isCalculating = false;
    updateUIState(false);

    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== 計算控制 =====

/**
 * 開始計算單一費波那契數
 */
function startCalculation() {
    if (!validateNInput()) return;

    const n = parseInt(elements.nInput.value);
    const algorithm = elements.algorithmSelect.value;

    clearResults();
    isCalculating = true;
    updateUIState(true);

    worker.postMessage({
        type: 'START',
        payload: { n, algorithm }
    });
}

/**
 * 開始計算費波那契數列
 */
function startSequenceCalculation() {
    if (!validateSequenceInput()) return;

    const count = parseInt(elements.sequenceCountInput.value);

    clearResults();
    isCalculating = true;
    updateUIState(true);

    worker.postMessage({
        type: 'CALCULATE_SEQUENCE',
        payload: { count }
    });
}

/**
 * 開始效能比較
 */
async function startComparison() {
    if (!validateNInput()) return;

    const n = parseInt(elements.nInput.value);
    const algorithms = ['iterative', 'matrix', 'memoization'];

    clearResults();
    elements.comparisonSection.classList.remove('hidden');
    elements.comparisonResults.innerHTML = '<p class="comparing-text">正在進行效能比較...</p>';

    isCalculating = true;
    updateUIState(true);

    // 重置效能數據
    Object.keys(performanceData).forEach(key => performanceData[key] = null);

    // 依序執行每個演算法
    for (const algorithm of algorithms) {
        if (!isCalculating) break;

        updateProgress(0, `測試 ${getAlgorithmName(algorithm)} 演算法...`);

        // 建立 Promise 以等待結果
        await new Promise((resolve) => {
            const tempHandler = (event) => {
                const { type, payload } = event.data;

                if (type === 'RESULT') {
                    performanceData[algorithm] = {
                        duration: payload.duration,
                        digits: payload.digits
                    };
                    resolve();
                } else if (type === 'PROGRESS') {
                    updateProgress(payload.percent, `${getAlgorithmName(algorithm)}: ${payload.message}`);
                } else if (type === 'ERROR') {
                    performanceData[algorithm] = { error: payload.message };
                    resolve();
                }
            };

            worker.onmessage = tempHandler;

            worker.postMessage({
                type: 'START',
                payload: { n, algorithm }
            });
        });
    }

    // 恢復原本的訊息處理器
    worker.onmessage = handleWorkerMessage;

    // 顯示比較結果
    displayComparisonResults(n);

    isCalculating = false;
    updateUIState(false);
}

/**
 * 停止計算
 */
function stopCalculation() {
    if (worker && isCalculating) {
        worker.postMessage({ type: 'STOP' });
        worker.terminate();
        initializeWorker();

        isCalculating = false;
        updateUIState(false);
        updateProgress(0, '計算已取消');
    }
}

// ===== UI 更新 =====

/**
 * 更新 UI 狀態
 * @param {boolean} calculating - 是否正在計算中
 */
function updateUIState(calculating) {
    elements.calculateBtn.disabled = calculating;
    elements.sequenceBtn.disabled = calculating;
    elements.compareBtn.disabled = calculating;
    elements.stopBtn.disabled = !calculating;
    elements.nInput.disabled = calculating;
    elements.algorithmSelect.disabled = calculating;
    elements.sequenceCountInput.disabled = calculating;

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.disabled = calculating;
    });
}

/**
 * 更新進度顯示
 * @param {number} percent - 進度百分比
 * @param {string} message - 進度訊息
 */
function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

/**
 * 驗證 N 值輸入
 * @returns {boolean} 輸入是否有效
 */
function validateNInput() {
    const n = parseInt(elements.nInput.value);
    hideError();

    if (isNaN(n)) {
        showError('請輸入有效的數字');
        return false;
    }

    if (n < 0) {
        showError('N 必須是非負整數');
        return false;
    }

    if (n > 100000) {
        showError('N 不能超過 100,000');
        return false;
    }

    return true;
}

/**
 * 驗證數列項數輸入
 * @returns {boolean} 輸入是否有效
 */
function validateSequenceInput() {
    const count = parseInt(elements.sequenceCountInput.value);
    hideError();

    if (isNaN(count) || count < 1) {
        showError('項數必須是正整數');
        return false;
    }

    if (count > 10000) {
        showError('項數不能超過 10,000');
        return false;
    }

    return true;
}

/**
 * 顯示計算結果
 * @param {Object} result - 結果物件
 */
function displayResult(result) {
    updateProgress(100, '計算完成');

    // 格式化大數顯示
    const valueStr = result.value;
    const displayValue = valueStr.length > 100
        ? `${valueStr.substring(0, 50)}...${valueStr.substring(valueStr.length - 50)}`
        : valueStr;

    elements.resultValue.innerHTML = `
        <div class="result-header">F(${result.n}) =</div>
        <div class="result-number">${displayValue}</div>
    `;

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">數字位數：</span>
            <span class="stat-value">${result.digits.toLocaleString()} 位</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">計算耗時：</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">使用演算法：</span>
            <span class="stat-value">${getAlgorithmName(result.algorithm)}</span>
        </div>
    `;

    // 如果數字很長，提供複製完整數字的功能
    if (valueStr.length > 100) {
        elements.resultStats.innerHTML += `
            <div class="stat-item full-width">
                <button class="btn btn-small" onclick="copyFullNumber('${valueStr}')">
                    複製完整數字
                </button>
            </div>
        `;
    }

    elements.resultSection.classList.remove('hidden');
    elements.sequenceSection.classList.add('hidden');
}

/**
 * 顯示數列結果
 * @param {Object} result - 數列結果物件
 */
function displaySequence(result) {
    updateProgress(100, '計算完成');

    elements.sequenceList.innerHTML = `
        <p class="sequence-info">前 ${result.count} 項費波那契數列 (耗時 ${result.duration.toFixed(2)} ms)：</p>
        <div class="sequence-grid">
            ${result.sequence.map((val, idx) => `
                <div class="sequence-item">
                    <span class="sequence-index">F(${idx})</span>
                    <span class="sequence-value">${formatSequenceValue(val)}</span>
                </div>
            `).join('')}
        </div>
    `;

    elements.sequenceSection.classList.remove('hidden');
    elements.resultSection.classList.add('hidden');
}

/**
 * 顯示效能比較結果
 * @param {number} n - 計算的 N 值
 */
function displayComparisonResults(n) {
    const algorithms = ['iterative', 'matrix', 'memoization'];

    // 找出最快的演算法
    let fastest = null;
    let fastestTime = Infinity;

    algorithms.forEach(algo => {
        if (performanceData[algo] && !performanceData[algo].error) {
            if (performanceData[algo].duration < fastestTime) {
                fastestTime = performanceData[algo].duration;
                fastest = algo;
            }
        }
    });

    elements.comparisonResults.innerHTML = `
        <h4>計算 F(${n}) 的效能比較</h4>
        <div class="comparison-grid">
            ${algorithms.map(algo => {
                const data = performanceData[algo];
                const isFastest = algo === fastest;

                if (data && data.error) {
                    return `
                        <div class="comparison-item error">
                            <div class="algo-name">${getAlgorithmName(algo)}</div>
                            <div class="algo-time">錯誤</div>
                            <div class="algo-note">${data.error}</div>
                        </div>
                    `;
                }

                if (data) {
                    const speedup = fastestTime > 0 ? (data.duration / fastestTime).toFixed(2) : '-';
                    return `
                        <div class="comparison-item ${isFastest ? 'fastest' : ''}">
                            <div class="algo-name">${getAlgorithmName(algo)}</div>
                            <div class="algo-time">${data.duration.toFixed(2)} ms</div>
                            <div class="algo-note">
                                ${isFastest ? '最快' : `慢 ${speedup}x`}
                            </div>
                        </div>
                    `;
                }

                return '';
            }).join('')}
        </div>
        <div class="comparison-summary">
            <p><strong>結論：</strong>對於 N=${n}，
            ${fastest === 'matrix'
                ? '矩陣快速冪法表現最佳，特別適合大數計算 (O(log n))'
                : fastest === 'iterative'
                    ? '迭代法表現最佳，實作簡單且效率高 (O(n))'
                    : '記憶化方法表現最佳 (O(n))'
            }</p>
        </div>
    `;

    updateProgress(100, '效能比較完成');
}

/**
 * 取得演算法名稱
 * @param {string} algorithm - 演算法代碼
 * @returns {string} 演算法中文名稱
 */
function getAlgorithmName(algorithm) {
    const names = {
        'iterative': '迭代法',
        'matrix': '矩陣快速冪',
        'memoization': '記憶化'
    };
    return names[algorithm] || algorithm;
}

/**
 * 格式化數列值顯示
 * @param {string} value - 數值字串
 * @returns {string} 格式化後的字串
 */
function formatSequenceValue(value) {
    if (value.length > 20) {
        return `${value.substring(0, 8)}...${value.substring(value.length - 8)}`;
    }
    return value;
}

/**
 * 清除結果顯示
 */
function clearResults() {
    elements.resultSection.classList.add('hidden');
    elements.sequenceSection.classList.add('hidden');
    elements.comparisonSection.classList.add('hidden');
    elements.resultValue.innerHTML = '';
    elements.resultStats.innerHTML = '';
    elements.sequenceList.innerHTML = '';
    updateProgress(0, '準備就緒');
}

/**
 * 顯示錯誤訊息
 * @param {string} message - 錯誤訊息
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

/**
 * 複製完整數字到剪貼簿
 * @param {string} value - 要複製的數字
 */
function copyFullNumber(value) {
    navigator.clipboard.writeText(value).then(() => {
        alert('已複製完整數字到剪貼簿！');
    }).catch(err => {
        console.error('複製失敗:', err);
        alert('複製失敗，請手動選取複製');
    });
}

// 將 copyFullNumber 設為全域函數以供 HTML onclick 使用
window.copyFullNumber = copyFullNumber;
