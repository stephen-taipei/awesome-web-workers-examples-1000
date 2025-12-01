/**
 * 階乘計算器 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理使用者互動與結果顯示
 * 通訊模式：postMessage
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 處理使用者輸入
 * 3. 傳送計算請求給 Worker
 * 4. 接收並顯示計算結果
 * 5. 提供階乘相關的有趣資訊
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 是否正在計算中
let isCalculating = false;

// ===== DOM 元素參考 =====

const elements = {
    // 輸入元素
    nInput: null,
    useCacheCheckbox: null,
    rangeStartInput: null,
    rangeEndInput: null,
    doubleNInput: null,

    // 按鈕元素
    calculateBtn: null,
    rangeBtn: null,
    doubleBtn: null,
    stopBtn: null,

    // 顯示元素
    progressBar: null,
    progressText: null,
    resultSection: null,
    resultValue: null,
    resultStats: null,
    rangeSection: null,
    rangeList: null,
    doubleSection: null,
    doubleResult: null,
    errorMessage: null,

    // 趣味資訊區域
    funFactsSection: null
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
    elements.useCacheCheckbox = document.getElementById('use-cache');
    elements.rangeStartInput = document.getElementById('range-start');
    elements.rangeEndInput = document.getElementById('range-end');
    elements.doubleNInput = document.getElementById('double-n-input');
    elements.calculateBtn = document.getElementById('calculate-btn');
    elements.rangeBtn = document.getElementById('range-btn');
    elements.doubleBtn = document.getElementById('double-btn');
    elements.stopBtn = document.getElementById('stop-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultValue = document.getElementById('result-value');
    elements.resultStats = document.getElementById('result-stats');
    elements.rangeSection = document.getElementById('range-section');
    elements.rangeList = document.getElementById('range-list');
    elements.doubleSection = document.getElementById('double-section');
    elements.doubleResult = document.getElementById('double-result');
    elements.errorMessage = document.getElementById('error-message');
    elements.funFactsSection = document.getElementById('fun-facts');
}

/**
 * 設定事件監聽器
 */
function setupEventListeners() {
    // 計算按鈕
    elements.calculateBtn.addEventListener('click', startCalculation);
    elements.rangeBtn.addEventListener('click', startRangeCalculation);
    elements.doubleBtn.addEventListener('click', startDoubleCalculation);

    // 停止按鈕
    elements.stopBtn.addEventListener('click', stopCalculation);

    // 輸入欄位驗證
    elements.nInput.addEventListener('input', validateNInput);

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const n = parseInt(this.dataset.n);
            elements.nInput.value = n;
            validateNInput();
        });
    });

    // N 值變化時更新趣味資訊
    elements.nInput.addEventListener('change', updateFunFacts);
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

        case 'RANGE_RESULT':
            displayRangeResult(payload);
            isCalculating = false;
            updateUIState(false);
            break;

        case 'DOUBLE_FACTORIAL_RESULT':
            displayDoubleResult(payload);
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
 * 開始計算單一階乘
 */
function startCalculation() {
    if (!validateNInput()) return;

    const n = parseInt(elements.nInput.value);
    const useCache = elements.useCacheCheckbox.checked;

    clearResults();
    isCalculating = true;
    updateUIState(true);

    worker.postMessage({
        type: 'START',
        payload: { n, useCache }
    });
}

/**
 * 開始計算範圍階乘
 */
function startRangeCalculation() {
    const start = parseInt(elements.rangeStartInput.value);
    const end = parseInt(elements.rangeEndInput.value);

    hideError();

    if (isNaN(start) || isNaN(end)) {
        showError('請輸入有效的範圍');
        return;
    }

    if (start < 0 || end < 0) {
        showError('數值不能為負數');
        return;
    }

    if (start > end) {
        showError('起始值不能大於結束值');
        return;
    }

    if (end > 1000) {
        showError('範圍結束值不能超過 1,000');
        return;
    }

    clearResults();
    isCalculating = true;
    updateUIState(true);

    worker.postMessage({
        type: 'CALCULATE_RANGE',
        payload: { start, end }
    });
}

/**
 * 開始計算雙階乘
 */
function startDoubleCalculation() {
    const n = parseInt(elements.doubleNInput.value);

    hideError();

    if (isNaN(n) || n < 0) {
        showError('請輸入有效的非負整數');
        return;
    }

    if (n > 50000) {
        showError('N 不能超過 50,000');
        return;
    }

    clearResults();
    isCalculating = true;
    updateUIState(true);

    worker.postMessage({
        type: 'CALCULATE_DOUBLE',
        payload: { n }
    });
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
    elements.rangeBtn.disabled = calculating;
    elements.doubleBtn.disabled = calculating;
    elements.stopBtn.disabled = !calculating;
    elements.nInput.disabled = calculating;
    elements.useCacheCheckbox.disabled = calculating;
    elements.rangeStartInput.disabled = calculating;
    elements.rangeEndInput.disabled = calculating;
    elements.doubleNInput.disabled = calculating;

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
        <div class="result-header">${result.n}! =</div>
        <div class="result-number">${displayValue}</div>
    `;

    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">數字位數：</span>
            <span class="stat-value">${result.digits.toLocaleString()} 位</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">末尾零個數：</span>
            <span class="stat-value">${result.trailingZeros.toLocaleString()} 個</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">計算耗時：</span>
            <span class="stat-value">${result.duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">使用快取：</span>
            <span class="stat-value">${result.cached ? '是' : '否'}</span>
        </div>
    `;

    // 如果數字很長，提供複製功能
    if (valueStr.length > 100) {
        elements.resultStats.innerHTML += `
            <div class="stat-item full-width">
                <button class="btn btn-small" onclick="copyFullNumber('${result.n}!')">
                    複製完整數字
                </button>
            </div>
        `;
        // 儲存完整數字供複製
        window.fullFactorialResult = valueStr;
    }

    elements.resultSection.classList.remove('hidden');
    elements.rangeSection.classList.add('hidden');
    elements.doubleSection.classList.add('hidden');

    // 更新趣味資訊
    updateFunFacts();
}

/**
 * 顯示範圍計算結果
 * @param {Object} result - 範圍結果物件
 */
function displayRangeResult(result) {
    updateProgress(100, '計算完成');

    elements.rangeList.innerHTML = `
        <p class="range-info">從 ${result.results[0].n}! 到 ${result.results[result.results.length - 1].n}! (耗時 ${result.duration.toFixed(2)} ms)：</p>
        <div class="range-grid">
            ${result.results.map(item => `
                <div class="range-item">
                    <span class="range-n">${item.n}!</span>
                    <span class="range-digits">(${item.digits} 位)</span>
                    <span class="range-value">${formatRangeValue(item.value)}</span>
                </div>
            `).join('')}
        </div>
    `;

    elements.rangeSection.classList.remove('hidden');
    elements.resultSection.classList.add('hidden');
    elements.doubleSection.classList.add('hidden');
}

/**
 * 顯示雙階乘結果
 * @param {Object} result - 雙階乘結果物件
 */
function displayDoubleResult(result) {
    updateProgress(100, '計算完成');

    const valueStr = result.value;
    const displayValue = valueStr.length > 100
        ? `${valueStr.substring(0, 50)}...${valueStr.substring(valueStr.length - 50)}`
        : valueStr;

    elements.doubleResult.innerHTML = `
        <div class="result-value">
            <div class="result-header">${result.n}!! =</div>
            <div class="result-number">${displayValue}</div>
        </div>
        <div class="result-stats">
            <div class="stat-item">
                <span class="stat-label">數字位數：</span>
                <span class="stat-value">${result.digits.toLocaleString()} 位</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">計算耗時：</span>
                <span class="stat-value">${result.duration.toFixed(2)} ms</span>
            </div>
        </div>
        <p class="double-info">
            雙階乘定義：${result.n}!! = ${result.n} × ${Math.max(result.n - 2, 1)} × ${Math.max(result.n - 4, 1)} × ...
        </p>
    `;

    elements.doubleSection.classList.remove('hidden');
    elements.resultSection.classList.add('hidden');
    elements.rangeSection.classList.add('hidden');
}

/**
 * 格式化範圍值顯示
 * @param {string} value - 數值字串
 * @returns {string} 格式化後的字串
 */
function formatRangeValue(value) {
    if (value.length > 30) {
        return `${value.substring(0, 12)}...${value.substring(value.length - 12)}`;
    }
    return value;
}

/**
 * 更新趣味資訊
 */
function updateFunFacts() {
    const n = parseInt(elements.nInput.value) || 0;

    if (n <= 0) {
        elements.funFactsSection.innerHTML = '<p>輸入一個數字來查看階乘的趣味資訊！</p>';
        return;
    }

    const trailingZeros = countTrailingZeros(n);
    const estimatedDigits = estimateDigits(n);

    elements.funFactsSection.innerHTML = `
        <h4>${n}! 的趣味資訊</h4>
        <ul>
            <li><strong>末尾零個數：</strong>${trailingZeros.toLocaleString()} 個
                <span class="fun-fact-note">(因子 5 的個數決定)</span>
            </li>
            <li><strong>估計位數：</strong>約 ${estimatedDigits.toLocaleString()} 位
                <span class="fun-fact-note">(使用斯特靈公式估算)</span>
            </li>
            <li><strong>組合意義：</strong>${n} 個不同物品的排列方式數量</li>
            ${n <= 20 ? `<li><strong>精確值：</strong>${factorial(n).toLocaleString()}</li>` : ''}
        </ul>
    `;
}

/**
 * 計算末尾零個數 (客戶端版本)
 * @param {number} n - 數字 N
 * @returns {number} 末尾零的個數
 */
function countTrailingZeros(n) {
    let count = 0;
    let powerOf5 = 5;

    while (powerOf5 <= n) {
        count += Math.floor(n / powerOf5);
        powerOf5 *= 5;
    }

    return count;
}

/**
 * 估計 N! 的位數 (使用斯特靈公式)
 * log10(N!) ≈ N × log10(N/e) + 0.5 × log10(2πN)
 * @param {number} n - 數字 N
 * @returns {number} 估計位數
 */
function estimateDigits(n) {
    if (n === 0 || n === 1) return 1;

    const log10 = Math.log10;
    const e = Math.E;
    const pi = Math.PI;

    const logFactorial = n * log10(n / e) + 0.5 * log10(2 * pi * n);

    return Math.floor(logFactorial) + 1;
}

/**
 * 計算小數階乘 (客戶端用於小數顯示)
 * @param {number} n - 數字 N
 * @returns {number} N!
 */
function factorial(n) {
    if (n === 0 || n === 1) return 1;
    let result = 1;
    for (let i = 2; i <= n; i++) {
        result *= i;
    }
    return result;
}

/**
 * 清除結果顯示
 */
function clearResults() {
    elements.resultSection.classList.add('hidden');
    elements.rangeSection.classList.add('hidden');
    elements.doubleSection.classList.add('hidden');
    elements.resultValue.innerHTML = '';
    elements.resultStats.innerHTML = '';
    elements.rangeList.innerHTML = '';
    elements.doubleResult.innerHTML = '';
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
 * @param {string} label - 標籤 (如 "100!")
 */
function copyFullNumber(label) {
    if (window.fullFactorialResult) {
        navigator.clipboard.writeText(window.fullFactorialResult).then(() => {
            alert(`已複製 ${label} 的完整數字到剪貼簿！`);
        }).catch(err => {
            console.error('複製失敗:', err);
            alert('複製失敗，請手動選取複製');
        });
    }
}

// 將 copyFullNumber 設為全域函數以供 HTML onclick 使用
window.copyFullNumber = copyFullNumber;
