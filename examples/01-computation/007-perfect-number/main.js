/**
 * 完美數檢測器 - 主執行緒腳本
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
    // 單數檢測
    elements.singleInput = document.getElementById('single-input');
    elements.checkSingleBtn = document.getElementById('check-single-btn');
    elements.analyzeBtn = document.getElementById('analyze-btn');

    // 範圍搜尋
    elements.rangeStart = document.getElementById('range-start');
    elements.rangeEnd = document.getElementById('range-end');
    elements.searchRangeBtn = document.getElementById('search-range-btn');
    elements.classifyRangeBtn = document.getElementById('classify-range-btn');

    // 梅森完美數
    elements.maxExponent = document.getElementById('max-exponent');
    elements.findMersenneBtn = document.getElementById('find-mersenne-btn');

    // 通用
    elements.stopBtn = document.getElementById('stop-btn');
    elements.progressBar = document.getElementById('progress-bar');
    elements.progressText = document.getElementById('progress-text');
    elements.errorMessage = document.getElementById('error-message');

    // 結果區域
    elements.singleResult = document.getElementById('single-result');
    elements.analyzeResult = document.getElementById('analyze-result');
    elements.searchResult = document.getElementById('search-result');
    elements.classifyResult = document.getElementById('classify-result');
    elements.mersenneResult = document.getElementById('mersenne-result');
}

function setupEventListeners() {
    elements.checkSingleBtn.addEventListener('click', checkSingle);
    elements.analyzeBtn.addEventListener('click', analyzeNumber);
    elements.searchRangeBtn.addEventListener('click', searchRange);
    elements.classifyRangeBtn.addEventListener('click', classifyRange);
    elements.findMersenneBtn.addEventListener('click', findMersenne);
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
        case 'ANALYZE_RESULT':
            displayAnalyzeResult(payload);
            finishCalculation();
            break;
        case 'SEARCH_RESULT':
            displaySearchResult(payload);
            finishCalculation();
            break;
        case 'CLASSIFY_RESULT':
            displayClassifyResult(payload);
            finishCalculation();
            break;
        case 'MERSENNE_RESULT':
            displayMersenneResult(payload);
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

function checkSingle() {
    const number = elements.singleInput.value.trim();

    if (!number) {
        showError('請輸入數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CHECK_SINGLE',
        payload: { number }
    });
}

function analyzeNumber() {
    const number = elements.singleInput.value.trim();

    if (!number) {
        showError('請輸入數字');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'ANALYZE_NUMBER',
        payload: { number }
    });
}

function searchRange() {
    const start = elements.rangeStart.value.trim();
    const end = elements.rangeEnd.value.trim();

    if (!start || !end) {
        showError('請輸入起始和結束值');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'SEARCH_RANGE',
        payload: { start, end }
    });
}

function classifyRange() {
    const start = elements.rangeStart.value.trim();
    const end = elements.rangeEnd.value.trim();

    if (!start || !end) {
        showError('請輸入起始和結束值');
        return;
    }

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'CLASSIFY_RANGE',
        payload: { start, end }
    });
}

function findMersenne() {
    const maxExponent = parseInt(elements.maxExponent.value) || 31;

    startCalculation();
    hideAllResults();

    worker.postMessage({
        type: 'FIND_MERSENNE_PERFECT',
        payload: { maxExponent }
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
        elements.checkSingleBtn,
        elements.analyzeBtn,
        elements.searchRangeBtn,
        elements.classifyRangeBtn,
        elements.findMersenneBtn
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
    ['singleResult', 'analyzeResult', 'searchResult', 'classifyResult', 'mersenneResult'].forEach(key => {
        if (elements[key]) elements[key].classList.add('hidden');
    });
}

function displaySingleResult(result) {
    updateProgress(100, '檢測完成');

    const classificationInfo = getClassificationInfo(result.classification);
    const divisorsDisplay = result.divisors.length > 0
        ? result.divisors.join(' + ')
        : '(無)';

    let mersenneHtml = '';
    if (result.mersenneInfo) {
        mersenneHtml = `
            <div class="mersenne-connection">
                <h4>梅森質數關聯</h4>
                <p>此完美數 = 2<sup>${result.mersenneInfo.exponent - 1}</sup> × (2<sup>${result.mersenneInfo.exponent}</sup> - 1)</p>
                <p>梅森質數 M<sub>${result.mersenneInfo.exponent}</sub> = ${formatNumber(result.mersenneInfo.mersenne)}</p>
            </div>
        `;
    }

    elements.singleResult.innerHTML = `
        <div class="result-box">
            <div class="classification-badge ${result.classification}">
                ${classificationInfo.icon} ${classificationInfo.name}
            </div>
            <div class="number-display">
                ${formatNumber(result.number)}
            </div>
            <div class="divisor-sum">
                <span class="label">真因數和：</span>
                <span class="value">${divisorsDisplay} = ${formatNumber(result.divisorSum)}</span>
            </div>
            <div class="comparison">
                <span class="number">${formatNumber(result.number)}</span>
                <span class="operator">${getComparisonOperator(result.classification)}</span>
                <span class="sum">${formatNumber(result.divisorSum)}</span>
                ${result.difference !== '0' ? `<span class="diff">(差: ${formatNumber(result.difference)})</span>` : ''}
            </div>
            ${mersenneHtml}
            <div class="result-stats">
                <span>因數個數：${result.divisorCount}</span>
                <span>豐度比：${result.abundanceRatio}</span>
                <span>耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.singleResult.classList.remove('hidden');
}

function displayAnalyzeResult(result) {
    updateProgress(100, '分析完成');

    const classificationInfo = getClassificationInfo(result.classification);

    let specialPropertiesHtml = '';
    const properties = [];

    if (result.classification === 'perfect') {
        properties.push('<span class="property perfect">完美數</span>');
    }
    if (result.amicablePair) {
        properties.push(`<span class="property amicable">親和數配對：${formatNumber(result.amicablePair)}</span>`);
    }
    if (result.isSemiperfect === true) {
        properties.push('<span class="property semiperfect">半完美數</span>');
    }
    if (result.isWeird) {
        properties.push('<span class="property weird">奇異數</span>');
    }

    if (properties.length > 0) {
        specialPropertiesHtml = `
            <div class="special-properties">
                <h4>特殊性質</h4>
                <div class="properties-list">${properties.join('')}</div>
            </div>
        `;
    }

    const divisorsHtml = result.divisors.map(d =>
        `<span class="divisor-item">${formatNumber(d)}</span>`
    ).join('');

    elements.analyzeResult.innerHTML = `
        <div class="result-box">
            <div class="classification-badge ${result.classification}">
                ${classificationInfo.icon} ${classificationInfo.name}
            </div>
            <div class="number-display">${formatNumber(result.number)}</div>

            <div class="analysis-grid">
                <div class="analysis-item">
                    <span class="label">真因數和</span>
                    <span class="value">${formatNumber(result.divisorSum)}</span>
                </div>
                <div class="analysis-item">
                    <span class="label">因數總和</span>
                    <span class="value">${formatNumber(result.totalSum)}</span>
                </div>
                <div class="analysis-item">
                    <span class="label">因數個數</span>
                    <span class="value">${result.divisorCount}</span>
                </div>
                <div class="analysis-item">
                    <span class="label">豐度指數</span>
                    <span class="value">${result.abundanceIndex}</span>
                </div>
                ${result.deficit ? `
                <div class="analysis-item">
                    <span class="label">缺損值</span>
                    <span class="value">${formatNumber(result.deficit)}</span>
                </div>
                ` : ''}
                ${result.abundance ? `
                <div class="analysis-item">
                    <span class="label">盈餘值</span>
                    <span class="value">${formatNumber(result.abundance)}</span>
                </div>
                ` : ''}
            </div>

            ${specialPropertiesHtml}

            <div class="divisors-section">
                <h4>真因數列表 ${result.divisorsTruncated ? '(前 50 個)' : ''}</h4>
                <div class="divisors-grid">${divisorsHtml}</div>
            </div>

            <div class="result-stats">
                <span>耗時：${result.duration.toFixed(3)} ms</span>
            </div>
        </div>
    `;

    elements.analyzeResult.classList.remove('hidden');
}

function displaySearchResult(result) {
    updateProgress(100, '搜尋完成');

    let perfectListHtml = '';
    if (result.perfectNumbers.length > 0) {
        perfectListHtml = result.perfectNumbers.map(pn => `
            <div class="perfect-item">
                <span class="perfect-number">${formatNumber(pn.number)}</span>
            </div>
        `).join('');
    } else {
        perfectListHtml = '<p class="no-results">此範圍內沒有完美數</p>';
    }

    elements.searchResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">
                搜尋範圍：${formatNumber(result.start)} ~ ${formatNumber(result.end)}
            </div>
            <div class="perfect-count">
                找到 <span class="count">${result.count}</span> 個完美數
            </div>
            <div class="perfect-list">
                ${perfectListHtml}
            </div>
            <div class="result-stats">
                <span>搜尋數量：${formatNumber(result.searchedCount)}</span>
                <span>耗時：${result.duration.toFixed(2)} ms</span>
            </div>
        </div>
    `;

    elements.searchResult.classList.remove('hidden');
}

function displayClassifyResult(result) {
    updateProgress(100, '分類完成');

    const totalCount = result.stats.perfect + result.stats.deficient + result.stats.abundant;

    const resultsHtml = result.results.map(r => {
        const info = getClassificationInfo(r.classification);
        return `
            <tr class="${r.classification}">
                <td>${formatNumber(r.number)}</td>
                <td>${formatNumber(r.divisorSum)}</td>
                <td><span class="class-badge ${r.classification}">${info.icon} ${info.name}</span></td>
            </tr>
        `;
    }).join('');

    elements.classifyResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">
                分類範圍：${formatNumber(result.start)} ~ ${formatNumber(result.end)}
            </div>

            <div class="stats-grid">
                <div class="stat-card perfect">
                    <span class="stat-icon">✦</span>
                    <span class="stat-value">${result.stats.perfect}</span>
                    <span class="stat-label">完美數</span>
                    <span class="stat-percent">${((result.stats.perfect / totalCount) * 100).toFixed(2)}%</span>
                </div>
                <div class="stat-card deficient">
                    <span class="stat-icon">▽</span>
                    <span class="stat-value">${result.stats.deficient}</span>
                    <span class="stat-label">虧數</span>
                    <span class="stat-percent">${((result.stats.deficient / totalCount) * 100).toFixed(2)}%</span>
                </div>
                <div class="stat-card abundant">
                    <span class="stat-icon">△</span>
                    <span class="stat-value">${result.stats.abundant}</span>
                    <span class="stat-label">盈數</span>
                    <span class="stat-percent">${((result.stats.abundant / totalCount) * 100).toFixed(2)}%</span>
                </div>
            </div>

            <div class="classify-table-container">
                <table class="classify-table">
                    <thead>
                        <tr>
                            <th>數字</th>
                            <th>真因數和</th>
                            <th>分類</th>
                        </tr>
                    </thead>
                    <tbody>${resultsHtml}</tbody>
                </table>
            </div>
            ${result.truncated ? '<p class="truncate-notice">※ 僅顯示前 500 筆</p>' : ''}

            <div class="result-stats">
                <span>總數量：${totalCount}</span>
                <span>耗時：${result.duration.toFixed(2)} ms</span>
            </div>
        </div>
    `;

    elements.classifyResult.classList.remove('hidden');
}

function displayMersenneResult(result) {
    updateProgress(100, '搜尋完成');

    const resultsHtml = result.results.map(r => `
        <tr>
            <td>${r.exponent}</td>
            <td>2<sup>${r.exponent}</sup> - 1 = ${r.mersenne}</td>
            <td class="perfect-value">${r.perfectNumber}</td>
            <td>${r.perfectDigits}</td>
        </tr>
    `).join('');

    elements.mersenneResult.innerHTML = `
        <div class="result-box">
            <div class="result-header">
                梅森完美數 (指數 ≤ ${result.maxExponent})
            </div>
            <div class="mersenne-formula">
                偶完美數公式：<span class="formula">2<sup>p-1</sup> × (2<sup>p</sup> - 1)</span>
                <br>其中 2<sup>p</sup> - 1 必須是質數 (梅森質數)
            </div>
            <div class="mersenne-table-container">
                <table class="mersenne-table">
                    <thead>
                        <tr>
                            <th>指數 p</th>
                            <th>梅森質數 M<sub>p</sub></th>
                            <th>完美數</th>
                            <th>位數</th>
                        </tr>
                    </thead>
                    <tbody>${resultsHtml}</tbody>
                </table>
            </div>
            <div class="result-stats">
                <span>找到 ${result.count} 個梅森完美數</span>
                <span>耗時：${result.duration.toFixed(2)} ms</span>
            </div>
        </div>
    `;

    elements.mersenneResult.classList.remove('hidden');
}

// ===== 工具函數 =====

function formatNumber(num) {
    const str = String(num);
    if (str.length > 15) {
        return str.substring(0, 6) + '...' + str.substring(str.length - 6);
    }
    return Number(num).toLocaleString();
}

function getClassificationInfo(classification) {
    switch (classification) {
        case 'perfect':
            return { name: '完美數', icon: '✦' };
        case 'deficient':
            return { name: '虧數', icon: '▽' };
        case 'abundant':
            return { name: '盈數', icon: '△' };
        default:
            return { name: '未知', icon: '?' };
    }
}

function getComparisonOperator(classification) {
    switch (classification) {
        case 'perfect': return '=';
        case 'deficient': return '>';
        case 'abundant': return '<';
        default: return '?';
    }
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
}

function hideError() {
    elements.errorMessage.classList.add('hidden');
}
