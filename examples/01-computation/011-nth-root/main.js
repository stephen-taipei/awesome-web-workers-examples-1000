/**
 * #011 N次方根計算 - 主執行緒
 *
 * 管理 UI 互動和 Worker 通訊
 */

// Worker 實例
let worker = null;
let isCalculating = false;

// DOM 元素
const elements = {
    // 單一計算
    singleNumber: document.getElementById('single-number'),
    singleN: document.getElementById('single-n'),
    singlePrecision: document.getElementById('single-precision'),
    calculateBtn: document.getElementById('calculate-btn'),
    verifyBtn: document.getElementById('verify-btn'),
    stopBtn: document.getElementById('stop-btn'),

    // 批量計算
    batchNumbers: document.getElementById('batch-numbers'),
    batchN: document.getElementById('batch-n'),
    batchPrecision: document.getElementById('batch-precision'),
    batchBtn: document.getElementById('batch-btn'),

    // 方根表格
    tableNumber: document.getElementById('table-number'),
    tableMaxN: document.getElementById('table-max-n'),
    tablePrecision: document.getElementById('table-precision'),
    tableBtn: document.getElementById('table-btn'),

    // 方法比較
    compareNumber: document.getElementById('compare-number'),
    compareN: document.getElementById('compare-n'),
    comparePrecision: document.getElementById('compare-precision'),
    compareBtn: document.getElementById('compare-btn'),

    // 進度
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),

    // 結果區域
    calculateResult: document.getElementById('calculate-result'),
    verifyResult: document.getElementById('verify-result'),
    batchResult: document.getElementById('batch-result'),
    tableResult: document.getElementById('table-result'),
    compareResult: document.getElementById('compare-result'),

    // 預設按鈕
    presetBtns: document.querySelectorAll('.preset-btn'),
    presetNBtns: document.querySelectorAll('.preset-n-btn'),

    // 錯誤訊息
    errorMessage: document.getElementById('error-message')
};

/**
 * 初始化 Worker
 */
function initWorker() {
    if (worker) {
        worker.terminate();
    }

    worker = new Worker('worker.js');

    worker.onmessage = function (e) {
        const { type, payload } = e.data;

        switch (type) {
            case 'READY':
                console.log('Worker 已準備就緒');
                break;

            case 'PROGRESS':
                updateProgress(payload.percent, payload.message);
                break;

            case 'CALCULATE_RESULT':
                displayCalculateResult(payload);
                setCalculating(false);
                break;

            case 'VERIFY_RESULT':
                displayVerifyResult(payload);
                setCalculating(false);
                break;

            case 'BATCH_RESULT':
                displayBatchResult(payload);
                setCalculating(false);
                break;

            case 'TABLE_RESULT':
                displayTableResult(payload);
                setCalculating(false);
                break;

            case 'COMPARE_RESULT':
                displayCompareResult(payload);
                setCalculating(false);
                break;

            case 'ERROR':
                showError(payload.message);
                setCalculating(false);
                break;
        }
    };

    worker.onerror = function (error) {
        showError(`Worker 錯誤: ${error.message}`);
        setCalculating(false);
    };
}

/**
 * 更新進度條
 */
function updateProgress(percent, message) {
    elements.progressBar.style.width = `${percent}%`;
    elements.progressBar.textContent = `${percent}%`;
    elements.progressText.textContent = message;
}

/**
 * 設定計算狀態
 */
function setCalculating(calculating) {
    isCalculating = calculating;

    const buttons = [
        elements.calculateBtn,
        elements.verifyBtn,
        elements.batchBtn,
        elements.tableBtn,
        elements.compareBtn
    ];

    buttons.forEach(btn => {
        if (btn) btn.disabled = calculating;
    });

    elements.stopBtn.disabled = !calculating;

    if (!calculating) {
        updateProgress(100, '計算完成');
    }
}

/**
 * 顯示錯誤訊息
 */
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');

    setTimeout(() => {
        elements.errorMessage.classList.add('hidden');
    }, 5000);
}

/**
 * 隱藏所有結果區域
 */
function hideAllResults() {
    const resultSections = [
        elements.calculateResult,
        elements.verifyResult,
        elements.batchResult,
        elements.tableResult,
        elements.compareResult
    ];

    resultSections.forEach(section => {
        if (section) section.classList.add('hidden');
    });
}

/**
 * 格式化次方根符號
 */
function formatRootSymbol(n) {
    if (n === 2) return '√';
    if (n === 3) return '∛';
    if (n === 4) return '∜';
    return `<sup>${n}</sup>√`;
}

/**
 * 顯示計算結果
 */
function displayCalculateResult(data) {
    hideAllResults();

    const { number, n, result, precision, iterations, time, steps } = data;

    let stepsHtml = '';
    if (steps && steps.length > 0) {
        stepsHtml = `
            <div class="steps-section">
                <h4>迭代過程（前 ${steps.length} 步）</h4>
                <div class="steps-list">
                    ${steps.map(step => `
                        <div class="step-item">
                            <span class="step-num">第 ${step.iteration} 次</span>
                            <span class="step-value">${step.value}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    elements.calculateResult.innerHTML = `
        <h2 class="card-title">計算結果</h2>
        <div class="result-content">
            <div class="result-formula">
                ${formatRootSymbol(n)}${escapeHtml(number)} = ${escapeHtml(result)}
            </div>
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">次數</span>
                    <span class="stat-value">${n} 次方根</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">精度</span>
                    <span class="stat-value">${precision} 位</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">迭代</span>
                    <span class="stat-value">${iterations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">時間</span>
                    <span class="stat-value">${time.toFixed(2)} ms</span>
                </div>
            </div>
            <div class="result-detail">
                <h4>完整結果</h4>
                <div class="result-box">${escapeHtml(result)}</div>
            </div>
            ${stepsHtml}
        </div>
    `;

    elements.calculateResult.classList.remove('hidden');
}

/**
 * 顯示驗證結果
 */
function displayVerifyResult(data) {
    hideAllResults();

    const { number, n, nthRoot, powered, error, precision, iterations, time, isAccurate } = data;

    elements.verifyResult.innerHTML = `
        <h2 class="card-title">驗證結果</h2>
        <div class="result-content">
            <div class="verification-status ${isAccurate ? 'success' : 'warning'}">
                ${isAccurate ? '✓ 驗證通過' : '⚠ 精度警告'}
            </div>
            <div class="verify-steps">
                <div class="verify-step">
                    <span class="step-label">原始數字</span>
                    <span class="step-value">${escapeHtml(number)}</span>
                </div>
                <div class="verify-step">
                    <span class="step-label">${formatRootSymbol(n)}${escapeHtml(number)} =</span>
                    <span class="step-value result-box">${escapeHtml(nthRoot)}</span>
                </div>
                <div class="verify-step">
                    <span class="step-label">(${formatRootSymbol(n)}${escapeHtml(number)})<sup>${n}</sup> =</span>
                    <span class="step-value result-box">${escapeHtml(powered)}</span>
                </div>
                <div class="verify-step">
                    <span class="step-label">誤差</span>
                    <span class="step-value ${isAccurate ? 'text-success' : 'text-warning'}">${escapeHtml(error)}</span>
                </div>
            </div>
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">精度</span>
                    <span class="stat-value">${precision} 位</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">迭代</span>
                    <span class="stat-value">${iterations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">時間</span>
                    <span class="stat-value">${time.toFixed(2)} ms</span>
                </div>
            </div>
        </div>
    `;

    elements.verifyResult.classList.remove('hidden');
}

/**
 * 顯示批量結果
 */
function displayBatchResult(data) {
    hideAllResults();

    const { results, n, precision, totalTime, count } = data;

    const tableRows = results.map((r, index) => `
        <tr class="${r.error ? 'error-row' : ''}">
            <td>${index + 1}</td>
            <td>${escapeHtml(r.number)}</td>
            <td class="result-cell">${escapeHtml(r.result)}</td>
            <td>${r.iterations || '-'}</td>
        </tr>
    `).join('');

    elements.batchResult.innerHTML = `
        <h2 class="card-title">批量計算結果</h2>
        <div class="result-content">
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">次數</span>
                    <span class="stat-value">${n} 次方根</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">數量</span>
                    <span class="stat-value">${count}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">精度</span>
                    <span class="stat-value">${precision} 位</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">總時間</span>
                    <span class="stat-value">${totalTime.toFixed(2)} ms</span>
                </div>
            </div>
            <div class="batch-table-container">
                <table class="batch-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>數字</th>
                            <th>${formatRootSymbol(n)}x</th>
                            <th>迭代</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    elements.batchResult.classList.remove('hidden');
}

/**
 * 顯示方根表格結果
 */
function displayTableResult(data) {
    hideAllResults();

    const { number, results, precision, totalTime } = data;

    const tableRows = results.map(r => `
        <tr>
            <td>${r.n}</td>
            <td>${formatRootSymbol(r.n)}${escapeHtml(number)}</td>
            <td class="result-cell">${escapeHtml(r.result)}</td>
            <td>${r.iterations || '-'}</td>
        </tr>
    `).join('');

    elements.tableResult.innerHTML = `
        <h2 class="card-title">方根表格</h2>
        <div class="result-content">
            <div class="compare-header">
                <p>數字 ${escapeHtml(number)} 的各次方根（精度 ${precision} 位）</p>
            </div>
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">計算數量</span>
                    <span class="stat-value">${results.length}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">總時間</span>
                    <span class="stat-value">${totalTime.toFixed(2)} ms</span>
                </div>
            </div>
            <div class="batch-table-container">
                <table class="batch-table">
                    <thead>
                        <tr>
                            <th>n</th>
                            <th>表示</th>
                            <th>結果</th>
                            <th>迭代</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    elements.tableResult.classList.remove('hidden');
}

/**
 * 顯示方法比較結果
 */
function displayCompareResult(data) {
    hideAllResults();

    const { number, n, precision, results } = data;

    const sortedResults = [...results].sort((a, b) => a.time - b.time);
    const fastest = sortedResults[0].method;

    const methodCards = results.map(r => `
        <div class="method-card ${r.method === fastest ? 'fastest' : ''}">
            <div class="method-header">
                <span class="method-name">${r.method}</span>
                ${r.method === fastest ? '<span class="fastest-badge">最快</span>' : ''}
            </div>
            <div class="method-stats">
                <div class="method-stat">
                    <span class="stat-label">時間</span>
                    <span class="stat-value">${r.time.toFixed(2)} ms</span>
                </div>
                <div class="method-stat">
                    <span class="stat-label">迭代</span>
                    <span class="stat-value">${r.iterations}</span>
                </div>
            </div>
            <div class="method-result">
                <span class="result-label">結果</span>
                <div class="result-box small">${escapeHtml(r.result)}</div>
            </div>
        </div>
    `).join('');

    elements.compareResult.innerHTML = `
        <h2 class="card-title">方法比較結果</h2>
        <div class="result-content">
            <div class="compare-header">
                <p>計算 ${formatRootSymbol(n)}${escapeHtml(number)} 精度 ${precision} 位</p>
            </div>
            <div class="methods-grid">
                ${methodCards}
            </div>
            <div class="compare-summary">
                <h4>效能分析</h4>
                <ul>
                    <li><strong>牛頓迭代法</strong>：二次收斂，適合大多數場景</li>
                    <li><strong>二分搜尋法</strong>：穩定可靠，但收斂較慢</li>
                </ul>
            </div>
        </div>
    `;

    elements.compareResult.classList.remove('hidden');
}

/**
 * HTML 跳脫
 */
function escapeHtml(str) {
    if (typeof str !== 'string') str = String(str);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * 驗證輸入
 */
function validateInput(value, type = 'number') {
    if (type === 'number') {
        if (!/^-?\d+(\.\d+)?$/.test(value.trim())) {
            return { valid: false, error: '請輸入有效的數字' };
        }
    } else if (type === 'n') {
        const num = parseFloat(value);
        if (isNaN(num) || num === 0) {
            return { valid: false, error: '次數必須是非零數字' };
        }
    } else if (type === 'precision') {
        const num = parseInt(value);
        if (isNaN(num) || num < 1 || num > 10000) {
            return { valid: false, error: '精度必須在 1-10000 之間' };
        }
    }
    return { valid: true };
}

// ============ 事件處理 ============

// 計算按鈕
elements.calculateBtn.addEventListener('click', () => {
    const number = elements.singleNumber.value;
    const n = elements.singleN.value;
    const precision = elements.singlePrecision.value;

    const numValidation = validateInput(number, 'number');
    if (!numValidation.valid) {
        showError(numValidation.error);
        return;
    }

    const nValidation = validateInput(n, 'n');
    if (!nValidation.valid) {
        showError(nValidation.error);
        return;
    }

    const precValidation = validateInput(precision, 'precision');
    if (!precValidation.valid) {
        showError(precValidation.error);
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '開始計算...');

    worker.postMessage({
        type: 'CALCULATE',
        payload: {
            number: number.trim(),
            n: parseFloat(n),
            precision: parseInt(precision)
        }
    });
});

// 驗證按鈕
elements.verifyBtn.addEventListener('click', () => {
    const number = elements.singleNumber.value;
    const n = elements.singleN.value;
    const precision = elements.singlePrecision.value;

    const numValidation = validateInput(number, 'number');
    if (!numValidation.valid) {
        showError(numValidation.error);
        return;
    }

    const nValidation = validateInput(n, 'n');
    if (!nValidation.valid) {
        showError(nValidation.error);
        return;
    }

    const precValidation = validateInput(precision, 'precision');
    if (!precValidation.valid) {
        showError(precValidation.error);
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '開始驗證...');

    worker.postMessage({
        type: 'VERIFY',
        payload: {
            number: number.trim(),
            n: parseFloat(n),
            precision: parseInt(precision)
        }
    });
});

// 停止按鈕
elements.stopBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'STOP' });
    setCalculating(false);
    updateProgress(0, '已停止');
});

// 批量計算按鈕
elements.batchBtn.addEventListener('click', () => {
    const numbersText = elements.batchNumbers.value.trim();
    const n = elements.batchN.value;
    const precision = elements.batchPrecision.value;

    if (!numbersText) {
        showError('請輸入要計算的數字');
        return;
    }

    const nValidation = validateInput(n, 'n');
    if (!nValidation.valid) {
        showError(nValidation.error);
        return;
    }

    const precValidation = validateInput(precision, 'precision');
    if (!precValidation.valid) {
        showError(precValidation.error);
        return;
    }

    const numbers = numbersText.split(/[,\n\s]+/).filter(n => n.trim());

    if (numbers.length === 0) {
        showError('請輸入有效的數字列表');
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '開始批量計算...');

    worker.postMessage({
        type: 'CALCULATE_BATCH',
        payload: {
            numbers,
            n: parseFloat(n),
            precision: parseInt(precision)
        }
    });
});

// 表格計算按鈕
elements.tableBtn.addEventListener('click', () => {
    const number = elements.tableNumber.value;
    const maxN = elements.tableMaxN.value;
    const precision = elements.tablePrecision.value;

    const numValidation = validateInput(number, 'number');
    if (!numValidation.valid) {
        showError(numValidation.error);
        return;
    }

    if (parseFloat(number) < 0) {
        showError('表格計算僅支援正數');
        return;
    }

    const maxNInt = parseInt(maxN);
    if (isNaN(maxNInt) || maxNInt < 2 || maxNInt > 100) {
        showError('最大次數必須在 2-100 之間');
        return;
    }

    const precValidation = validateInput(precision, 'precision');
    if (!precValidation.valid) {
        showError(precValidation.error);
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '開始計算表格...');

    worker.postMessage({
        type: 'CALCULATE_TABLE',
        payload: {
            number: number.trim(),
            maxN: maxNInt,
            precision: parseInt(precision)
        }
    });
});

// 方法比較按鈕
elements.compareBtn.addEventListener('click', () => {
    const number = elements.compareNumber.value;
    const n = elements.compareN.value;
    const precision = elements.comparePrecision.value;

    const numValidation = validateInput(number, 'number');
    if (!numValidation.valid) {
        showError(numValidation.error);
        return;
    }

    const nValidation = validateInput(n, 'n');
    if (!nValidation.valid) {
        showError(nValidation.error);
        return;
    }

    const precValidation = validateInput(precision, 'precision');
    if (!precValidation.valid) {
        showError(precValidation.error);
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '比較不同方法...');

    worker.postMessage({
        type: 'COMPARE_METHODS',
        payload: {
            number: number.trim(),
            n: parseFloat(n),
            precision: parseInt(precision)
        }
    });
});

// 預設數字按鈕
elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        elements.singleNumber.value = value;
    });
});

// 預設次數按鈕
elements.presetNBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const value = btn.dataset.n;
        elements.singleN.value = value;
    });
});

// 頁面載入時初始化
document.addEventListener('DOMContentLoaded', () => {
    initWorker();
});

// 頁面卸載時清理
window.addEventListener('beforeunload', () => {
    if (worker) {
        worker.terminate();
    }
});
