/**
 * 梅森質數搜尋器 - 主執行緒腳本
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
    // 單一測試
    elements.singleExponent = document.getElementById('single-exponent');
    elements.testSingleBtn = document.getElementById('test-single-btn');
    elements.verifyBtn = document.getElementById('verify-btn');
    elements.calculateBtn = document.getElementById('calculate-btn');

    // 範圍搜尋
    elements.rangeStart = document.getElementById('range-start');
    elements.rangeEnd = document.getElementById('range-end');
    elements.searchRangeBtn = document.getElementById('search-range-btn');

    // 已知列表
    elements.knownLimit = document.getElementById('known-limit');
    elements.listKnownBtn = document.getElementById('list-known-btn');

    // 通用
    elements.stopBtn = document.getElementById('stop-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.errorMessage = document.getElementById('error-message');

    // 結果區域
    elements.singleResult = document.getElementById('single-result');
    elements.verifyResult = document.getElementById('verify-result');
    elements.calculateResult = document.getElementById('calculate-result');
    elements.searchResult = document.getElementById('search-result');
    elements.knownResult = document.getElementById('known-result');
}

function setupEventListeners() {
    elements.testSingleBtn.addEventListener('click', testSingle);
    elements.verifyBtn.addEventListener('click', verifyMersenne);
    elements.calculateBtn.addEventListener('click', calculateMersenne);
    elements.searchRangeBtn.addEventListener('click', searchRange);
    elements.listKnownBtn.addEventListener('click', listKnown);
    elements.stopBtn.addEventListener('click', stopCalculation);

    // 快速設定按鈕
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            elements.singleExponent.value = this.dataset.value;
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
        case 'VERIFY_RESULT':
            displayVerifyResult(payload);
            finishCalculation();
            break;
        case 'CALCULATE_RESULT':
            displayCalculateResult(payload);
            finishCalculation();
            break;
        case 'SEARCH_RESULT':
            displaySearchResult(payload);
            finishCalculation();
            break;
        case 'KNOWN_RESULT':
            displayKnownResult(payload);
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

function testSingle() {
    const exponent = elements.singleExponent.value.trim();

    if (!exponent) {
        showError('請輸入指數');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'TEST_SINGLE',
        payload: { exponent }
    });
}

function verifyMersenne() {
    const exponent = elements.singleExponent.value.trim();

    if (!exponent) {
        showError('請輸入指數');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'VERIFY_MERSENNE',
        payload: { exponent }
    });
}

function calculateMersenne() {
    const exponent = elements.singleExponent.value.trim();

    if (!exponent) {
        showError('請輸入指數');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CALCULATE_MERSENNE',
        payload: { exponent }
    });
}

function searchRange() {
    const start = elements.rangeStart.value.trim();
    const end = elements.rangeEnd.value.trim();

    if (!start || !end) {
        showError('請輸入起始和結束指數');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'SEARCH_RANGE',
        payload: { start, end }
    });
}

function listKnown() {
    const limit = parseInt(elements.knownLimit.value) || 20;

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'LIST_KNOWN',
        payload: { limit }
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
        elements.testSingleBtn,
        elements.verifyBtn,
        elements.calculateBtn,
        elements.searchRangeBtn,
        elements.listKnownBtn
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
    ['singleResult', 'verifyResult', 'calculateResult', 'searchResult', 'knownResult'].forEach(key => {
        if (elements[key]) elements[key].classList.add('hidden');
    });
}

function displaySingleResult(result) {
    updateProgress(100, '測試完成');

    let statusHtml;
    if (result.isPrime) {
        statusHtml = `
            <div class="prime-status is-prime">
                <span class="status-icon">✓</span>
                <span class="status-text">M<sub>${result.exponent}</sub> 是梅森質數！</span>
                ${result.rank ? `<span class="rank-badge">第 ${result.rank} 個</span>` : ''}
            </div>
        `;
    } else {
        statusHtml = `
            <div class="prime-status not-prime">
                <span class="status-icon">✗</span>
                <span class="status-text">M<sub>${result.exponent}</sub> 不是梅森質數</span>
            </div>
            ${result.reason ? `<p class="reason">${result.reason}</p>` : ''}
        `;
    }

    elements.singleResult.innerHTML = `
        <div class="result-box">
            ${statusHtml}
            <div class="mersenne-display">
                <span class="formula">M<sub>${result.exponent}</sub> = 2<sup>${result.exponent}</sup> - 1</span>
            </div>
            <div class="mersenne-value">${result.mersenne}</div>
            <div class="result-details">
                <div class="detail-item">
                    <span class="label">位數</span>
                    <span class="value">${formatNumber(result.digits)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">指數</span>
                    <span class="value">${result.exponent}</span>
                </div>
            </div>
            <div class="result-stats">
                <span>耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.singleResult.classList.remove('hidden');
}

function displayVerifyResult(result) {
    updateProgress(100, '驗證完成');

    const testsHtml = result.preliminaryTests.map(test => `
        <div class="test-item ${test.passed ? 'passed' : 'failed'}">
            <span class="test-icon">${test.passed ? '✓' : '✗'}</span>
            <span class="test-name">${test.name}</span>
            <span class="test-desc">${test.description}</span>
        </div>
    `).join('');

    let factorHtml = '';
    if (result.factorInfo) {
        factorHtml = `
            <div class="factor-info">
                <h4>找到因數</h4>
                <p>M<sub>${result.exponent}</sub> = ${result.factorInfo.factor} × ${result.factorInfo.cofactor}</p>
                <p class="factor-note">因數形式：2 × ${result.factorInfo.k} × ${result.exponent} + 1</p>
            </div>
        `;
    }

    let llResultHtml = '';
    if (result.lucasLehmerResult !== null) {
        llResultHtml = `
            <div class="ll-result ${result.lucasLehmerResult ? 'passed' : 'failed'}">
                <span class="ll-icon">${result.lucasLehmerResult ? '✓' : '✗'}</span>
                <span class="ll-text">Lucas-Lehmer 測試：${result.lucasLehmerResult ? '通過 (是質數)' : '未通過 (是合數)'}</span>
            </div>
        `;
    }

    elements.verifyResult.innerHTML = `
        <div class="result-box">
            <div class="verify-header">
                <span class="formula">M<sub>${result.exponent}</sub> = 2<sup>${result.exponent}</sup> - 1</span>
            </div>
            <div class="mersenne-preview">${result.mersenne}</div>
            <div class="verify-details">
                <div class="detail-item">
                    <span class="label">位數</span>
                    <span class="value">${formatNumber(result.digits)}</span>
                </div>
                <div class="detail-item">
                    <span class="label">指數是否為質數</span>
                    <span class="value ${result.exponentIsPrime ? 'yes' : 'no'}">${result.exponentIsPrime ? '是' : '否'}</span>
                </div>
                <div class="detail-item">
                    <span class="label">是否已知梅森質數</span>
                    <span class="value ${result.isKnownMersennePrime ? 'yes' : 'no'}">${result.isKnownMersennePrime ? '是' : '否'}</span>
                </div>
            </div>
            <div class="tests-section">
                <h4>測試結果</h4>
                ${testsHtml}
            </div>
            ${llResultHtml}
            ${factorHtml}
            <div class="result-stats">
                <span>耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.verifyResult.classList.remove('hidden');
}

function displayCalculateResult(result) {
    updateProgress(100, '計算完成');

    elements.calculateResult.innerHTML = `
        <div class="result-box">
            <div class="calculate-header">
                <span class="formula">M<sub>${result.exponent}</sub> = 2<sup>${result.exponent}</sup> - 1</span>
            </div>
            <div class="calculate-details">
                <div class="detail-row">
                    <span class="label">十進制位數：</span>
                    <span class="value">${formatNumber(result.digits)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">二進制位數：</span>
                    <span class="value">${formatNumber(result.binaryLength)} (全為 1)</span>
                </div>
                <div class="detail-row">
                    <span class="label">十六進制位數：</span>
                    <span class="value">${formatNumber(result.hexLength)}</span>
                </div>
            </div>
            <div class="value-section">
                <h4>十進制值</h4>
                <div class="mersenne-full">${result.mersenne}</div>
                ${result.fullMersenne ? `
                    <button class="copy-btn" onclick="copyToClipboard('${result.fullMersenne}')">複製完整數值</button>
                ` : '<p class="too-large">數值過大，無法顯示完整內容</p>'}
            </div>
            <div class="value-section">
                <h4>十六進制值</h4>
                <div class="hex-value">${result.hexPreview}</div>
            </div>
            <div class="result-stats">
                <span>耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.calculateResult.classList.remove('hidden');
}

function displaySearchResult(result) {
    updateProgress(100, '搜尋完成');

    let resultsHtml = '';
    if (result.results.length > 0) {
        resultsHtml = result.results.map(r => `
            <tr>
                <td>${r.rank || '-'}</td>
                <td class="exponent">M<sub>${r.exponent}</sub></td>
                <td>${r.exponent}</td>
                <td>${formatNumber(r.digits)}</td>
                <td>${r.isKnown ? '<span class="known-badge">已知</span>' : '<span class="new-badge">?</span>'}</td>
            </tr>
        `).join('');
    } else {
        resultsHtml = '<tr><td colspan="5" class="no-results">此範圍內沒有找到梅森質數</td></tr>';
    }

    elements.searchResult.innerHTML = `
        <div class="result-box">
            <div class="search-header">
                搜尋範圍：指數 ${result.start} ~ ${result.end}
            </div>
            <div class="search-stats">
                <div class="stat-item">
                    <span class="stat-value">${result.primeExponentsCount}</span>
                    <span class="stat-label">測試的質數指數</span>
                </div>
                <div class="stat-item highlight">
                    <span class="stat-value">${result.results.length}</span>
                    <span class="stat-label">找到的梅森質數</span>
                </div>
            </div>
            <div class="search-table-container">
                <table class="search-table">
                    <thead>
                        <tr>
                            <th>排名</th>
                            <th>梅森數</th>
                            <th>指數 p</th>
                            <th>位數</th>
                            <th>狀態</th>
                        </tr>
                    </thead>
                    <tbody>${resultsHtml}</tbody>
                </table>
            </div>
            <div class="result-stats">
                <span>耗時：${(result.duration / 1000).toFixed(2)} 秒</span>
            </div>
        </div>
    `;

    elements.searchResult.classList.remove('hidden');
}

function displayKnownResult(result) {
    updateProgress(100, '載入完成');

    const resultsHtml = result.results.map(r => `
        <tr>
            <td>${r.rank}</td>
            <td class="exponent">M<sub>${r.exponent}</sub></td>
            <td>${r.exponent}</td>
            <td>${formatNumber(r.digits)}</td>
            <td>${r.year}</td>
        </tr>
    `).join('');

    elements.knownResult.innerHTML = `
        <div class="result-box">
            <div class="known-header">
                已知梅森質數列表 (共 ${result.totalKnown} 個，顯示前 ${result.results.length} 個)
            </div>
            <div class="known-table-container">
                <table class="known-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>梅森質數</th>
                            <th>指數 p</th>
                            <th>位數</th>
                            <th>發現年份</th>
                        </tr>
                    </thead>
                    <tbody>${resultsHtml}</tbody>
                </table>
            </div>
            <div class="gimps-note">
                <p>💡 GIMPS (Great Internet Mersenne Prime Search) 是一個分散式運算專案，持續搜尋新的梅森質數。</p>
                <p>目前已知最大的梅森質數是 M<sub>82589933</sub>，有 24,862,048 位數！</p>
            </div>
            <div class="result-stats">
                <span>耗時：${result.duration.toFixed(2)} ms</span>
            </div>
        </div>
    `;

    elements.knownResult.classList.remove('hidden');
}

// ===== 工具函數 =====

function formatNumber(num) {
    return Number(num).toLocaleString();
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('已複製到剪貼簿！');
    }).catch(err => {
        console.error('複製失敗:', err);
    });
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// 全域函數供 HTML 使用
window.copyToClipboard = copyToClipboard;
