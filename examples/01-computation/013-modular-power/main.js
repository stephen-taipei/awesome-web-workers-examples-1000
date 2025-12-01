/**
 * #013 模冪運算 - 主執行緒
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
    modulus: document.getElementById('modulus'),
    calculateBtn: document.getElementById('calculate-btn'),
    stopBtn: document.getElementById('stop-btn'),

    // RSA 演示
    rsaMessage: document.getElementById('rsa-message'),
    rsaBitLength: document.getElementById('rsa-bit-length'),
    rsaBtn: document.getElementById('rsa-btn'),

    // Diffie-Hellman
    dhPrime: document.getElementById('dh-prime'),
    dhGenerator: document.getElementById('dh-generator'),
    dhBtn: document.getElementById('dh-btn'),

    // 費馬測試
    fermatNumber: document.getElementById('fermat-number'),
    fermatIterations: document.getElementById('fermat-iterations'),
    fermatBtn: document.getElementById('fermat-btn'),

    // 批量計算
    batchInput: document.getElementById('batch-input'),
    batchBtn: document.getElementById('batch-btn'),

    // 方法比較
    compareBase: document.getElementById('compare-base'),
    compareExp: document.getElementById('compare-exp'),
    compareMod: document.getElementById('compare-mod'),
    compareBtn: document.getElementById('compare-btn'),

    // 進度
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),

    // 結果區域
    calculateResult: document.getElementById('calculate-result'),
    rsaResult: document.getElementById('rsa-result'),
    dhResult: document.getElementById('dh-result'),
    fermatResult: document.getElementById('fermat-result'),
    batchResult: document.getElementById('batch-result'),
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

            case 'RSA_RESULT':
                displayRSAResult(payload);
                setCalculating(false);
                break;

            case 'DH_RESULT':
                displayDHResult(payload);
                setCalculating(false);
                break;

            case 'FERMAT_RESULT':
                displayFermatResult(payload);
                setCalculating(false);
                break;

            case 'BATCH_RESULT':
                displayBatchResult(payload);
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
        elements.rsaBtn,
        elements.dhBtn,
        elements.fermatBtn,
        elements.batchBtn,
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
        elements.rsaResult,
        elements.dhResult,
        elements.fermatResult,
        elements.batchResult,
        elements.compareResult
    ];

    sections.forEach(s => s && s.classList.add('hidden'));
}

/**
 * 顯示計算結果
 */
function displayCalculateResult(data) {
    hideAllResults();

    const { base, exponent, modulus, result, time, stats } = data;

    elements.calculateResult.innerHTML = `
        <h2 class="card-title">計算結果</h2>
        <div class="result-content">
            <div class="result-formula">
                ${escapeHtml(base)}<sup>${escapeHtml(exponent)}</sup> mod ${escapeHtml(modulus)} = <span class="highlight">${escapeHtml(result)}</span>
            </div>
            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">底數位數</span>
                    <span class="stat-value">${stats.baseDigits}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">指數位數</span>
                    <span class="stat-value">${stats.expDigits}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">模數位數</span>
                    <span class="stat-value">${stats.modDigits}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">計算時間</span>
                    <span class="stat-value">${time.toFixed(2)} ms</span>
                </div>
            </div>
            <div class="result-detail">
                <h4>完整結果</h4>
                <div class="result-box">${escapeHtml(result)}</div>
            </div>
        </div>
    `;

    elements.calculateResult.classList.remove('hidden');
}

/**
 * 顯示 RSA 演示結果
 */
function displayRSAResult(data) {
    hideAllResults();

    const { p, q, n, phi, e, d, message, ciphertext, decrypted, success, time, bitLength } = data;

    elements.rsaResult.innerHTML = `
        <h2 class="card-title">RSA 加密演示結果</h2>
        <div class="result-content">
            <div class="verification-status ${success ? 'success' : 'error'}">
                ${success ? '✓ 加解密成功' : '✗ 加解密失敗'}
            </div>

            <div class="crypto-section">
                <h4>金鑰生成</h4>
                <div class="crypto-grid">
                    <div class="crypto-item">
                        <span class="label">質數 p</span>
                        <span class="value mono">${escapeHtml(p)}</span>
                    </div>
                    <div class="crypto-item">
                        <span class="label">質數 q</span>
                        <span class="value mono">${escapeHtml(q)}</span>
                    </div>
                    <div class="crypto-item full-width">
                        <span class="label">n = p × q</span>
                        <span class="value mono">${escapeHtml(n)}</span>
                    </div>
                    <div class="crypto-item full-width">
                        <span class="label">φ(n) = (p-1)(q-1)</span>
                        <span class="value mono">${escapeHtml(phi)}</span>
                    </div>
                </div>
            </div>

            <div class="crypto-section">
                <h4>公鑰與私鑰</h4>
                <div class="key-pair">
                    <div class="key public-key">
                        <span class="key-label">公鑰 (e, n)</span>
                        <span class="key-value">(${escapeHtml(e)}, ${escapeHtml(n)})</span>
                    </div>
                    <div class="key private-key">
                        <span class="key-label">私鑰 (d, n)</span>
                        <span class="key-value">(${escapeHtml(d)}, ${escapeHtml(n)})</span>
                    </div>
                </div>
            </div>

            <div class="crypto-section">
                <h4>加密過程</h4>
                <div class="encryption-flow">
                    <div class="flow-step">
                        <span class="step-label">原始訊息 m</span>
                        <span class="step-value">${escapeHtml(message)}</span>
                    </div>
                    <div class="flow-arrow">↓ c = m<sup>e</sup> mod n</div>
                    <div class="flow-step">
                        <span class="step-label">密文 c</span>
                        <span class="step-value">${escapeHtml(ciphertext)}</span>
                    </div>
                    <div class="flow-arrow">↓ m = c<sup>d</sup> mod n</div>
                    <div class="flow-step">
                        <span class="step-label">解密結果</span>
                        <span class="step-value ${success ? 'success' : 'error'}">${escapeHtml(decrypted)}</span>
                    </div>
                </div>
            </div>

            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">計算時間</span>
                    <span class="stat-value">${time.toFixed(2)} ms</span>
                </div>
            </div>
        </div>
    `;

    elements.rsaResult.classList.remove('hidden');
}

/**
 * 顯示 Diffie-Hellman 結果
 */
function displayDHResult(data) {
    hideAllResults();

    const { prime, generator, alicePrivate, alicePublic, bobPrivate, bobPublic,
            aliceShared, bobShared, keysMatch, time } = data;

    elements.dhResult.innerHTML = `
        <h2 class="card-title">Diffie-Hellman 金鑰交換</h2>
        <div class="result-content">
            <div class="verification-status ${keysMatch ? 'success' : 'error'}">
                ${keysMatch ? '✓ 共享密鑰匹配' : '✗ 密鑰不匹配'}
            </div>

            <div class="crypto-section">
                <h4>公開參數</h4>
                <div class="crypto-grid">
                    <div class="crypto-item">
                        <span class="label">質數 p</span>
                        <span class="value mono">${escapeHtml(prime)}</span>
                    </div>
                    <div class="crypto-item">
                        <span class="label">生成元 g</span>
                        <span class="value mono">${escapeHtml(generator)}</span>
                    </div>
                </div>
            </div>

            <div class="dh-exchange">
                <div class="dh-party alice">
                    <h4>Alice</h4>
                    <div class="dh-item">
                        <span class="label">私鑰 a</span>
                        <span class="value">${formatLong(alicePrivate)}</span>
                    </div>
                    <div class="dh-item">
                        <span class="label">公鑰 A = g<sup>a</sup> mod p</span>
                        <span class="value">${formatLong(alicePublic)}</span>
                    </div>
                    <div class="dh-item highlight">
                        <span class="label">共享密鑰 K = B<sup>a</sup> mod p</span>
                        <span class="value">${formatLong(aliceShared)}</span>
                    </div>
                </div>

                <div class="dh-arrow">
                    <span>交換公鑰</span>
                    <span class="arrows">⟷</span>
                </div>

                <div class="dh-party bob">
                    <h4>Bob</h4>
                    <div class="dh-item">
                        <span class="label">私鑰 b</span>
                        <span class="value">${formatLong(bobPrivate)}</span>
                    </div>
                    <div class="dh-item">
                        <span class="label">公鑰 B = g<sup>b</sup> mod p</span>
                        <span class="value">${formatLong(bobPublic)}</span>
                    </div>
                    <div class="dh-item highlight">
                        <span class="label">共享密鑰 K = A<sup>b</sup> mod p</span>
                        <span class="value">${formatLong(bobShared)}</span>
                    </div>
                </div>
            </div>

            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">計算時間</span>
                    <span class="stat-value">${time.toFixed(2)} ms</span>
                </div>
            </div>
        </div>
    `;

    elements.dhResult.classList.remove('hidden');
}

/**
 * 顯示費馬測試結果
 */
function displayFermatResult(data) {
    hideAllResults();

    const { number, isProbablePrime, confidence, iterations, witnesses, time, note } = data;

    elements.fermatResult.innerHTML = `
        <h2 class="card-title">費馬質數測試結果</h2>
        <div class="result-content">
            <div class="verification-status ${isProbablePrime ? 'success' : 'error'}">
                ${isProbablePrime ? '✓ 可能是質數' : '✗ 確定是合成數'}
            </div>

            <div class="result-formula">
                測試數字：${escapeHtml(number)}
            </div>

            <div class="result-stats">
                <div class="stat-item">
                    <span class="stat-label">測試次數</span>
                    <span class="stat-value">${iterations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">信心水準</span>
                    <span class="stat-value">${confidence}%</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">計算時間</span>
                    <span class="stat-value">${time.toFixed(2)} ms</span>
                </div>
            </div>

            ${witnesses.length > 0 ? `
                <div class="witnesses-section">
                    <h4>費馬證人（合成數證據）</h4>
                    <div class="witnesses-list">
                        ${witnesses.map(w => `<span class="witness">${escapeHtml(w)}</span>`).join('')}
                    </div>
                </div>
            ` : ''}

            <div class="note-box">
                <strong>說明：</strong>${note}
            </div>

            <div class="fermat-info">
                <h4>費馬小定理</h4>
                <p>如果 n 是質數，則對於任意 a（gcd(a,n)=1）：</p>
                <div class="formula">a<sup>n-1</sup> ≡ 1 (mod n)</div>
                <p>如果存在 a 使得上式不成立，則 n 一定是合成數。</p>
            </div>
        </div>
    `;

    elements.fermatResult.classList.remove('hidden');
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
            <td>${escapeHtml(r.base)}<sup>${escapeHtml(r.exponent)}</sup> mod ${escapeHtml(r.modulus)}</td>
            <td class="result-cell">${escapeHtml(r.result)}</td>
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
 * 顯示方法比較結果
 */
function displayCompareResult(data) {
    hideAllResults();

    const { base, exponent, modulus, results } = data;

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
                <div class="result-box small">${formatLong(r.result)}</div>
            </div>
        </div>
    `).join('');

    elements.compareResult.innerHTML = `
        <h2 class="card-title">方法比較結果</h2>
        <div class="result-content">
            <div class="compare-header">
                <p>${escapeHtml(base)}<sup>${escapeHtml(exponent)}</sup> mod ${escapeHtml(modulus)}</p>
            </div>
            <div class="methods-grid">
                ${methodCards}
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
 * 格式化長數字
 */
function formatLong(str, maxLen = 30) {
    if (str.length <= maxLen) return str;
    return str.slice(0, 15) + '...' + str.slice(-10);
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
    const modulus = elements.modulus.value.trim();

    if (!validateInteger(base, true).valid) {
        showError('底數必須是整數');
        return;
    }
    if (!validateInteger(exponent).valid) {
        showError('指數必須是非負整數');
        return;
    }
    if (!validateInteger(modulus).valid || modulus === '0') {
        showError('模數必須是正整數');
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '開始計算...');

    worker.postMessage({
        type: 'CALCULATE',
        payload: { base, exponent, modulus }
    });
});

// 停止按鈕
elements.stopBtn.addEventListener('click', () => {
    worker.postMessage({ type: 'STOP' });
    setCalculating(false);
    updateProgress(0, '已停止');
});

// RSA 演示按鈕
elements.rsaBtn.addEventListener('click', () => {
    const message = elements.rsaMessage.value.trim();
    const bitLength = parseInt(elements.rsaBitLength.value);

    if (!validateInteger(message).valid) {
        showError('訊息必須是非負整數');
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, 'RSA 演示...');

    worker.postMessage({
        type: 'RSA_DEMO',
        payload: { message, bitLength }
    });
});

// Diffie-Hellman 按鈕
elements.dhBtn.addEventListener('click', () => {
    const prime = elements.dhPrime.value.trim();
    const generator = elements.dhGenerator.value.trim();

    if (!validateInteger(prime).valid) {
        showError('質數必須是正整數');
        return;
    }
    if (!validateInteger(generator).valid) {
        showError('生成元必須是正整數');
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, 'Diffie-Hellman 演示...');

    worker.postMessage({
        type: 'DIFFIE_HELLMAN',
        payload: { prime, generator }
    });
});

// 費馬測試按鈕
elements.fermatBtn.addEventListener('click', () => {
    const number = elements.fermatNumber.value.trim();
    const iterations = parseInt(elements.fermatIterations.value);

    if (!validateInteger(number).valid) {
        showError('數字必須是正整數');
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '費馬測試...');

    worker.postMessage({
        type: 'FERMAT_TEST',
        payload: { number, iterations }
    });
});

// 批量計算按鈕
elements.batchBtn.addEventListener('click', () => {
    const input = elements.batchInput.value.trim();

    if (!input) {
        showError('請輸入計算式');
        return;
    }

    const lines = input.split('\n').filter(l => l.trim());
    const calculations = [];

    for (const line of lines) {
        // 格式: base^exp mod m
        const match = line.match(/^\s*(-?\d+)\s*\^\s*(\d+)\s+mod\s+(\d+)\s*$/i);
        if (match) {
            calculations.push({
                base: match[1],
                exponent: match[2],
                modulus: match[3]
            });
        } else {
            showError(`無效格式: ${line}`);
            return;
        }
    }

    if (calculations.length === 0) {
        showError('沒有有效的計算式');
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '批量計算...');

    worker.postMessage({
        type: 'CALCULATE_BATCH',
        payload: { calculations }
    });
});

// 方法比較按鈕
elements.compareBtn.addEventListener('click', () => {
    const base = elements.compareBase.value.trim();
    const exponent = elements.compareExp.value.trim();
    const modulus = elements.compareMod.value.trim();

    if (!validateInteger(base, true).valid ||
        !validateInteger(exponent).valid ||
        !validateInteger(modulus).valid || modulus === '0') {
        showError('請輸入有效的數值');
        return;
    }

    setCalculating(true);
    hideAllResults();
    updateProgress(0, '比較方法...');

    worker.postMessage({
        type: 'COMPARE_METHODS',
        payload: { base, exponent, modulus }
    });
});

// 預設按鈕
elements.presetBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        if (btn.dataset.base) elements.base.value = btn.dataset.base;
        if (btn.dataset.exp) elements.exponent.value = btn.dataset.exp;
        if (btn.dataset.mod) elements.modulus.value = btn.dataset.mod;
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
