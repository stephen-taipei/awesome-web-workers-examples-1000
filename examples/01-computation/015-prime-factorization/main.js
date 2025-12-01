/**
 * 主執行緒：質因數分解
 *
 * 負責 UI 互動與 Worker 通訊
 */

// Worker 實例
let worker = null;

// DOM 元素
const elements = {
    // 基本分解
    number: document.getElementById('number'),
    method: document.getElementById('method'),
    factorizeBtn: document.getElementById('factorize-btn'),
    stopBtn: document.getElementById('stop-btn'),
    errorMessage: document.getElementById('error-message'),

    // RSA 攻擊
    rsaN: document.getElementById('rsa-n'),
    rsaE: document.getElementById('rsa-e'),
    rsaCiphertext: document.getElementById('rsa-ciphertext'),
    rsaAttackBtn: document.getElementById('rsa-attack-btn'),

    // 數字分析
    analyzeNumber: document.getElementById('analyze-number'),
    analyzeBtn: document.getElementById('analyze-btn'),

    // 批量分解
    batchInput: document.getElementById('batch-input'),
    batchBtn: document.getElementById('batch-btn'),

    // 方法比較
    compareNumber: document.getElementById('compare-number'),
    compareBtn: document.getElementById('compare-btn'),

    // 進度
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),

    // 結果區域
    factorizeResult: document.getElementById('factorize-result'),
    rsaResult: document.getElementById('rsa-result'),
    analyzeResult: document.getElementById('analyze-result'),
    batchResult: document.getElementById('batch-result'),
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
            case 'FACTORIZE_RESULT':
                displayFactorizeResult(payload);
                break;
            case 'TRIAL_RESULT':
                displayFactorizeResult(payload);
                break;
            case 'POLLARD_RESULT':
                displayFactorizeResult(payload);
                break;
            case 'FERMAT_RESULT':
                displayFermatResult(payload);
                break;
            case 'RSA_ATTACK_RESULT':
                displayRsaResult(payload);
                break;
            case 'ANALYZE_RESULT':
                displayAnalyzeResult(payload);
                break;
            case 'BATCH_RESULT':
                displayBatchResult(payload);
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
    const { percent, phase, current, total, iterations } = payload;

    if (percent !== undefined) {
        elements.progressBar.style.width = `${percent}%`;
        elements.progressBar.textContent = `${percent}%`;
    }

    if (phase) {
        if (current !== undefined && total !== undefined) {
            elements.progressText.textContent = `${phase}: ${current.toLocaleString()} / ${total.toLocaleString()}`;
        } else {
            elements.progressText.textContent = phase;
        }
    } else if (iterations !== undefined) {
        elements.progressText.textContent = `迭代次數: ${iterations.toLocaleString()}`;
    } else if (current !== undefined && total !== undefined) {
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
    elements.factorizeBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.rsaAttackBtn.disabled = false;
    elements.analyzeBtn.disabled = false;
    elements.batchBtn.disabled = false;
    elements.compareBtn.disabled = false;
    elements.progressBar.style.width = '0%';
    elements.progressBar.textContent = '0%';
    elements.progressText.textContent = '準備就緒';
}

// 格式化時間
function formatTime(ms) {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${ms.toFixed(2)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
}

// 格式化大數
function formatBigNumber(str) {
    if (str.length <= 20) return str;
    return str.substring(0, 10) + '...' + str.substring(str.length - 10) + ` (${str.length} 位)`;
}

// 顯示分解結果
function displayFactorizeResult(payload) {
    resetUI();

    const container = elements.factorizeResult;
    container.classList.remove('hidden');

    if (payload.isPrime) {
        container.innerHTML = `
            <h3 class="result-title prime">✓ 質數</h3>
            <div class="result-grid">
                <div class="result-item highlight">
                    <span class="result-label">數字</span>
                    <span class="result-value">${formatBigNumber(payload.number)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">結論</span>
                    <span class="result-value prime-badge">這是質數！</span>
                </div>
                <div class="result-item">
                    <span class="result-label">檢測方法</span>
                    <span class="result-value">${payload.method}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">計算時間</span>
                    <span class="result-value">${formatTime(payload.time)}</span>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <h3 class="result-title">✓ 質因數分解結果</h3>
            <div class="factorization-display">
                <span class="original-number">${formatBigNumber(payload.number)}</span>
                <span class="equals">=</span>
                <span class="factors">${payload.factorization}</span>
            </div>
            <div class="result-grid">
                <div class="result-item">
                    <span class="result-label">質因子數量</span>
                    <span class="result-value">${payload.factorCount}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">總質因子（含重複）</span>
                    <span class="result-value">${payload.totalPrimeFactors}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">使用方法</span>
                    <span class="result-value">${payload.method}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">計算時間</span>
                    <span class="result-value">${formatTime(payload.time)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">驗證</span>
                    <span class="result-value ${payload.verified ? 'verified' : 'error'}">${payload.verified ? '✓ 正確' : '✗ 錯誤'}</span>
                </div>
            </div>
            <div class="factors-list">
                <h4>質因子列表</h4>
                <div class="factors-grid">
                    ${payload.factors.map(f => `
                        <div class="factor-item">
                            <span class="factor-prime">${formatBigNumber(f.prime)}</span>
                            ${f.power > 1 ? `<sup class="factor-power">${f.power}</sup>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示 Fermat 結果
function displayFermatResult(payload) {
    resetUI();

    const container = elements.factorizeResult;
    container.classList.remove('hidden');

    if (payload.found) {
        container.innerHTML = `
            <h3 class="result-title">✓ Fermat 分解成功</h3>
            <div class="factorization-display">
                <span class="original-number">${formatBigNumber(payload.number)}</span>
                <span class="equals">=</span>
                <span class="factors">${payload.p} × ${payload.q}</span>
            </div>
            <div class="result-grid">
                <div class="result-item">
                    <span class="result-label">因子 p</span>
                    <span class="result-value">${formatBigNumber(payload.p)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">因子 q</span>
                    <span class="result-value">${formatBigNumber(payload.q)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">迭代次數</span>
                    <span class="result-value">${payload.iterations.toLocaleString()}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">計算時間</span>
                    <span class="result-value">${formatTime(payload.time)}</span>
                </div>
            </div>
            <div class="explanation">
                <p><strong>驗證：</strong>${payload.verification}</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <h3 class="result-title warning">✗ Fermat 分解失敗</h3>
            <div class="result-grid">
                <div class="result-item">
                    <span class="result-label">原因</span>
                    <span class="result-value">${payload.reason === 'stopped' ? '使用者停止' : '未在迭代限制內找到'}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">迭代次數</span>
                    <span class="result-value">${payload.iterations.toLocaleString()}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">計算時間</span>
                    <span class="result-value">${formatTime(payload.time)}</span>
                </div>
            </div>
            <div class="explanation warning-text">
                <p>Fermat 分解法適用於兩個因子接近的情況。對於因子差距大的數字，建議使用其他方法。</p>
            </div>
        `;
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示 RSA 攻擊結果
function displayRsaResult(payload) {
    resetUI();

    const container = elements.rsaResult;
    container.classList.remove('hidden');

    if (payload.success) {
        container.innerHTML = `
            <h3 class="result-title danger">⚠️ RSA 已被破解！</h3>
            <div class="attack-timeline">
                ${payload.steps.map((step, i) => `
                    <div class="attack-step">
                        <span class="step-number">${i + 1}</span>
                        <span class="step-text">${step}</span>
                    </div>
                `).join('')}
            </div>
            <div class="result-grid">
                <div class="result-item">
                    <span class="result-label">公鑰 N</span>
                    <span class="result-value code">${formatBigNumber(payload.n)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">公鑰 e</span>
                    <span class="result-value code">${payload.e}</span>
                </div>
                <div class="result-item danger-highlight">
                    <span class="result-label">質因子 p</span>
                    <span class="result-value large">${formatBigNumber(payload.p)}</span>
                </div>
                <div class="result-item danger-highlight">
                    <span class="result-label">質因子 q</span>
                    <span class="result-value large">${formatBigNumber(payload.q)}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">φ(N)</span>
                    <span class="result-value code">${formatBigNumber(payload.phi)}</span>
                </div>
                <div class="result-item danger-highlight">
                    <span class="result-label">私鑰 d</span>
                    <span class="result-value large">${formatBigNumber(payload.d)}</span>
                </div>
                ${payload.ciphertext ? `
                <div class="result-item">
                    <span class="result-label">密文 C</span>
                    <span class="result-value code">${formatBigNumber(payload.ciphertext)}</span>
                </div>
                <div class="result-item success-highlight">
                    <span class="result-label">明文 M</span>
                    <span class="result-value large">${payload.plaintext}</span>
                </div>
                ` : ''}
                <div class="result-item">
                    <span class="result-label">破解時間</span>
                    <span class="result-value">${formatTime(payload.time)}</span>
                </div>
            </div>
            <div class="warning-box">
                <p><strong>安全警告：</strong>這展示了為什麼 RSA 需要使用足夠大的質數。實際應用中應使用 2048 位以上的金鑰。</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <h3 class="result-title">🔒 RSA 安全</h3>
            <div class="result-grid">
                <div class="result-item">
                    <span class="result-label">結果</span>
                    <span class="result-value">無法在合理時間內分解 N</span>
                </div>
                <div class="result-item">
                    <span class="result-label">原因</span>
                    <span class="result-value">${payload.reason}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">計算時間</span>
                    <span class="result-value">${formatTime(payload.time)}</span>
                </div>
            </div>
            <div class="explanation">
                <p>N 足夠大或因子分布良好，使得分解在計算上不可行。這正是 RSA 安全性的基礎。</p>
            </div>
        `;
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示數字分析結果
function displayAnalyzeResult(payload) {
    resetUI();

    const container = elements.analyzeResult;
    container.classList.remove('hidden');

    const specialTypes = [];
    if (payload.isPrime) specialTypes.push('質數');
    if (payload.isSquare) specialTypes.push('完全平方數');
    if (payload.isPowerOfTwo) specialTypes.push('2 的冪');
    if (payload.isSemiprime) specialTypes.push('半質數 (p×q)');

    container.innerHTML = `
        <h3 class="result-title">📊 數字分析結果</h3>
        <div class="number-display">
            <span class="big-number">${formatBigNumber(payload.number)}</span>
        </div>
        <div class="result-grid">
            <div class="result-item">
                <span class="result-label">十進位位數</span>
                <span class="result-value">${payload.digits}</span>
            </div>
            <div class="result-item">
                <span class="result-label">二進位位數</span>
                <span class="result-value">${payload.bits}</span>
            </div>
            <div class="result-item ${payload.isPrime ? 'prime-highlight' : ''}">
                <span class="result-label">是否質數</span>
                <span class="result-value">${payload.isPrime ? '✓ 是' : '✗ 否'}</span>
            </div>
            <div class="result-item">
                <span class="result-label">特殊類型</span>
                <span class="result-value">${specialTypes.length > 0 ? specialTypes.join(', ') : '無'}</span>
            </div>
            <div class="result-item">
                <span class="result-label">質因子數量</span>
                <span class="result-value">${payload.factors.length}</span>
            </div>
            <div class="result-item">
                <span class="result-label">因子總數 τ(n)</span>
                <span class="result-value">${payload.divisorCount}</span>
            </div>
            <div class="result-item">
                <span class="result-label">歐拉函數 φ(n)</span>
                <span class="result-value code">${formatBigNumber(payload.phi)}</span>
            </div>
            <div class="result-item">
                <span class="result-label">計算時間</span>
                <span class="result-value">${formatTime(payload.time)}</span>
            </div>
        </div>
        <div class="factorization-section">
            <h4>質因數分解</h4>
            <div class="factorization-display compact">
                <span class="factors">${payload.factorization}</span>
            </div>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示批量結果
function displayBatchResult(payload) {
    resetUI();

    const container = elements.batchResult;
    container.classList.remove('hidden');

    const { results, stopped } = payload;
    const primeCount = results.filter(r => r.isPrime).length;

    container.innerHTML = `
        <h3 class="result-title">${stopped ? '⚠️ 批量分解（已停止）' : '✓ 批量分解結果'}</h3>
        <table class="result-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>數字</th>
                    <th>分解</th>
                    <th>因子數</th>
                    <th>時間</th>
                </tr>
            </thead>
            <tbody>
                ${results.map((r, i) => `
                    <tr class="${r.isPrime ? 'prime-row' : ''}">
                        <td>${i + 1}</td>
                        <td class="number-cell">${formatBigNumber(r.number)}</td>
                        <td class="factorization-cell">${r.isPrime ? '<span class="prime-badge">質數</span>' : r.factorization}</td>
                        <td>${r.factorCount}</td>
                        <td>${formatTime(r.time)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="batch-summary">
            共 ${results.length} 個數字，其中 ${primeCount} 個是質數
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示比較結果
function displayCompareResult(payload) {
    resetUI();

    const container = elements.compareResult;
    container.classList.remove('hidden');

    const { results } = payload;
    const validResults = results.filter(r => r.factorization && r.factorization !== '未找到');
    const fastest = validResults.length > 0 ?
        validResults.reduce((a, b) => a.time < b.time ? a : b) : null;

    container.innerHTML = `
        <h3 class="result-title">⚡ 演算法比較結果</h3>
        <div class="problem-statement">
            <p>分解目標：${formatBigNumber(payload.number)}</p>
        </div>
        <table class="result-table compare-table">
            <thead>
                <tr>
                    <th>方法</th>
                    <th>複雜度</th>
                    <th>結果</th>
                    <th>時間</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(r => `
                    <tr class="${fastest && r.method === fastest.method && r.factorization !== '未找到' ? 'fastest' : ''} ${r.factorization === '未找到' ? 'not-found' : ''}">
                        <td>
                            ${r.method}
                            ${fastest && r.method === fastest.method && r.factorization !== '未找到' ? '<span class="badge-fastest">最快</span>' : ''}
                        </td>
                        <td class="complexity">${r.complexity}</td>
                        <td class="factorization-cell">${r.factorization}</td>
                        <td class="time-value">${formatTime(r.time)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="comparison-analysis">
            <h4>分析</h4>
            <ul>
                <li><strong>試除法</strong>：簡單可靠，適合小數字或有小因子的數</li>
                <li><strong>Pollard's Rho</strong>：隨機算法，對大多數數字有效</li>
                <li><strong>Fermat</strong>：適合兩個因子接近的數（RSA 弱金鑰）</li>
            </ul>
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 分解數字
function factorizeNumber() {
    hideError();

    const number = elements.number.value.trim();
    const method = elements.method.value;

    if (!number) {
        showError('請輸入要分解的數字');
        return;
    }

    elements.factorizeBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressBar.style.width = '0%';
    elements.progressText.textContent = '分解中...';

    worker.postMessage({
        type: 'FACTORIZE',
        payload: { number, method }
    });
}

// RSA 攻擊
function attackRSA() {
    hideError();

    const n = elements.rsaN.value.trim();
    const e = elements.rsaE.value.trim();
    const ciphertext = elements.rsaCiphertext.value.trim();

    if (!n || !e) {
        showError('請填寫 N 和 e');
        return;
    }

    elements.rsaAttackBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '嘗試破解 RSA...';

    worker.postMessage({
        type: 'RSA_ATTACK',
        payload: { n, e, ciphertext: ciphertext || null }
    });
}

// 數字分析
function analyzeNum() {
    hideError();

    const number = elements.analyzeNumber.value.trim();

    if (!number) {
        showError('請輸入要分析的數字');
        return;
    }

    elements.analyzeBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '分析中...';

    worker.postMessage({
        type: 'ANALYZE_NUMBER',
        payload: { number }
    });
}

// 批量分解
function factorizeBatch() {
    hideError();

    const input = elements.batchInput.value.trim();
    if (!input) {
        showError('請輸入要分解的數字');
        return;
    }

    const numbers = input.split('\n')
        .map(line => line.trim())
        .filter(line => line && /^\d+$/.test(line));

    if (numbers.length === 0) {
        showError('請輸入有效的數字（每行一個）');
        return;
    }

    elements.batchBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '批量分解中...';

    worker.postMessage({
        type: 'FACTORIZE_BATCH',
        payload: { numbers }
    });
}

// 比較方法
function compareMethods() {
    hideError();

    const number = elements.compareNumber.value.trim();

    if (!number) {
        showError('請輸入要分解的數字');
        return;
    }

    elements.compareBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '比較演算法中...';

    worker.postMessage({
        type: 'COMPARE_METHODS',
        payload: { number }
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
    // 數字預設
    document.querySelectorAll('.preset-btn[data-n]').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.number.value = btn.dataset.n;
        });
    });

    // RSA 預設
    document.querySelectorAll('.rsa-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.rsaN.value = btn.dataset.n;
            elements.rsaE.value = btn.dataset.e;
            if (btn.dataset.c) {
                elements.rsaCiphertext.value = btn.dataset.c;
            }
        });
    });

    // 分析預設
    document.querySelectorAll('.analyze-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.analyzeNumber.value = btn.dataset.n;
        });
    });
}

// 綁定事件
function bindEvents() {
    elements.factorizeBtn.addEventListener('click', factorizeNumber);
    elements.stopBtn.addEventListener('click', stopCalculation);
    elements.rsaAttackBtn.addEventListener('click', attackRSA);
    elements.analyzeBtn.addEventListener('click', analyzeNum);
    elements.batchBtn.addEventListener('click', factorizeBatch);
    elements.compareBtn.addEventListener('click', compareMethods);

    // Enter 鍵觸發
    elements.number.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') factorizeNumber();
    });

    elements.analyzeNumber.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') analyzeNum();
    });

    setupPresets();
}

// 初始化
function init() {
    initWorker();
    bindEvents();
    console.log('質因數分解器已初始化');
}

// 啟動
init();
