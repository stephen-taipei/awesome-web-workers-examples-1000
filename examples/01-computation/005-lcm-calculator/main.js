/**
 * 最小公倍數計算器 - 主執行緒腳本
 *
 * 功能：管理 Web Worker 生命週期，處理使用者互動與結果顯示
 */

// ===== 全域變數 =====

let worker = null;
let isCalculating = false;

// ===== DOM 元素參考 =====

const elements = {};

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
    elements.showRelationBtn = document.getElementById('show-relation-btn');

    // 多數計算
    elements.multipleInput = document.getElementById('multiple-input');
    elements.calculateMultipleBtn = document.getElementById('calculate-multiple-btn');

    // 批量計算
    elements.batchInput = document.getElementById('batch-input');
    elements.calculateBatchBtn = document.getElementById('calculate-batch-btn');

    // 公倍數列表
    elements.limitInput = document.getElementById('limit-input');
    elements.findMultiplesBtn = document.getElementById('find-multiples-btn');

    // 通用
    elements.stopBtn = document.getElementById('stop-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.errorMessage = document.getElementById('error-message');

    // 結果區域
    elements.singleResult = document.getElementById('single-result');
    elements.relationResult = document.getElementById('relation-result');
    elements.multipleResult = document.getElementById('multiple-result');
    elements.batchResult = document.getElementById('batch-result');
    elements.multiplesResult = document.getElementById('multiples-result');
}

function setupEventListeners() {
    elements.calculateSingleBtn.addEventListener('click', calculateSingle);
    elements.showRelationBtn.addEventListener('click', showRelation);
    elements.calculateMultipleBtn.addEventListener('click', calculateMultiple);
    elements.calculateBatchBtn.addEventListener('click', calculateBatch);
    elements.findMultiplesBtn.addEventListener('click', findMultiples);
    elements.stopBtn.addEventListener('click', stopCalculation);

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            elements.inputA.value = this.dataset.a;
            elements.inputB.value = this.dataset.b;
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
        case 'GCD_LCM_RESULT':
            displayRelationResult(payload);
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
        case 'COMMON_MULTIPLES_RESULT':
            displayMultiplesResult(payload);
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

function showRelation() {
    const a = elements.inputA.value.trim();
    const b = elements.inputB.value.trim();

    if (!a || !b) {
        showError('請輸入兩個數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CALCULATE_GCD_LCM',
        payload: { a, b }
    });
}

function calculateMultiple() {
    const input = elements.multipleInput.value.trim();

    if (!input) {
        showError('請輸入數字');
        return;
    }

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
        showError('請輸入數對');
        return;
    }

    const lines = input.split('\n').filter(line => line.trim().length > 0);
    const pairs = [];

    for (const line of lines) {
        const parts = line.trim().split(/[,\s]+/).filter(p => p.length > 0);
        if (parts.length >= 2) {
            pairs.push({ a: parts[0], b: parts[1] });
        }
    }

    if (pairs.length === 0) {
        showError('無法解析數對');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CALCULATE_BATCH',
        payload: { pairs }
    });
}

function findMultiples() {
    const a = elements.inputA.value.trim();
    const b = elements.inputB.value.trim();
    const limit = elements.limitInput.value.trim() || '1000';

    if (!a || !b) {
        showError('請先輸入兩個數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'FIND_COMMON_MULTIPLES',
        payload: { a, b, limit }
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
        elements.showRelationBtn,
        elements.calculateMultipleBtn,
        elements.calculateBatchBtn,
        elements.findMultiplesBtn
    ];

    buttons.forEach(btn => { if (btn) btn.disabled = calculating; });
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
    ['singleResult', 'relationResult', 'multipleResult', 'batchResult', 'multiplesResult'].forEach(key => {
        elements[key].classList.add('hidden');
    });
}

function displaySingleResult(result) {
    updateProgress(100, '計算完成');

    elements.singleResult.innerHTML = `
        <div class="result-box">
            <div class="result-equation">
                LCM(${formatNumber(result.a)}, ${formatNumber(result.b)}) =
                <span class="result-value">${formatNumber(result.lcm)}</span>
            </div>
            <div class="result-details">
                <div class="detail-item">
                    <span class="detail-label">GCD:</span>
                    <span class="detail-value">${formatNumber(result.gcd)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">LCM 位數:</span>
                    <span class="detail-value">${result.lcmDigits || result.lcm.length} 位</span>
                </div>
            </div>
            <div class="result-stats">
                <span>計算耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.singleResult.classList.remove('hidden');
}

function displayRelationResult(result) {
    updateProgress(100, '計算完成');

    elements.relationResult.innerHTML = `
        <div class="result-box">
            <h4>GCD 與 LCM 的關係</h4>
            <div class="relation-display">
                <div class="relation-item">
                    <span class="label">a =</span>
                    <span class="value">${formatNumber(result.a)}</span>
                </div>
                <div class="relation-item">
                    <span class="label">b =</span>
                    <span class="value">${formatNumber(result.b)}</span>
                </div>
                <div class="relation-item highlight">
                    <span class="label">GCD(a, b) =</span>
                    <span class="value">${formatNumber(result.gcd)}</span>
                </div>
                <div class="relation-item highlight">
                    <span class="label">LCM(a, b) =</span>
                    <span class="value">${formatNumber(result.lcm)}</span>
                </div>
            </div>
            <div class="formula-verification">
                <h5>驗證公式：GCD × LCM = a × b</h5>
                <div class="verification-steps">
                    <p>GCD × LCM = ${formatNumber(result.gcd)} × ${formatNumber(result.lcm)}</p>
                    <p>= ${formatNumber(result.gcdTimesLcm)}</p>
                    <p>a × b = ${formatNumber(result.a)} × ${formatNumber(result.b)}</p>
                    <p>= ${formatNumber(result.product)}</p>
                    <p class="verification-result ${result.verification ? 'success' : 'error'}">
                        ${result.verification ? '✓ 驗證成功！' : '✗ 驗證失敗'}
                    </p>
                </div>
            </div>
            <div class="result-stats">
                <span>計算耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.relationResult.classList.remove('hidden');
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
                LCM = <span class="result-value">${formatNumber(result.lcm)}</span>
            </div>
            <div class="result-details">
                <div class="detail-item">
                    <span class="detail-label">LCM 位數:</span>
                    <span class="detail-value">${result.lcmDigits || result.lcm.length} 位</span>
                </div>
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
            <td>${r.error ? '-' : formatNumber(r.gcd)}</td>
            <td class="lcm-value">${r.error ? r.error : formatNumber(r.lcm)}</td>
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
                            <th>A</th>
                            <th>B</th>
                            <th>GCD</th>
                            <th>LCM</th>
                        </tr>
                    </thead>
                    <tbody>${resultsHtml}</tbody>
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

function displayMultiplesResult(result) {
    updateProgress(100, '計算完成');

    const multiplesHtml = result.multiples.map(m =>
        `<span class="multiple-item">${formatNumber(m)}</span>`
    ).join('');

    elements.multiplesResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">
                ${result.a} 和 ${result.b} 在 ${formatNumber(result.limit)} 以內的公倍數
            </div>
            <div class="result-equation">
                LCM(${result.a}, ${result.b}) = <span class="result-value">${formatNumber(result.lcm)}</span>
            </div>
            <div class="multiples-grid">${multiplesHtml}</div>
            <div class="result-stats">
                <span>找到 ${result.count} 個公倍數</span>
                <span>計算耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.multiplesResult.classList.remove('hidden');
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
