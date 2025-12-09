/**
 * 最大公因數計算器 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理使用者互動與結果顯示
 * 通訊模式：postMessage
 */

// ===== 全域變數 =====

let worker = null;
let isCalculating = false;

// ===== DOM 元素參考 =====

const elements = {
    // 單對計算
    inputA: null,
    inputB: null,
    calculateSingleBtn: null,
    showStepsBtn: null,

    // 多數計算
    multipleInput: null,
    calculateMultipleBtn: null,

    // 批量計算
    batchInput: null,
    calculateBatchBtn: null,

    // 隨機測試
    randomCount: null,
    randomMax: null,
    randomBtn: null,

    // 通用
    stopBtn: null,
    progressBar: null,
    progressText: null,
    errorMessage: null,

    // 結果區域
    singleResult: null,
    stepsResult: null,
    multipleResult: null,
    batchResult: null,
    randomResult: null
};

// ===== 初始化 =====

document.addEventListener('DOMContentLoaded', function() {
    initializeElements();
    setupEventListeners();
    initializeWorker();
    updateUIState(false);
});

function initializeElements() {
    // 單對計算
    elements.inputA = document.getElementById('input-a');
    elements.inputB = document.getElementById('input-b');
    elements.calculateSingleBtn = document.getElementById('calculate-single-btn');
    elements.showStepsBtn = document.getElementById('show-steps-btn');

    // 多數計算
    elements.multipleInput = document.getElementById('multiple-input');
    elements.calculateMultipleBtn = document.getElementById('calculate-multiple-btn');

    // 批量計算
    elements.batchInput = document.getElementById('batch-input');
    elements.calculateBatchBtn = document.getElementById('calculate-batch-btn');

    // 隨機測試
    elements.randomCount = document.getElementById('random-count');
    elements.randomMax = document.getElementById('random-max');
    elements.randomBtn = document.getElementById('random-btn');

    // 通用
    elements.stopBtn = document.getElementById('stop-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.errorMessage = document.getElementById('error-message');

    // 結果區域
    elements.singleResult = document.getElementById('single-result');
    elements.stepsResult = document.getElementById('steps-result');
    elements.multipleResult = document.getElementById('multiple-result');
    elements.batchResult = document.getElementById('batch-result');
    elements.randomResult = document.getElementById('random-result');
}

function setupEventListeners() {
    elements.calculateSingleBtn.addEventListener('click', calculateSingle);
    elements.showStepsBtn.addEventListener('click', calculateWithSteps);
    elements.calculateMultipleBtn.addEventListener('click', calculateMultiple);
    elements.calculateBatchBtn.addEventListener('click', calculateBatch);
    elements.randomBtn.addEventListener('click', calculateRandom);
    elements.stopBtn.addEventListener('click', stopCalculation);

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const a = this.dataset.a;
            const b = this.dataset.b;
            elements.inputA.value = a;
            elements.inputB.value = b;
        });
    });
}

function initializeWorker() {
    if (typeof Worker === 'undefined') {
        showError('您的瀏覽器不支援 Web Workers');
        return;
    }

    worker = new Worker('worker.js');
    worker.onmessage = handleWorkerMessage;
    worker.onerror = handleWorkerError;
}

// ===== Worker 通訊 =====

function handleWorkerMessage(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'PROGRESS':
            updateProgress(payload.percent, payload.message);
            break;

        case 'SINGLE_RESULT':
            displaySingleResult(payload);
            finishCalculation();
            break;

        case 'STEPS_RESULT':
            displayStepsResult(payload);
            finishCalculation();
            break;

        case 'MULTIPLE_RESULT':
            displayMultipleResult(payload);
            finishCalculation();
            break;

        case 'BATCH_RESULT':
            displayBatchResult(payload);
            finishCalculation();
            break;

        case 'RANDOM_RESULT':
            displayRandomResult(payload);
            finishCalculation();
            break;

        case 'ERROR':
            showError(payload.message);
            finishCalculation();
            break;
    }
}

function handleWorkerError(error) {
    showError(`Worker 錯誤: ${error.message}`);
    finishCalculation();
    worker.terminate();
    initializeWorker();
}

// ===== 計算控制 =====

function calculateSingle() {
    const a = elements.inputA.value.trim();
    const b = elements.inputB.value.trim();

    if (!a || !b) {
        showError('請輸入兩個數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CALCULATE_SINGLE',
        payload: { a, b }
    });
}

function calculateWithSteps() {
    const a = elements.inputA.value.trim();
    const b = elements.inputB.value.trim();

    if (!a || !b) {
        showError('請輸入兩個數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CALCULATE_WITH_STEPS',
        payload: { a, b }
    });
}

function calculateMultiple() {
    const input = elements.multipleInput.value.trim();

    if (!input) {
        showError('請輸入數字 (以逗號、空格或換行分隔)');
        return;
    }

    // 解析輸入
    const numbers = input.split(/[,\s\n]+/).filter(n => n.length > 0);

    if (numbers.length < 2) {
        showError('請輸入至少 2 個數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CALCULATE_MULTIPLE',
        payload: { numbers }
    });
}

function calculateBatch() {
    const input = elements.batchInput.value.trim();

    if (!input) {
        showError('請輸入數對 (每行一對，以逗號或空格分隔)');
        return;
    }

    // 解析輸入
    const lines = input.split('\n').filter(line => line.trim().length > 0);
    const pairs = [];

    for (const line of lines) {
        const parts = line.trim().split(/[,\s]+/).filter(p => p.length > 0);
        if (parts.length >= 2) {
            pairs.push({ a: parts[0], b: parts[1] });
        }
    }

    if (pairs.length === 0) {
        showError('無法解析數對，請檢查輸入格式');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CALCULATE_BATCH',
        payload: { pairs }
    });
}

function calculateRandom() {
    const count = parseInt(elements.randomCount.value);
    const maxValue = parseInt(elements.randomMax.value);

    if (isNaN(count) || count < 1 || count > 100000) {
        showError('數量必須在 1 到 100,000 之間');
        return;
    }

    if (isNaN(maxValue) || maxValue < 1) {
        showError('最大值必須大於 0');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'GENERATE_RANDOM',
        payload: { count, maxValue }
    });
}

function stopCalculation() {
    if (worker && isCalculating) {
        worker.postMessage({ type: 'STOP' });
        worker.terminate();
        initializeWorker();
        finishCalculation();
        updateProgress(0, '計算已取消');
    }
}

function startCalculation() {
    isCalculating = true;
    updateUIState(true);
    hideError();
}

function finishCalculation() {
    isCalculating = false;
    updateUIState(false);
}

// ===== UI 更新 =====

function updateUIState(calculating) {
    const buttons = [
        elements.calculateSingleBtn,
        elements.showStepsBtn,
        elements.calculateMultipleBtn,
        elements.calculateBatchBtn,
        elements.randomBtn
    ];

    buttons.forEach(btn => {
        if (btn) btn.disabled = calculating;
    });

    elements.stopBtn.disabled = !calculating;

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.disabled = calculating;
    });
}

function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

function hideAllResults() {
    elements.singleResult.classList.add('hidden');
    elements.stepsResult.classList.add('hidden');
    elements.multipleResult.classList.add('hidden');
    elements.batchResult.classList.add('hidden');
    elements.randomResult.classList.add('hidden');
}

function displaySingleResult(result) {
    updateProgress(100, '計算完成');

    elements.singleResult.innerHTML = `
        <div class="result-box">
            <div class="result-equation">
                GCD(${formatNumber(result.a)}, ${formatNumber(result.b)}) = <span class="result-value">${formatNumber(result.gcd)}</span>
            </div>
            <div class="result-stats">
                <span>計算耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.singleResult.classList.remove('hidden');
}

function displayStepsResult(result) {
    updateProgress(100, '計算完成');

    const stepsHtml = result.steps.map(step => `
        <tr>
            <td>${step.step}</td>
            <td class="equation">${step.equation}</td>
        </tr>
    `).join('');

    elements.stepsResult.innerHTML = `
        <div class="result-box">
            <div class="result-equation">
                GCD(${formatNumber(result.a)}, ${formatNumber(result.b)}) = <span class="result-value">${formatNumber(result.gcd)}</span>
            </div>
            <div class="steps-table-container">
                <table class="steps-table">
                    <thead>
                        <tr>
                            <th>步驟</th>
                            <th>輾轉相除</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${stepsHtml}
                    </tbody>
                </table>
            </div>
            <div class="result-stats">
                <span>總步驟數：${result.stepCount}</span>
                <span>計算耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.stepsResult.classList.remove('hidden');
}

function displayMultipleResult(result) {
    updateProgress(100, '計算完成');

    const numbersDisplay = result.numbers.length > 10
        ? result.numbers.slice(0, 10).map(n => formatNumber(n)).join(', ') + ', ...'
        : result.numbers.map(n => formatNumber(n)).join(', ');

    elements.multipleResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">輸入的 ${result.count} 個數字：</div>
            <div class="numbers-list">${numbersDisplay}</div>
            <div class="result-equation">
                GCD = <span class="result-value">${formatNumber(result.gcd)}</span>
            </div>
            <div class="result-stats">
                <span>數字數量：${result.count}</span>
                <span>計算耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.multipleResult.classList.remove('hidden');
}

function displayBatchResult(result) {
    updateProgress(100, '批量計算完成');

    const displayCount = Math.min(result.results.length, 100);
    const resultsHtml = result.results.slice(0, displayCount).map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${formatNumber(r.a)}</td>
            <td>${formatNumber(r.b)}</td>
            <td class="gcd-value">${r.error ? r.error : formatNumber(r.gcd)}</td>
        </tr>
    `).join('');

    elements.batchResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">批量計算結果 (顯示前 ${displayCount} 筆，共 ${result.count} 筆)</div>
            <div class="batch-table-container">
                <table class="batch-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>數字 A</th>
                            <th>數字 B</th>
                            <th>GCD</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resultsHtml}
                    </tbody>
                </table>
            </div>
            <div class="result-stats">
                <span>總數對：${result.count}</span>
                <span>總耗時：${result.duration.toFixed(2)} ms</span>
                <span>平均耗時：${result.avgTime.toFixed(4)} ms/對</span>
            </div>
        </div>
    `;

    elements.batchResult.classList.remove('hidden');
}

function displayRandomResult(result) {
    updateProgress(100, '隨機測試完成');

    const displayCount = Math.min(result.results.length, 50);
    const resultsHtml = result.results.slice(0, displayCount).map((r, i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${formatNumber(r.a)}</td>
            <td>${formatNumber(r.b)}</td>
            <td class="gcd-value">${formatNumber(r.gcd)}</td>
        </tr>
    `).join('');

    elements.randomResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">隨機測試結果 (顯示前 ${displayCount} 筆，共 ${result.totalCount} 筆)</div>
            <div class="batch-table-container">
                <table class="batch-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>數字 A</th>
                            <th>數字 B</th>
                            <th>GCD</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${resultsHtml}
                    </tbody>
                </table>
            </div>
            <div class="statistics-box">
                <h4>統計資訊</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">互質數對 (GCD=1)</span>
                        <span class="stat-value">${result.statistics.coprimeCount.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">互質比例</span>
                        <span class="stat-value">${result.statistics.coprimeProbability}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">理論值 (6/π²)</span>
                        <span class="stat-value">${result.statistics.theoreticalProbability}%</span>
                    </div>
                </div>
                <p class="stat-note">
                    根據數論，兩個隨機正整數互質的機率趨近於 6/π² ≈ 60.79%
                </p>
            </div>
            <div class="result-stats">
                <span>總數對：${result.totalCount.toLocaleString()}</span>
                <span>總耗時：${result.duration.toFixed(2)} ms</span>
                <span>平均耗時：${result.avgTime.toFixed(4)} ms/對</span>
            </div>
        </div>
    `;

    elements.randomResult.classList.remove('hidden');
}

// ===== 工具函數 =====

function formatNumber(num) {
    const str = String(num);
    if (str.length > 15) {
        return str.substring(0, 6) + '...' + str.substring(str.length - 6);
    }
    return Number(num).toLocaleString();
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
