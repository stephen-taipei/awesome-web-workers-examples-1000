/**
 * 質因數分解器 - 主執行緒腳本
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
    // 單數分解
    elements.singleInput = document.getElementById('single-input');
    elements.factorizeSingleBtn = document.getElementById('factorize-single-btn');
    elements.findDivisorsBtn = document.getElementById('find-divisors-btn');
    elements.checkPrimeBtn = document.getElementById('check-prime-btn');

    // 批量分解
    elements.batchInput = document.getElementById('batch-input');
    elements.factorizeBatchBtn = document.getElementById('factorize-batch-btn');

    // 範圍分解
    elements.rangeStart = document.getElementById('range-start');
    elements.rangeEnd = document.getElementById('range-end');
    elements.factorizeRangeBtn = document.getElementById('factorize-range-btn');

    // 通用
    elements.stopBtn = document.getElementById('stop-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.errorMessage = document.getElementById('error-message');

    // 結果區域
    elements.singleResult = document.getElementById('single-result');
    elements.divisorsResult = document.getElementById('divisors-result');
    elements.primeResult = document.getElementById('prime-result');
    elements.batchResult = document.getElementById('batch-result');
    elements.rangeResult = document.getElementById('range-result');
}

function setupEventListeners() {
    elements.factorizeSingleBtn.addEventListener('click', factorizeSingle);
    elements.findDivisorsBtn.addEventListener('click', findDivisors);
    elements.checkPrimeBtn.addEventListener('click', checkPrime);
    elements.factorizeBatchBtn.addEventListener('click', factorizeBatch);
    elements.factorizeRangeBtn.addEventListener('click', factorizeRange);
    elements.stopBtn.addEventListener('click', stopCalculation);

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            elements.singleInput.value = this.dataset.value;
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
        case 'DIVISORS_RESULT':
            displayDivisorsResult(payload);
            finishCalculation();
            break;
        case 'PRIME_RESULT':
            displayPrimeResult(payload);
            finishCalculation();
            break;
        case 'BATCH_RESULT':
            displayBatchResult(payload);
            finishCalculation();
            break;
        case 'RANGE_RESULT':
            displayRangeResult(payload);
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

function factorizeSingle() {
    const number = elements.singleInput.value.trim();

    if (!number) {
        showError('請輸入數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'FACTORIZE_SINGLE',
        payload: { number }
    });
}

function findDivisors() {
    const number = elements.singleInput.value.trim();

    if (!number) {
        showError('請輸入數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'FIND_DIVISORS',
        payload: { number }
    });
}

function checkPrime() {
    const number = elements.singleInput.value.trim();

    if (!number) {
        showError('請輸入數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CHECK_PRIME',
        payload: { number }
    });
}

function factorizeBatch() {
    const input = elements.batchInput.value.trim();

    if (!input) {
        showError('請輸入數字');
        return;
    }

    const numbers = input.split(/[,\s\n]+/).filter(n => n.length > 0);

    if (numbers.length === 0) {
        showError('無法解析數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'FACTORIZE_BATCH',
        payload: { numbers }
    });
}

function factorizeRange() {
    const start = elements.rangeStart.value.trim();
    const end = elements.rangeEnd.value.trim();

    if (!start || !end) {
        showError('請輸入起始和結束值');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'FACTORIZE_RANGE',
        payload: { start, end }
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
        elements.factorizeSingleBtn,
        elements.findDivisorsBtn,
        elements.checkPrimeBtn,
        elements.factorizeBatchBtn,
        elements.factorizeRangeBtn
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
    ['singleResult', 'divisorsResult', 'primeResult', 'batchResult', 'rangeResult'].forEach(key => {
        if (elements[key]) elements[key].classList.add('hidden');
    });
}

function displaySingleResult(result) {
    updateProgress(100, '分解完成');

    let factorsHtml = '';
    if (result.isOne) {
        factorsHtml = '<div class="factor-display"><span class="factor-one">1 不可分解</span></div>';
    } else if (result.isPrime) {
        factorsHtml = `
            <div class="factor-display">
                <span class="prime-badge">質數</span>
                <span class="factor-value">${formatNumber(result.original)}</span>
            </div>
        `;
    } else {
        const factorItems = result.factors.map(f => `
            <span class="factor-item">
                <span class="factor-base">${formatNumber(f.prime)}</span>
                ${f.count > 1 ? `<sup class="factor-exp">${f.count}</sup>` : ''}
            </span>
        `).join('<span class="factor-times">×</span>');

        factorsHtml = `<div class="factor-display">${factorItems}</div>`;
    }

    elements.singleResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">
                <span class="original-number">${formatNumber(result.original)}</span>
                ${result.isPrime ? '<span class="prime-tag">質數</span>' : ''}
            </div>
            ${factorsHtml}
            <div class="result-equation">
                ${result.factorization}
            </div>
            <div class="result-details">
                <div class="detail-item">
                    <span class="detail-label">因數個數</span>
                    <span class="detail-value">${formatNumber(result.divisorCount)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">因數和</span>
                    <span class="detail-value">${formatNumber(result.divisorSum)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">質因數種類</span>
                    <span class="detail-value">${result.factors.length}</span>
                </div>
            </div>
            <div class="result-stats">
                <span>計算耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.singleResult.classList.remove('hidden');
}

function displayDivisorsResult(result) {
    updateProgress(100, '計算完成');

    const divisorsHtml = result.divisors.map(d =>
        `<span class="divisor-item">${formatNumber(d)}</span>`
    ).join('');

    elements.divisorsResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">
                <span class="original-number">${formatNumber(result.original)}</span> 的因數
                ${result.isPerfect ? '<span class="perfect-tag">完美數</span>' : ''}
            </div>
            <div class="divisors-grid">
                ${divisorsHtml}
            </div>
            ${result.truncated ? '<p class="truncate-notice">※ 僅顯示前 1000 個因數</p>' : ''}
            <div class="result-details">
                <div class="detail-item">
                    <span class="detail-label">因數個數</span>
                    <span class="detail-value">${formatNumber(result.count)}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">因數和</span>
                    <span class="detail-value">${formatNumber(result.sum)}</span>
                </div>
            </div>
            <div class="result-stats">
                <span>計算耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.divisorsResult.classList.remove('hidden');
}

function displayPrimeResult(result) {
    updateProgress(100, '檢測完成');

    let content = '';
    if (result.isPrime) {
        content = `
            <div class="prime-check-result is-prime">
                <div class="check-icon">✓</div>
                <div class="check-text">
                    <span class="number">${formatNumber(result.number)}</span>
                    <span class="status">是質數</span>
                </div>
            </div>
        `;
    } else {
        content = `
            <div class="prime-check-result not-prime">
                <div class="check-icon">✗</div>
                <div class="check-text">
                    <span class="number">${formatNumber(result.number)}</span>
                    <span class="status">${result.reason || '不是質數'}</span>
                </div>
            </div>
        `;

        if (result.nearestPrimes) {
            content += `
                <div class="nearest-primes">
                    <h4>最近的質數</h4>
                    <div class="nearest-grid">
                        ${result.nearestPrimes.prev ? `
                            <div class="nearest-item">
                                <span class="label">前一個</span>
                                <span class="value">${formatNumber(result.nearestPrimes.prev)}</span>
                            </div>
                        ` : ''}
                        ${result.nearestPrimes.next ? `
                            <div class="nearest-item">
                                <span class="label">下一個</span>
                                <span class="value">${formatNumber(result.nearestPrimes.next)}</span>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
    }

    elements.primeResult.innerHTML = `
        <div class="result-box">
            ${content}
            <div class="result-stats">
                <span>檢測耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.primeResult.classList.remove('hidden');
}

function displayBatchResult(result) {
    updateProgress(100, '批量分解完成');

    const displayCount = Math.min(result.results.length, 100);
    const resultsHtml = result.results.slice(0, displayCount).map((r, i) => `
        <tr class="${r.isPrime ? 'is-prime' : ''}">
            <td>${i + 1}</td>
            <td>${formatNumber(r.original)}</td>
            <td class="factorization">${r.error ? `<span class="error">${r.error}</span>` : r.factorization}</td>
            <td>${r.isPrime ? '<span class="prime-badge-sm">質數</span>' : (r.factorCount || '-')}</td>
        </tr>
    `).join('');

    elements.batchResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">批量分解結果 (顯示前 ${displayCount} 筆，共 ${result.count} 筆)</div>
            <div class="batch-table-container">
                <table class="batch-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>數字</th>
                            <th>質因數分解</th>
                            <th>質因數種類</th>
                        </tr>
                    </thead>
                    <tbody>${resultsHtml}</tbody>
                </table>
            </div>
            <div class="batch-stats">
                <div class="stat-item">
                    <span class="stat-label">總數量</span>
                    <span class="stat-value">${result.count}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">質數數量</span>
                    <span class="stat-value">${result.primeCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">質數比例</span>
                    <span class="stat-value">${((result.primeCount / result.count) * 100).toFixed(2)}%</span>
                </div>
            </div>
            <div class="result-stats">
                <span>總耗時：${result.duration.toFixed(2)} ms</span>
                <span>平均耗時：${result.avgTime.toFixed(4)} ms/個</span>
            </div>
        </div>
    `;

    elements.batchResult.classList.remove('hidden');
}

function displayRangeResult(result) {
    updateProgress(100, '範圍分解完成');

    const displayCount = Math.min(result.results.length, 200);
    const resultsHtml = result.results.slice(0, displayCount).map(r => `
        <tr class="${r.isPrime ? 'is-prime' : ''}">
            <td>${formatNumber(r.number)}</td>
            <td class="factorization">${r.factorization}</td>
            <td>${r.isPrime ? '<span class="prime-badge-sm">質數</span>' : ''}</td>
        </tr>
    `).join('');

    elements.rangeResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">
                範圍 ${formatNumber(result.start)} ~ ${formatNumber(result.end)} 的質因數分解
                (顯示前 ${displayCount} 筆，共 ${result.count} 筆)
            </div>
            <div class="batch-table-container">
                <table class="batch-table">
                    <thead>
                        <tr>
                            <th>數字</th>
                            <th>質因數分解</th>
                            <th>類型</th>
                        </tr>
                    </thead>
                    <tbody>${resultsHtml}</tbody>
                </table>
            </div>
            <div class="batch-stats">
                <div class="stat-item">
                    <span class="stat-label">範圍內數字</span>
                    <span class="stat-value">${result.count}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">質數數量</span>
                    <span class="stat-value">${result.primeCount}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">質數密度</span>
                    <span class="stat-value">${((result.primeCount / result.count) * 100).toFixed(2)}%</span>
                </div>
            </div>
            <div class="result-stats">
                <span>總耗時：${result.duration.toFixed(2)} ms</span>
            </div>
        </div>
    `;

    elements.rangeResult.classList.remove('hidden');
}

// ===== 工具函數 =====

function formatNumber(num) {
    const str = String(num);
    if (str.length > 20) {
        return str.substring(0, 8) + '...' + str.substring(str.length - 8);
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
