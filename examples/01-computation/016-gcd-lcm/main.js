/**
 * 主執行緒：GCD/LCM 計算器
 *
 * 負責 UI 互動與 Worker 通訊
 */

// Worker 實例
let worker = null;

// DOM 元素
const elements = {
    // GCD 計算
    gcdA: document.getElementById('gcd-a'),
    gcdB: document.getElementById('gcd-b'),
    gcdShowSteps: document.getElementById('gcd-show-steps'),
    gcdBtn: document.getElementById('gcd-btn'),
    stopBtn: document.getElementById('stop-btn'),
    errorMessage: document.getElementById('error-message'),

    // LCM 計算
    lcmA: document.getElementById('lcm-a'),
    lcmB: document.getElementById('lcm-b'),
    lcmBtn: document.getElementById('lcm-btn'),

    // 擴展 GCD
    extA: document.getElementById('ext-a'),
    extB: document.getElementById('ext-b'),
    extBtn: document.getElementById('ext-btn'),

    // 多數 GCD/LCM
    multiNumbers: document.getElementById('multi-numbers'),
    multiGcdBtn: document.getElementById('multi-gcd-btn'),
    multiLcmBtn: document.getElementById('multi-lcm-btn'),

    // 互質判定
    coprimeNumbers: document.getElementById('coprime-numbers'),
    coprimeBtn: document.getElementById('coprime-btn'),

    // 方法比較
    compareA: document.getElementById('compare-a'),
    compareB: document.getElementById('compare-b'),
    compareBtn: document.getElementById('compare-btn'),

    // 進度
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),

    // 結果區域
    gcdResult: document.getElementById('gcd-result'),
    lcmResult: document.getElementById('lcm-result'),
    extResult: document.getElementById('ext-result'),
    multiResult: document.getElementById('multi-result'),
    coprimeResult: document.getElementById('coprime-result'),
    compareResult: document.getElementById('compare-result')
};

// 初始化 Worker
function initWorker() {
    if (worker) {
        worker.terminate();
    }

    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, payload } = e.data;

        switch (type) {
            case 'READY':
                console.log('Worker 已就緒');
                break;
            case 'PROGRESS':
                updateProgress(payload);
                break;
            case 'GCD_RESULT':
                displayGCDResult(payload);
                break;
            case 'LCM_RESULT':
                displayLCMResult(payload);
                break;
            case 'EXTENDED_GCD_RESULT':
                displayExtendedResult(payload);
                break;
            case 'BINARY_GCD_RESULT':
                displayGCDResult(payload);
                break;
            case 'MULTIPLE_GCD_RESULT':
                displayMultiGCDResult(payload);
                break;
            case 'MULTIPLE_LCM_RESULT':
                displayMultiLCMResult(payload);
                break;
            case 'COPRIME_RESULT':
                displayCoprimeResult(payload);
                break;
            case 'COMPARE_RESULT':
                displayCompareResult(payload);
                break;
            case 'ERROR':
                showError(payload.message);
                resetUI();
                break;
        }
    };

    worker.onerror = function(error) {
        showError(`Worker 錯誤: ${error.message}`);
        resetUI();
    };
}

// 更新進度
function updateProgress(payload) {
    const { percent, current, total } = payload;

    if (percent !== undefined) {
        elements.progressBar.style.width = `${percent}%`;
        elements.progressBar.textContent = `${percent}%`;
    }

    if (current !== undefined && total !== undefined) {
        elements.progressText.textContent = `處理中: ${current} / ${total}`;
    }
}

// 顯示錯誤
function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorMessage.classList.remove('hidden');
    setTimeout(() => {
        elements.errorMessage.classList.add('hidden');
    }, 5000);
}

// 隱藏錯誤
function hideError() {
    elements.errorMessage.classList.add('hidden');
}

// 重置 UI
function resetUI() {
    elements.gcdBtn.disabled = false;
    elements.lcmBtn.disabled = false;
    elements.extBtn.disabled = false;
    elements.multiGcdBtn.disabled = false;
    elements.multiLcmBtn.disabled = false;
    elements.coprimeBtn.disabled = false;
    elements.compareBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.progressBar.style.width = '0%';
    elements.progressBar.textContent = '0%';
    elements.progressText.textContent = '準備就緒';
}

// 格式化時間
function formatTime(ms) {
    if (ms < 0.001) return '<0.001ms';
    if (ms < 1) return `${ms.toFixed(3)}ms`;
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

// 格式化大數
function formatBigNumber(str) {
    if (str.length <= 20) return str;
    return str.substring(0, 8) + '...' + str.substring(str.length - 8) + ` (${str.length} 位)`;
}

// 顯示 GCD 結果
function displayGCDResult(payload) {
    resetUI();

    const container = elements.gcdResult;
    container.classList.remove('hidden');

    let stepsHtml = '';
    if (payload.steps && payload.steps.length > 0) {
        stepsHtml = `
            <div class="steps-section">
                <h4>計算步驟</h4>
                <div class="steps-list">
                    ${payload.steps.map((step, i) => `
                        <div class="step-item">
                            <span class="step-num">${i + 1}</span>
                            <span class="step-eq">${step.equation}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.innerHTML = `
        <h3 class="result-title">✓ GCD 計算結果</h3>
        <div class="gcd-display">
            <span class="gcd-label">gcd(${formatBigNumber(payload.a)}, ${formatBigNumber(payload.b)})</span>
            <span class="equals">=</span>
            <span class="gcd-value">${payload.gcd}</span>
        </div>
        <div class="result-grid">
            <div class="result-item">
                <span class="result-label">第一個數</span>
                <span class="result-value">${formatBigNumber(payload.a)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">第二個數</span>
                <span class="result-value">${formatBigNumber(payload.b)}</span>
            </div>
            <div class="result-item highlight">
                <span class="result-label">最大公因數</span>
                <span class="result-value large">${payload.gcd}</span>
            </div>
            <div class="result-item">
                <span class="result-label">使用方法</span>
                <span class="result-value">${payload.method}</span>
            </div>
            <div class="result-item">
                <span class="result-label">計算時間</span>
                <span class="result-value">${formatTime(payload.time)}</span>
            </div>
        </div>
        ${stepsHtml}
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示 LCM 結果
function displayLCMResult(payload) {
    resetUI();

    const container = elements.lcmResult;
    container.classList.remove('hidden');

    container.innerHTML = `
        <h3 class="result-title">✓ LCM 計算結果</h3>
        <div class="lcm-display">
            <span class="lcm-label">lcm(${formatBigNumber(payload.a)}, ${formatBigNumber(payload.b)})</span>
            <span class="equals">=</span>
            <span class="lcm-value">${formatBigNumber(payload.lcm)}</span>
        </div>
        <div class="result-grid">
            <div class="result-item">
                <span class="result-label">第一個數</span>
                <span class="result-value">${formatBigNumber(payload.a)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">第二個數</span>
                <span class="result-value">${formatBigNumber(payload.b)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">GCD</span>
                <span class="result-value">${payload.gcd}</span>
            </div>
            <div class="result-item highlight">
                <span class="result-label">最小公倍數</span>
                <span class="result-value large">${formatBigNumber(payload.lcm)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">計算時間</span>
                <span class="result-value">${formatTime(payload.time)}</span>
            </div>
        </div>
        <div class="formula-box">
            <p><strong>公式：</strong>${payload.formula}</p>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示擴展 GCD 結果
function displayExtendedResult(payload) {
    resetUI();

    const container = elements.extResult;
    container.classList.remove('hidden');

    container.innerHTML = `
        <h3 class="result-title">✓ 擴展歐幾里得算法結果</h3>
        <div class="bezout-display">
            <div class="bezout-identity">${payload.bezoutIdentity}</div>
        </div>
        <div class="result-grid">
            <div class="result-item">
                <span class="result-label">a</span>
                <span class="result-value">${formatBigNumber(payload.a)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">b</span>
                <span class="result-value">${formatBigNumber(payload.b)}</span>
            </div>
            <div class="result-item highlight">
                <span class="result-label">gcd(a, b)</span>
                <span class="result-value large">${payload.gcd}</span>
            </div>
            <div class="result-item bezout">
                <span class="result-label">Bézout 係數 x</span>
                <span class="result-value">${payload.x}</span>
            </div>
            <div class="result-item bezout">
                <span class="result-label">Bézout 係數 y</span>
                <span class="result-value">${payload.y}</span>
            </div>
            <div class="result-item">
                <span class="result-label">計算時間</span>
                <span class="result-value">${formatTime(payload.time)}</span>
            </div>
        </div>
        <div class="verification-box">
            <p><strong>驗證：</strong>${payload.verification}</p>
        </div>
        ${payload.steps && payload.steps.length > 0 ? `
        <div class="steps-section">
            <h4>計算步驟</h4>
            <table class="steps-table">
                <thead>
                    <tr>
                        <th>步驟</th>
                        <th>r</th>
                        <th>s</th>
                        <th>t</th>
                    </tr>
                </thead>
                <tbody>
                    ${payload.steps.map((step, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${step.r}</td>
                            <td>${step.s}</td>
                            <td>${step.t}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        ` : ''}
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示多數 GCD 結果
function displayMultiGCDResult(payload) {
    resetUI();

    if (payload.stopped) {
        showError('計算已停止');
        return;
    }

    const container = elements.multiResult;
    container.classList.remove('hidden');

    container.innerHTML = `
        <h3 class="result-title">✓ 多數 GCD 結果</h3>
        <div class="multi-display">
            <span class="multi-label">gcd(${payload.numbers.map(n => formatBigNumber(n)).join(', ')})</span>
            <span class="equals">=</span>
            <span class="multi-value">${payload.gcd}</span>
        </div>
        <div class="result-grid">
            <div class="result-item">
                <span class="result-label">輸入數量</span>
                <span class="result-value">${payload.numbers.length} 個數字</span>
            </div>
            <div class="result-item highlight">
                <span class="result-label">GCD</span>
                <span class="result-value large">${payload.gcd}</span>
            </div>
            <div class="result-item">
                <span class="result-label">計算時間</span>
                <span class="result-value">${formatTime(payload.time)}</span>
            </div>
        </div>
        ${payload.steps && payload.steps.length > 0 ? `
        <div class="steps-section">
            <h4>計算過程</h4>
            <div class="steps-list">
                ${payload.steps.map(step => `
                    <div class="step-item">
                        <span class="step-num">${step.step}</span>
                        <span class="step-eq">${step.pair} = ${step.result}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示多數 LCM 結果
function displayMultiLCMResult(payload) {
    resetUI();

    if (payload.stopped) {
        showError('計算已停止');
        return;
    }

    const container = elements.multiResult;
    container.classList.remove('hidden');

    container.innerHTML = `
        <h3 class="result-title">✓ 多數 LCM 結果</h3>
        <div class="multi-display">
            <span class="multi-label">lcm(${payload.numbers.map(n => formatBigNumber(n)).join(', ')})</span>
            <span class="equals">=</span>
            <span class="multi-value">${formatBigNumber(payload.lcm)}</span>
        </div>
        <div class="result-grid">
            <div class="result-item">
                <span class="result-label">輸入數量</span>
                <span class="result-value">${payload.numbers.length} 個數字</span>
            </div>
            <div class="result-item highlight">
                <span class="result-label">LCM</span>
                <span class="result-value large">${formatBigNumber(payload.lcm)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">計算時間</span>
                <span class="result-value">${formatTime(payload.time)}</span>
            </div>
        </div>
        ${payload.note ? `<div class="note-box">${payload.note}</div>` : ''}
        ${payload.steps && payload.steps.length > 0 ? `
        <div class="steps-section">
            <h4>計算過程</h4>
            <div class="steps-list">
                ${payload.steps.map(step => `
                    <div class="step-item">
                        <span class="step-num">${step.step}</span>
                        <span class="step-eq">${step.pair} = ${formatBigNumber(step.result)}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示互質結果
function displayCoprimeResult(payload) {
    resetUI();

    const container = elements.coprimeResult;
    container.classList.remove('hidden');

    container.innerHTML = `
        <h3 class="result-title ${payload.allCoprime ? '' : 'warning'}">
            ${payload.allCoprime ? '✓ 所有數互質' : '✗ 存在非互質數對'}
        </h3>
        <div class="result-grid">
            <div class="result-item">
                <span class="result-label">輸入數字</span>
                <span class="result-value">${payload.numbers.join(', ')}</span>
            </div>
            <div class="result-item ${payload.allCoprime ? 'coprime-yes' : 'coprime-no'}">
                <span class="result-label">整體互質</span>
                <span class="result-value">${payload.allCoprime ? '是' : '否'}</span>
            </div>
            <div class="result-item">
                <span class="result-label">計算時間</span>
                <span class="result-value">${formatTime(payload.time)}</span>
            </div>
        </div>
        <div class="pairs-section">
            <h4>兩兩檢查</h4>
            <table class="pairs-table">
                <thead>
                    <tr>
                        <th>數對</th>
                        <th>GCD</th>
                        <th>互質</th>
                    </tr>
                </thead>
                <tbody>
                    ${payload.pairResults.map(r => `
                        <tr class="${r.coprime ? '' : 'not-coprime'}">
                            <td>${r.pair}</td>
                            <td>${r.gcd}</td>
                            <td>${r.coprime ? '✓' : '✗'}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示比較結果
function displayCompareResult(payload) {
    resetUI();

    const container = elements.compareResult;
    container.classList.remove('hidden');

    const fastest = payload.results.reduce((a, b) => a.time < b.time ? a : b);

    container.innerHTML = `
        <h3 class="result-title">⚡ 演算法比較結果</h3>
        <div class="problem-statement">
            <p>gcd(${formatBigNumber(payload.a)}, ${formatBigNumber(payload.b)}) = ${payload.results[0].result}</p>
        </div>
        <table class="compare-table">
            <thead>
                <tr>
                    <th>方法</th>
                    <th>說明</th>
                    <th>平均時間</th>
                </tr>
            </thead>
            <tbody>
                ${payload.results.map(r => `
                    <tr class="${r.method === fastest.method ? 'fastest' : ''}">
                        <td>
                            ${r.method}
                            ${r.method === fastest.method ? '<span class="badge-fastest">最快</span>' : ''}
                        </td>
                        <td class="desc">${r.description}</td>
                        <td class="time">${formatTime(r.time)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="note-box">
            <p>測試迭代次數：${payload.iterations} 次</p>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 計算 GCD
function calculateGCD() {
    hideError();

    const a = elements.gcdA.value.trim();
    const b = elements.gcdB.value.trim();
    const showSteps = elements.gcdShowSteps.checked;

    if (!a || !b) {
        showError('請輸入兩個數字');
        return;
    }

    elements.gcdBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '計算中...';

    worker.postMessage({
        type: 'CALCULATE_GCD',
        payload: { a, b, showSteps }
    });
}

// 計算 LCM
function calculateLCM() {
    hideError();

    const a = elements.lcmA.value.trim();
    const b = elements.lcmB.value.trim();

    if (!a || !b) {
        showError('請輸入兩個數字');
        return;
    }

    elements.lcmBtn.disabled = true;
    elements.progressText.textContent = '計算中...';

    worker.postMessage({
        type: 'CALCULATE_LCM',
        payload: { a, b }
    });
}

// 擴展 GCD
function calculateExtGCD() {
    hideError();

    const a = elements.extA.value.trim();
    const b = elements.extB.value.trim();

    if (!a || !b) {
        showError('請輸入兩個數字');
        return;
    }

    elements.extBtn.disabled = true;
    elements.progressText.textContent = '計算中...';

    worker.postMessage({
        type: 'EXTENDED_GCD',
        payload: { a, b }
    });
}

// 多數 GCD
function calculateMultiGCD() {
    hideError();

    const input = elements.multiNumbers.value.trim();
    const numbers = input.split(/[,\s\n]+/).filter(n => n && /^-?\d+$/.test(n));

    if (numbers.length < 2) {
        showError('請至少輸入兩個數字');
        return;
    }

    elements.multiGcdBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '計算中...';

    worker.postMessage({
        type: 'MULTIPLE_GCD',
        payload: { numbers }
    });
}

// 多數 LCM
function calculateMultiLCM() {
    hideError();

    const input = elements.multiNumbers.value.trim();
    const numbers = input.split(/[,\s\n]+/).filter(n => n && /^-?\d+$/.test(n));

    if (numbers.length < 2) {
        showError('請至少輸入兩個數字');
        return;
    }

    elements.multiLcmBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '計算中...';

    worker.postMessage({
        type: 'MULTIPLE_LCM',
        payload: { numbers }
    });
}

// 互質判定
function checkCoprime() {
    hideError();

    const input = elements.coprimeNumbers.value.trim();
    const numbers = input.split(/[,\s\n]+/).filter(n => n && /^-?\d+$/.test(n));

    if (numbers.length < 2) {
        showError('請至少輸入兩個數字');
        return;
    }

    elements.coprimeBtn.disabled = true;
    elements.progressText.textContent = '檢查中...';

    worker.postMessage({
        type: 'CHECK_COPRIME',
        payload: { numbers }
    });
}

// 比較方法
function compareMethods() {
    hideError();

    const a = elements.compareA.value.trim();
    const b = elements.compareB.value.trim();

    if (!a || !b) {
        showError('請輸入兩個數字');
        return;
    }

    elements.compareBtn.disabled = true;
    elements.progressText.textContent = '比較中...';

    worker.postMessage({
        type: 'COMPARE_METHODS',
        payload: { a, b, iterations: 10000 }
    });
}

// 停止計算
function stopCalculation() {
    worker.postMessage({ type: 'STOP' });
    elements.stopBtn.disabled = true;
    elements.progressText.textContent = '正在停止...';
}

// 設定預設值
function setupPresets() {
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const target = btn.dataset.target;
            const value = btn.dataset.value;

            if (target && value) {
                const input = document.getElementById(target);
                if (input) {
                    input.value = value;
                }
            }
        });
    });
}

// 綁定事件
function bindEvents() {
    elements.gcdBtn.addEventListener('click', calculateGCD);
    elements.lcmBtn.addEventListener('click', calculateLCM);
    elements.extBtn.addEventListener('click', calculateExtGCD);
    elements.multiGcdBtn.addEventListener('click', calculateMultiGCD);
    elements.multiLcmBtn.addEventListener('click', calculateMultiLCM);
    elements.coprimeBtn.addEventListener('click', checkCoprime);
    elements.compareBtn.addEventListener('click', compareMethods);
    elements.stopBtn.addEventListener('click', stopCalculation);

    // Enter 鍵觸發
    [elements.gcdA, elements.gcdB].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calculateGCD();
        });
    });

    [elements.lcmA, elements.lcmB].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calculateLCM();
        });
    });

    setupPresets();
}

// 初始化
function init() {
    initWorker();
    bindEvents();
    console.log('GCD/LCM 計算器已初始化');
}

// 啟動
init();
