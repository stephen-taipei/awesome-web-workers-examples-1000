/**
 * 質數產生器 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理使用者互動與結果顯示
 * 通訊模式：postMessage
 *
 * @description
 * 此腳本負責：
 * 1. 建立與管理 Web Worker
 * 2. 處理使用者輸入與表單驗證
 * 3. 傳送計算請求給 Worker
 * 4. 接收並顯示計算結果
 * 5. 提供主執行緒計算功能作為效能對照
 */

// ===== 全域變數 =====

// Web Worker 實例
let worker = null;

// 是否正在計算中
let isCalculating = false;

// ===== DOM 元素參考 =====

const elements = {
    // 輸入元素
    startInput: null,
    endInput: null,

    // 按鈕元素
    workerBtn: null,
    mainThreadBtn: null,
    stopBtn: null,

    // 顯示元素
    progressBar: null,
    progressText: null,
    resultSection: null,
    resultStats: null,
    resultList: null,
    errorMessage: null,

    // 效能比較區域
    comparisonSection: null,
    workerTime: null,
    mainThreadTime: null,
    speedup: null
};

// ===== 初始化 =====

/**
 * 頁面載入完成後初始化應用程式
 */
document.addEventListener('DOMContentLoaded', function() {
    // 取得所有 DOM 元素參考
    initializeElements();

    // 設定事件監聽器
    setupEventListeners();

    // 初始化 Web Worker
    initializeWorker();

    // 更新 UI 初始狀態
    updateUIState(false);
});

/**
 * 初始化 DOM 元素參考
 */
function initializeElements() {
    elements.startInput = document.getElementById('start-input');
    elements.endInput = document.getElementById('end-input');
    elements.workerBtn = document.getElementById('worker-btn');
    elements.mainThreadBtn = document.getElementById('main-thread-btn');
    elements.stopBtn = document.getElementById('stop-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.resultSection = document.getElementById('result-section');
    elements.resultStats = document.getElementById('result-stats');
    elements.resultList = document.getElementById('result-list');
    elements.errorMessage = document.getElementById('error-message');
    elements.comparisonSection = document.getElementById('comparison-section');
    elements.workerTime = document.getElementById('worker-time');
    elements.mainThreadTime = document.getElementById('main-thread-time');
    elements.speedup = document.getElementById('speedup');
}

/**
 * 設定事件監聯器
 */
function setupEventListeners() {
    // Worker 計算按鈕
    elements.workerBtn.addEventListener('click', startWorkerCalculation);

    // 主執行緒計算按鈕
    elements.mainThreadBtn.addEventListener('click', startMainThreadCalculation);

    // 停止按鈕
    elements.stopBtn.addEventListener('click', stopCalculation);

    // 輸入欄位驗證
    elements.startInput.addEventListener('input', validateInputs);
    elements.endInput.addEventListener('input', validateInputs);

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const end = parseInt(this.dataset.end);
            elements.startInput.value = 2;
            elements.endInput.value = end;
            validateInputs();
        });
    });
}

/**
 * 初始化 Web Worker
 */
function initializeWorker() {
    // 檢查瀏覽器是否支援 Web Workers
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        elements.workerBtn.disabled = true;
        return;
    }

    // 建立新的 Worker 實例
    worker = new Worker('worker.js');

    // 設定訊息處理器
    worker.onmessage = handleWorkerMessage;

    // 設定錯誤處理器
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
            // 更新進度
            updateProgress(payload.percent, payload.message);
            break;

        case 'RESULT':
            // 顯示結果
            displayResult(payload.primes, payload.count, payload.duration, 'worker');
            isCalculating = false;
            updateUIState(false);
            break;

        case 'ERROR':
            // 顯示錯誤
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

    // 重新建立 Worker
    if (worker) {
        worker.terminate();
    }
    initializeWorker();
}

// ===== 計算控制 =====

/**
 * 開始使用 Worker 計算
 */
function startWorkerCalculation() {
    // 驗證輸入
    if (!validateInputs()) {
        return;
    }

    const start = parseInt(elements.startInput.value);
    const end = parseInt(elements.endInput.value);

    // 清除之前的結果
    clearResults();

    // 更新 UI 狀態
    isCalculating = true;
    updateUIState(true);

    // 發送計算請求給 Worker
    worker.postMessage({
        type: 'START',
        payload: { start, end }
    });
}

/**
 * 開始在主執行緒計算 (用於效能比較)
 */
function startMainThreadCalculation() {
    // 驗證輸入
    if (!validateInputs()) {
        return;
    }

    const start = parseInt(elements.startInput.value);
    const end = parseInt(elements.endInput.value);

    // 警告使用者大範圍計算可能會凍結 UI
    if (end > 1000000) {
        const confirmed = confirm(
            `警告：在主執行緒計算 ${end.toLocaleString()} 以內的質數可能會導致頁面暫時無回應。\n\n` +
            '建議使用 Worker 計算以保持頁面流暢。\n\n' +
            '確定要繼續嗎？'
        );
        if (!confirmed) {
            return;
        }
    }

    // 清除之前的結果
    clearResults();

    // 更新 UI 狀態
    isCalculating = true;
    updateUIState(true);

    // 顯示計算中訊息
    updateProgress(0, '主執行緒計算中... (UI 可能會凍結)');

    // 使用 setTimeout 讓 UI 有機會更新
    setTimeout(() => {
        const startTime = performance.now();

        // 在主執行緒執行篩法
        const primes = sieveOfEratosthenesMainThread(start, end);

        const endTime = performance.now();
        const duration = endTime - startTime;

        // 顯示結果
        displayResult(primes, primes.length, duration, 'main');

        isCalculating = false;
        updateUIState(false);
    }, 50);
}

/**
 * 停止計算
 */
function stopCalculation() {
    if (worker && isCalculating) {
        // 發送停止訊息給 Worker
        worker.postMessage({ type: 'STOP' });

        // 終止 Worker 並重新建立
        worker.terminate();
        initializeWorker();

        isCalculating = false;
        updateUIState(false);
        updateProgress(0, '計算已取消');
    }
}

/**
 * 主執行緒版本的埃拉托斯特尼篩法
 * @param {number} start - 起始數字
 * @param {number} end - 結束數字
 * @returns {number[]} 質數陣列
 */
function sieveOfEratosthenesMainThread(start, end) {
    const sieve = new Uint8Array(end + 1);
    sieve.fill(1);

    sieve[0] = 0;
    sieve[1] = 0;

    const sqrtEnd = Math.floor(Math.sqrt(end));

    for (let i = 2; i <= sqrtEnd; i++) {
        if (sieve[i]) {
            for (let j = i * i; j <= end; j += i) {
                sieve[j] = 0;
            }
        }
    }

    const primes = [];
    for (let i = Math.max(2, start); i <= end; i++) {
        if (sieve[i]) {
            primes.push(i);
        }
    }

    return primes;
}

// ===== UI 更新 =====

/**
 * 更新 UI 狀態
 * @param {boolean} calculating - 是否正在計算中
 */
function updateUIState(calculating) {
    elements.workerBtn.disabled = calculating;
    elements.mainThreadBtn.disabled = calculating;
    elements.stopBtn.disabled = !calculating;
    elements.startInput.disabled = calculating;
    elements.endInput.disabled = calculating;

    // 禁用/啟用預設按鈕
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
 * 驗證輸入值
 * @returns {boolean} 輸入是否有效
 */
function validateInputs() {
    const start = parseInt(elements.startInput.value);
    const end = parseInt(elements.endInput.value);

    // 清除錯誤訊息
    hideError();

    // 檢查是否為有效數字
    if (isNaN(start) || isNaN(end)) {
        return false;
    }

    // 檢查範圍
    if (start < 0 || end < 0) {
        showError('數值不能為負數');
        return false;
    }

    if (start > end) {
        showError('起始值不能大於結束值');
        return false;
    }

    if (end > 100000000) {
        showError('結束值不能超過 100,000,000');
        return false;
    }

    return true;
}

/**
 * 顯示計算結果
 * @param {number[]} primes - 質數陣列
 * @param {number} count - 質數數量
 * @param {number} duration - 計算耗時 (毫秒)
 * @param {string} source - 計算來源 ('worker' 或 'main')
 */
function displayResult(primes, count, duration, source) {
    // 更新進度
    updateProgress(100, '計算完成');

    // 顯示統計資訊
    elements.resultStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">找到質數數量：</span>
            <span class="stat-value">${count.toLocaleString()}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">計算耗時：</span>
            <span class="stat-value">${duration.toFixed(2)} ms</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">計算方式：</span>
            <span class="stat-value">${source === 'worker' ? 'Web Worker' : '主執行緒'}</span>
        </div>
    `;

    // 顯示質數列表 (限制顯示數量以避免效能問題)
    const maxDisplay = 1000;
    const displayPrimes = primes.slice(0, maxDisplay);

    if (primes.length > maxDisplay) {
        elements.resultList.innerHTML = `
            <p class="result-note">（僅顯示前 ${maxDisplay.toLocaleString()} 個質數，共 ${count.toLocaleString()} 個）</p>
            <div class="prime-grid">${displayPrimes.map(p => `<span class="prime-number">${p}</span>`).join('')}</div>
        `;
    } else {
        elements.resultList.innerHTML = `
            <div class="prime-grid">${displayPrimes.map(p => `<span class="prime-number">${p}</span>`).join('')}</div>
        `;
    }

    // 顯示結果區域
    elements.resultSection.classList.remove('hidden');

    // 更新效能比較
    updatePerformanceComparison(duration, source);
}

/**
 * 更新效能比較區域
 * @param {number} duration - 計算耗時
 * @param {string} source - 計算來源
 */
function updatePerformanceComparison(duration, source) {
    if (source === 'worker') {
        elements.workerTime.textContent = `${duration.toFixed(2)} ms`;
    } else {
        elements.mainThreadTime.textContent = `${duration.toFixed(2)} ms`;
    }

    // 如果兩者都有數據，計算加速比
    const workerTime = parseFloat(elements.workerTime.textContent);
    const mainTime = parseFloat(elements.mainThreadTime.textContent);

    if (!isNaN(workerTime) && !isNaN(mainTime) && workerTime > 0) {
        const ratio = mainTime / workerTime;
        elements.speedup.textContent = ratio > 1
            ? `Worker 快 ${ratio.toFixed(2)}x (但主執行緒會阻塞 UI)`
            : `效能相近，但 Worker 不阻塞 UI`;
    }

    elements.comparisonSection.classList.remove('hidden');
}

/**
 * 清除結果顯示
 */
function clearResults() {
    elements.resultSection.classList.add('hidden');
    elements.resultStats.innerHTML = '';
    elements.resultList.innerHTML = '';
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
