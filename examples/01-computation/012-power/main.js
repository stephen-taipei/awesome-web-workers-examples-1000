/**
 * #012 冪運算 - 主執行緒
 *
 * 管理 UI 互動和 Worker 通訊
 */

// Worker 實例
let worker = null;
let isCalculating = false;

// DOM 元素
const elements = {
    // 基本計算
    base: document.getElementById('base'),
    exponent: document.getElementById('exponent'),
    calculateBtn: document.getElementById('calculate-btn'),
    stopBtn: document.getElementById('stop-btn'),

    // 2 的冪次
    twoExponent: document.getElementById('two-exponent'),
    showFullDigits: document.getElementById('show-full-digits'),
    twoBtn: document.getElementById('two-btn'),

    // 批量計算
    batchInput: document.getElementById('batch-input'),
    batchBtn: document.getElementById('batch-btn'),

    // 冪塔
    towerBase: document.getElementById('tower-base'),
    towerHeight: document.getElementById('tower-height'),
    towerMaxDigits: document.getElementById('tower-max-digits'),
    towerBtn: document.getElementById('tower-btn'),

    // 方法比較
    compareBase: document.getElementById('compare-base'),
    compareExponent: document.getElementById('compare-exponent'),
    compareBtn: document.getElementById('compare-btn'),

    // 進度
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),

    // 結果區域
    calculateResult: document.getElementById('calculate-result'),
    twoResult: document.getElementById('two-result'),
    batchResult: document.getElementById('batch-result'),
    towerResult: document.getElementById('tower-result'),
    compareResult: document.getElementById('compare-result'),

    // 預設按鈕
    presetBtns: document.querySelectorAll('.preset-btn'),

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

            case 'POWER_OF_TWO_RESULT':
                displayTwoResult(payload);
                setCalculating(false);
                break;

            case 'BATCH_RESULT':
                displayBatchResult(payload);
                setCalculating(false);
                break;

            case 'TOWER_RESULT':
                displayTowerResult(payload);
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
        elements.twoBtn,
        elements.batchBtn,
        elements.towerBtn,
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
    const sections = [
        elements.calculateResult,
        elements.twoResult,
        elements.batchResult,
        elements.towerResult,
        elements.compareResult
    ];

    sections.forEach(s => s && s.classList.add('hidden'));
}

/**
 * 格式化大數顯示
 */
function formatLargeNumber(numStr, maxLength = 100) {
    if (numStr.length <= maxLength) {
        return numStr;
    }
    const half = Math.floor(maxLength / 2) - 3;
    return numStr.slice(0, half) + ' ... ' + numStr.slice(-half);
}

/**
 * 顯示計算結果
 */
function displayCalculateResult(data) {
    hideAllResults();

    const { base, exponent, result, digitCount, time, preview, isNegativeExp, resultFull } = data;

    let resultDisplay = '';
    if (isNegativeExp) {
        resultDisplay = `
            <div class="fraction-display">
                <span class="numerator">1</span>
                <span class="fraction-line"></span>
                <span class="denominator">${formatLargeNumber(resultFull, 60)}</span>
            </div>
        `;
    } else {
        resultDisplay = `<div class="result-box">${formatLargeNumber(result, 200)}</div>`;
    }

    elements.calculateResult.innerHTML = `
        <h2 class="card-title">計算結果</h2>
        <div class="result-content">
            <div class="result-formula">
                ${escapeHtml(base)}<sup>${escapeHtml(exponent)}</sup>
            </div>
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">底數</span>
                    <span class="stat-value">${escapeHtml(base)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">指數</span>
                    <span class="stat-value">${escapeHtml(exponent)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">結果位數</span>
                    <span class="stat-value">${digitCount.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">計算時間</span>
                    <span class="stat-value">${time.toFixed(2)} ms</span>
                </div>
            </div>
            <div class="result-detail">
                <h4>計算結果</h4>
                ${resultDisplay}
            </div>
        </div>
    `;

    elements.calculateResult.classList.remove('hidden');
}

/**
 * 顯示 2 的冪次結果
 */
function displayTwoResult(data) {
    hideAllResults();

    const { exponent, result, preview, digitCount, time, analysis } = data;

    let analysisHtml = '';
    if (analysis) {
        analysisHtml = `
            <div class="analysis-section">
                <h4>數字分析</h4>
                <div class="analysis-grid">
                    <div class="analysis-item">
                        <span class="label">二進位位數</span>
                        <span class="value">${analysis.bitLength.toLocaleString()}</span>
                    </div>
                    <div class="analysis-item">
                        <span class="label">十六進位位數</span>
                        <span class="value">${analysis.hexDigits.toLocaleString()}</span>
                    </div>
                    <div class="analysis-item">
                        <span class="label">開頭數字</span>
                        <span class="value mono">${analysis.firstDigits}...</span>
                    </div>
                    <div class="analysis-item">
                        <span class="label">結尾數字</span>
                        <span class="value mono">...${analysis.lastDigits}</span>
                    </div>
                </div>
                ${analysis.usage ? `
                    <div class="usage-info">
                        <strong>常見用途：</strong>${analysis.usage}
                    </div>
                ` : ''}
            </div>
        `;
    }

    elements.twoResult.innerHTML = `
        <h2 class="card-title">2 的冪次結果</h2>
        <div class="result-content">
            <div class="result-formula">
                2<sup>${escapeHtml(exponent)}</sup>
            </div>
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">指數</span>
                    <span class="stat-value">${escapeHtml(exponent)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">位數</span>
                    <span class="stat-value">${digitCount.toLocaleString()}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">計算時間</span>
                    <span class="stat-value">${time.toFixed(2)} ms</span>
                </div>
            </div>
            ${analysisHtml}
            <div class="result-detail">
                <h4>結果預覽</h4>
                <div class="result-box">${formatLargeNumber(preview, 200)}</div>
            </div>
            ${result ? `
                <div class="result-detail">
                    <h4>完整結果</h4>
                    <div class="result-box full-result">${result}</div>
                </div>
            ` : ''}
        </div>
    `;

    elements.twoResult.classList.remove('hidden');
}

/**
 * 顯示批量結果
 */
function displayBatchResult(data) {
    hideAllResults();

    const { results, totalTime, count } = data;

    const tableRows = results.map((r, index) => `
        <tr class="${r.error ? 'error-row' : ''}">
            <td>${index + 1}</td>
            <td>${escapeHtml(r.base)}<sup>${escapeHtml(r.exponent)}</sup></td>
            <td class="result-cell">${formatLargeNumber(r.result, 40)}</td>
            <td>${r.digitCount ? r.digitCount.toLocaleString() : '-'}</td>
        </tr>
    `).join('');

    elements.batchResult.innerHTML = `
        <h2 class="card-title">批量計算結果</h2>
        <div class="result-content">
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">計算數量</span>
                    <span class="stat-value">${count}</span>
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
                            <th>運算式</th>
                            <th>結果</th>
                            <th>位數</th>
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
 * 顯示冪塔結果
 */
function displayTowerResult(data) {
    hideAllResults();

    const { base, height, completedLevels, result, digitCount, steps, time, overflow, message } = data;

    const stepsHtml = steps.map(s => `
        <div class="tower-step">
            <span class="level">第 ${s.level} 層</span>
            <span class="value">${s.value}</span>
            ${s.digitCount ? `<span class="digits">(${s.digitCount.toLocaleString()} 位)</span>` : ''}
        </div>
    `).join('');

    elements.towerResult.innerHTML = `
        <h2 class="card-title">冪塔計算結果</h2>
        <div class="result-content">
            <div class="result-formula tower-formula">
                ${Array(Math.min(completedLevels, 5)).fill(base).join('^')}${completedLevels > 5 ? '^...' : ''}
                <span class="tower-info">（${completedLevels} 層）</span>
            </div>
            ${overflow ? `
                <div class="warning-box">
                    ${message}
                </div>
            ` : ''}
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">底數</span>
                    <span class="stat-value">${escapeHtml(base)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">目標高度</span>
                    <span class="stat-value">${height}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">完成層數</span>
                    <span class="stat-value">${completedLevels}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">計算時間</span>
                    <span class="stat-value">${time.toFixed(2)} ms</span>
                </div>
            </div>
            <div class="tower-steps">
                <h4>計算過程</h4>
                ${stepsHtml}
            </div>
            ${result && !overflow ? `
                <div class="result-detail">
                    <h4>最終結果（${digitCount.toLocaleString()} 位）</h4>
                    <div class="result-box">${formatLargeNumber(result, 200)}</div>
                </div>
            ` : ''}
        </div>
    `;

    elements.towerResult.classList.remove('hidden');
}

/**
 * 顯示方法比較結果
 */
function displayCompareResult(data) {
    hideAllResults();

    const { base, exponent, results } = data;

    const validResults = results.filter(r => !r.skipped);
    const sortedResults = [...validResults].sort((a, b) => a.time - b.time);
    const fastest = sortedResults.length > 0 ? sortedResults[0].method : null;

    const methodCards = results.map(r => `
        <div class="method-card ${r.method === fastest ? 'fastest' : ''} ${r.skipped ? 'skipped' : ''}">
            <div class="method-header">
                <span class="method-name">${r.method}</span>
                ${r.method === fastest ? '<span class="fastest-badge">最快</span>' : ''}
            </div>
            <div class="method-stats">
                <div class="method-stat">
                    <span class="stat-label">時間</span>
                    <span class="stat-value">${r.skipped ? '-' : r.time.toFixed(2) + ' ms'}</span>
                </div>
                <div class="method-stat">
                    <span class="stat-label">複雜度</span>
                    <span class="stat-value">${r.complexity}</span>
                </div>
            </div>
            <div class="method-result">
                <span class="result-label">結果</span>
                <div class="result-box small">${r.result}</div>
            </div>
        </div>
    `).join('');

    elements.compareResult.innerHTML = `
        <h2 class="card-title">方法比較結果</h2>
        <div class="result-content">
            <div class="compare-header">
                <p>計算 ${escapeHtml(base)}<sup>${escapeHtml(exponent)}</sup></p>
            </div>
            <div class="methods-grid">
                ${methodCards}
            </div>
            <div class="compare-summary">
                <h4>演算法說明</h4>
                <ul>
                    <li><strong>快速冪算法</strong>：利用指數的二進位表示，O(log n) 複雜度</li>
                    <li><strong>樸素迭代法</strong>：連續乘法，O(n) 複雜度</li>
                    <li><strong>原生運算符</strong>：JavaScript 引擎優化實作</li>
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
function validateInteger(value, allowNegative = false) {
    const pattern = allowNegative ? /^-?\d+$/ : /^\d+$/;
    if (!pattern.test(value.trim())) {
        return { valid: false, error: '請輸入有效的整數' };
    }
    return { valid: true };
}

// ============ 事件處理 ============

// 計算按鈕
elements.calculateBtn.addEventListener('click', () => {
    const base = elements.base.value.trim();
    const exponent = elements.exponent.value.trim();

    const baseVal = validateInteger(base, true);
    if (!baseVal.valid) {
        showError('底數: ' + baseVal.error);
        return;
    }

    const expVal = validateInteger(exponent, true);
    if (!expVal.valid) {
        showError('指數: ' + expVal.error);
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '開始計算...');

    worker.postMessage({
        type: 'CALCULATE',
        payload: { base, exponent }
    });
});

// 停止按鈕
elements.stopBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'STOP' });
    setCalculating(false);
    updateProgress(0, '已停止');
});

// 2 的冪次按鈕
elements.twoBtn.addEventListener('click', () => {
    const exponent = elements.twoExponent.value.trim();
    const showDigits = elements.showFullDigits.checked;

    const expVal = validateInteger(exponent);
    if (!expVal.valid) {
        showError('指數: ' + expVal.error);
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '計算 2 的冪次...');

    worker.postMessage({
        type: 'POWER_OF_TWO',
        payload: { exponent, showDigits }
    });
});

// 批量計算按鈕
elements.batchBtn.addEventListener('click', () => {
    const input = elements.batchInput.value.trim();

    if (!input) {
        showError('請輸入計算式');
        return;
    }

    // 解析輸入：每行一個 base^exponent
    const lines = input.split('\n').filter(l => l.trim());
    const calculations = [];

    for (const line of lines) {
        const match = line.match(/^\s*(-?\d+)\s*\^\s*(-?\d+)\s*$/);
        if (match) {
            calculations.push({ base: match[1], exponent: match[2] });
        } else {
            showError(`無效的格式: ${line}`);
            return;
        }
    }

    if (calculations.length === 0) {
        showError('沒有有效的計算式');
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '開始批量計算...');

    worker.postMessage({
        type: 'CALCULATE_BATCH',
        payload: { calculations }
    });
});

// 冪塔計算按鈕
elements.towerBtn.addEventListener('click', () => {
    const base = elements.towerBase.value.trim();
    const height = parseInt(elements.towerHeight.value);
    const maxDigits = parseInt(elements.towerMaxDigits.value);

    const baseVal = validateInteger(base);
    if (!baseVal.valid) {
        showError('底數: ' + baseVal.error);
        return;
    }

    if (isNaN(height) || height < 1 || height > 10) {
        showError('高度必須在 1-10 之間');
        return;
    }

    if (isNaN(maxDigits) || maxDigits < 100 || maxDigits > 1000000) {
        showError('最大位數必須在 100-1000000 之間');
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '計算冪塔...');

    worker.postMessage({
        type: 'TOWER',
        payload: { base, height, maxDigits }
    });
});

// 方法比較按鈕
elements.compareBtn.addEventListener('click', () => {
    const base = elements.compareBase.value.trim();
    const exponent = elements.compareExponent.value.trim();

    const baseVal = validateInteger(base, true);
    if (!baseVal.valid) {
        showError('底數: ' + baseVal.error);
        return;
    }

    const expVal = validateInteger(exponent);
    if (!expVal.valid) {
        showError('指數: ' + expVal.error);
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '比較不同方法...');

    worker.postMessage({
        type: 'COMPARE_METHODS',
        payload: { base, exponent }
    });
});

// 預設按鈕
elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const base = btn.dataset.base;
        const exp = btn.dataset.exp;
        if (base) elements.base.value = base;
        if (exp) elements.exponent.value = exp;
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
