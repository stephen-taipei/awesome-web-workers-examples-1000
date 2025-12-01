/**
 * 主執行緒：離散對數計算
 *
 * 負責 UI 互動與 Worker 通訊
 */

// Worker 實例
let worker = null;

// DOM 元素
const elements = {
    // 基本計算
    generator: document.getElementById('generator'),
    target: document.getElementById('target'),
    modulus: document.getElementById('modulus'),
    method: document.getElementById('method'),
    calculateBtn: document.getElementById('calculate-btn'),
    stopBtn: document.getElementById('stop-btn'),
    errorMessage: document.getElementById('error-message'),

    // DH 攻擊
    dhPrime: document.getElementById('dh-prime'),
    dhGenerator: document.getElementById('dh-generator'),
    dhAlicePublic: document.getElementById('dh-alice-public'),
    dhBobPublic: document.getElementById('dh-bob-public'),
    dhAttackBtn: document.getElementById('dh-attack-btn'),

    // 批量計算
    batchInput: document.getElementById('batch-input'),
    batchBtn: document.getElementById('batch-btn'),

    // 方法比較
    compareGenerator: document.getElementById('compare-generator'),
    compareTarget: document.getElementById('compare-target'),
    compareModulus: document.getElementById('compare-modulus'),
    compareBtn: document.getElementById('compare-btn'),

    // 元素階
    orderElement: document.getElementById('order-element'),
    orderModulus: document.getElementById('order-modulus'),
    orderBtn: document.getElementById('order-btn'),

    // 進度
    progressBar: document.getElementById('progress-bar'),
    progressText: document.getElementById('progress-text'),

    // 結果區域
    calculateResult: document.getElementById('calculate-result'),
    dhResult: document.getElementById('dh-result'),
    batchResult: document.getElementById('batch-result'),
    compareResult: document.getElementById('compare-result'),
    orderResult: document.getElementById('order-result')
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
            case 'CALCULATE_RESULT':
                displayCalculateResult(payload);
                break;
            case 'BSGS_RESULT':
                displayBsgsResult(payload);
                break;
            case 'POLLARD_RESULT':
                displayPollardResult(payload);
                break;
            case 'DH_ATTACK_RESULT':
                displayDhAttackResult(payload);
                break;
            case 'BATCH_RESULT':
                displayBatchResult(payload);
                break;
            case 'COMPARE_RESULT':
                displayCompareResult(payload);
                break;
            case 'ORDER_RESULT':
                displayOrderResult(payload);
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
        let phaseText = '';
        switch (phase) {
            case 'baby-step':
                phaseText = 'Baby-step 階段';
                break;
            case 'giant-step':
                phaseText = 'Giant-step 階段';
                break;
            case 'attacking-alice':
                phaseText = '破解 Alice 私鑰';
                break;
            case 'attacking-bob':
                phaseText = '破解 Bob 私鑰';
                break;
            case 'brute-force':
                phaseText = '暴力搜尋';
                break;
            case 'BSGS':
                phaseText = 'Baby-step Giant-step';
                break;
            case 'Pollard-Rho':
                phaseText = "Pollard's Rho";
                break;
            default:
                phaseText = phase;
        }

        if (current !== undefined && total !== undefined) {
            elements.progressText.textContent = `${phaseText}: ${current.toLocaleString()} / ${total.toLocaleString()}`;
        } else {
            elements.progressText.textContent = phaseText;
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
    elements.calculateBtn.disabled = false;
    elements.stopBtn.disabled = true;
    elements.dhAttackBtn.disabled = false;
    elements.batchBtn.disabled = false;
    elements.compareBtn.disabled = false;
    elements.orderBtn.disabled = false;
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

// 顯示計算結果
function displayCalculateResult(payload) {
    resetUI();

    const container = elements.calculateResult;
    container.classList.remove('hidden');

    if (payload.result !== null) {
        container.innerHTML = `
            <h3 class="result-title">✓ 離散對數結果</h3>
            <div class="result-grid">
                <div class="result-item">
                    <span class="result-label">問題</span>
                    <span class="result-value formula">log<sub>${payload.generator}</sub>(${payload.target}) mod ${payload.modulus}</span>
                </div>
                <div class="result-item highlight">
                    <span class="result-label">解答 (x)</span>
                    <span class="result-value large">${payload.result}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">驗證</span>
                    <span class="result-value code">${payload.verification}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">使用方法</span>
                    <span class="result-value">${payload.method}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">計算時間</span>
                    <span class="result-value">${formatTime(payload.time)}</span>
                </div>
                ${payload.iterations ? `
                <div class="result-item">
                    <span class="result-label">迭代/表格大小</span>
                    <span class="result-value">${payload.iterations.toLocaleString()}</span>
                </div>
                ` : ''}
            </div>
            <div class="explanation">
                <p><strong>含義：</strong>${payload.generator}<sup>${payload.result}</sup> ≡ ${payload.target} (mod ${payload.modulus})</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <h3 class="result-title warning">✗ 未找到解</h3>
            <div class="result-grid">
                <div class="result-item">
                    <span class="result-label">問題</span>
                    <span class="result-value">log<sub>${payload.generator}</sub>(${payload.target}) mod ${payload.modulus}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">原因</span>
                    <span class="result-value">${payload.reason === 'stopped' ? '使用者停止' : '在搜尋範圍內未找到'}</span>
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
            <div class="explanation warning-text">
                <p>可能原因：目標值不在生成元產生的子群中，或需要更多計算時間。</p>
            </div>
        `;
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示 DH 攻擊結果
function displayDhAttackResult(payload) {
    resetUI();

    const container = elements.dhResult;
    container.classList.remove('hidden');

    if (payload.success) {
        container.innerHTML = `
            <h3 class="result-title danger">⚠️ DH 金鑰交換已被破解！</h3>
            <div class="attack-timeline">
                ${payload.steps.map((step, i) => `
                    <div class="attack-step">
                        <span class="step-number">${i + 1}</span>
                        <span class="step-text">${step}</span>
                    </div>
                `).join('')}
            </div>
            <div class="result-grid">
                <div class="result-item danger-highlight">
                    <span class="result-label">Alice 私鑰</span>
                    <span class="result-value large">${payload.alicePrivate}</span>
                </div>
                <div class="result-item danger-highlight">
                    <span class="result-label">Bob 私鑰</span>
                    <span class="result-value large">${payload.bobPrivate}</span>
                </div>
                <div class="result-item danger-highlight">
                    <span class="result-label">共享密鑰</span>
                    <span class="result-value large">${payload.sharedKey}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">驗證</span>
                    <span class="result-value">${payload.verification ? '✓ 正確' : '✗ 錯誤'}</span>
                </div>
                <div class="result-item">
                    <span class="result-label">破解時間</span>
                    <span class="result-value">${formatTime(payload.time)}</span>
                </div>
            </div>
            <div class="warning-box">
                <p><strong>安全警告：</strong>這展示了為什麼 DH 需要使用足夠大的質數。實際應用中應使用 2048 位以上的質數。</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <h3 class="result-title">🔒 破解失敗</h3>
            <div class="result-grid">
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
                <p>質數夠大時，離散對數問題變得不可計算，這正是 DH 安全性的基礎。</p>
            </div>
        `;
    }

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示批量結果
function displayBatchResult(payload) {
    resetUI();

    const container = elements.batchResult;
    container.classList.remove('hidden');

    const { results, stopped } = payload;

    container.innerHTML = `
        <h3 class="result-title">${stopped ? '⚠️ 批量計算（已停止）' : '✓ 批量計算結果'}</h3>
        <table class="result-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>離散對數問題</th>
                    <th>結果 (x)</th>
                    <th>時間</th>
                </tr>
            </thead>
            <tbody>
                ${results.map((r, i) => `
                    <tr class="${r.result === 'not found' ? 'not-found' : ''}">
                        <td>${i + 1}</td>
                        <td class="formula">${r.input}</td>
                        <td class="result-value">${r.result}</td>
                        <td>${formatTime(r.time)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        <div class="batch-summary">
            找到 ${results.filter(r => r.result !== 'not found').length} / ${results.length} 個解
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示比較結果
function displayCompareResult(payload) {
    resetUI();

    const container = elements.compareResult;
    container.classList.remove('hidden');

    const { results, generator, target, modulus } = payload;

    // 找出最快的方法
    const foundResults = results.filter(r => r.found);
    const fastest = foundResults.length > 0 ?
        foundResults.reduce((a, b) => a.time < b.time ? a : b) : null;

    container.innerHTML = `
        <h3 class="result-title">⚡ 演算法比較結果</h3>
        <div class="problem-statement">
            <p>問題：log<sub>${generator}</sub>(${target}) mod ${modulus}</p>
        </div>
        <table class="result-table compare-table">
            <thead>
                <tr>
                    <th>方法</th>
                    <th>複雜度</th>
                    <th>結果</th>
                    <th>時間</th>
                    <th>詳情</th>
                </tr>
            </thead>
            <tbody>
                ${results.map(r => `
                    <tr class="${fastest && r.method === fastest.method && r.found ? 'fastest' : ''} ${!r.found ? 'not-found' : ''}">
                        <td>
                            ${r.method}
                            ${fastest && r.method === fastest.method && r.found ? '<span class="badge-fastest">最快</span>' : ''}
                        </td>
                        <td class="complexity">${r.complexity}</td>
                        <td class="result-value">${r.found ? r.result : '未找到'}</td>
                        <td class="time-value">${formatTime(r.time)}</td>
                        <td class="detail">
                            ${r.iterations ? `迭代: ${r.iterations.toLocaleString()}` : ''}
                            ${r.tableSize ? `表格: ${r.tableSize.toLocaleString()}` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        ${fastest ? `
        <div class="comparison-analysis">
            <h4>分析</h4>
            <ul>
                <li>暴力法適合小模數，但對大數無效</li>
                <li>BSGS 以空間換時間，需要 O(√n) 記憶體</li>
                <li>Pollard's Rho 只需 O(1) 空間，但帶有隨機性</li>
            </ul>
        </div>
        ` : ''}
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 顯示元素階結果
function displayOrderResult(payload) {
    resetUI();

    const container = elements.orderResult;
    container.classList.remove('hidden');

    if (payload.found === false) {
        container.innerHTML = `
            <h3 class="result-title warning">計算已停止</h3>
        `;
        return;
    }

    container.innerHTML = `
        <h3 class="result-title">✓ 元素階計算結果</h3>
        <div class="result-grid">
            <div class="result-item">
                <span class="result-label">元素</span>
                <span class="result-value">${payload.element}</span>
            </div>
            <div class="result-item">
                <span class="result-label">模數</span>
                <span class="result-value">${payload.modulus}</span>
            </div>
            <div class="result-item highlight">
                <span class="result-label">階 (ord)</span>
                <span class="result-value large">${payload.order}</span>
            </div>
            <div class="result-item">
                <span class="result-label">φ(p) = p-1</span>
                <span class="result-value">${payload.phiP}</span>
            </div>
            <div class="result-item ${payload.isPrimitiveRoot ? 'primitive-root' : ''}">
                <span class="result-label">原根?</span>
                <span class="result-value">${payload.isPrimitiveRoot ? '✓ 是原根' : '✗ 不是原根'}</span>
            </div>
            <div class="result-item">
                <span class="result-label">計算時間</span>
                <span class="result-value">${formatTime(payload.time)}</span>
            </div>
        </div>
        <div class="powers-table">
            <h4>冪次序列 (${payload.element}<sup>k</sup> mod ${payload.modulus})</h4>
            <div class="powers-grid">
                ${payload.powers.map(p => `
                    <div class="power-item">
                        <span class="power-exp">${payload.element}<sup>${p.exp}</sup></span>
                        <span class="power-eq">=</span>
                        <span class="power-val">${p.value}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <div class="explanation">
            <p><strong>含義：</strong>${payload.element}<sup>${payload.order}</sup> ≡ 1 (mod ${payload.modulus})，且這是使等式成立的最小正整數。</p>
            ${payload.isPrimitiveRoot ? `<p><strong>原根：</strong>因為階等於 φ(${payload.modulus}) = ${payload.phiP}，所以 ${payload.element} 是模 ${payload.modulus} 的原根，可以生成整個乘法群。</p>` : ''}
        </div>
    `;

    container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 計算離散對數
function calculate() {
    hideError();

    const generator = elements.generator.value.trim();
    const target = elements.target.value.trim();
    const modulus = elements.modulus.value.trim();
    const method = elements.method.value;

    if (!generator || !target || !modulus) {
        showError('請填寫所有欄位');
        return;
    }

    elements.calculateBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressBar.style.width = '0%';
    elements.progressText.textContent = '計算中...';

    worker.postMessage({
        type: 'CALCULATE',
        payload: { generator, target, modulus, method }
    });
}

// DH 攻擊
function attackDH() {
    hideError();

    const prime = elements.dhPrime.value.trim();
    const generator = elements.dhGenerator.value.trim();
    const alicePublic = elements.dhAlicePublic.value.trim();
    const bobPublic = elements.dhBobPublic.value.trim();

    if (!prime || !generator || !alicePublic || !bobPublic) {
        showError('請填寫所有 DH 參數');
        return;
    }

    elements.dhAttackBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '正在嘗試破解 DH...';

    worker.postMessage({
        type: 'DH_ATTACK',
        payload: { prime, generator, alicePublic, bobPublic }
    });
}

// 批量計算
function calculateBatch() {
    hideError();

    const input = elements.batchInput.value.trim();
    if (!input) {
        showError('請輸入計算式');
        return;
    }

    // 解析輸入 (格式: log_g(h) mod p 或 g h p)
    const lines = input.split('\n').filter(line => line.trim());
    const calculations = [];

    for (const line of lines) {
        // 嘗試匹配 log_g(h) mod p 格式
        let match = line.match(/log[_]?(\d+)\((\d+)\)\s*mod\s*(\d+)/i);
        if (match) {
            calculations.push({
                generator: match[1],
                target: match[2],
                modulus: match[3]
            });
            continue;
        }

        // 嘗試匹配 g h p 格式（空格或逗號分隔）
        match = line.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
        if (match) {
            calculations.push({
                generator: match[1],
                target: match[2],
                modulus: match[3]
            });
            continue;
        }
    }

    if (calculations.length === 0) {
        showError('無法解析輸入格式。請使用 "log_g(h) mod p" 或 "g h p" 格式');
        return;
    }

    elements.batchBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '批量計算中...';

    worker.postMessage({
        type: 'CALCULATE_BATCH',
        payload: { calculations }
    });
}

// 比較方法
function compareMethods() {
    hideError();

    const generator = elements.compareGenerator.value.trim();
    const target = elements.compareTarget.value.trim();
    const modulus = elements.compareModulus.value.trim();

    if (!generator || !target || !modulus) {
        showError('請填寫所有欄位');
        return;
    }

    elements.compareBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '比較演算法中...';

    worker.postMessage({
        type: 'COMPARE_METHODS',
        payload: { generator, target, modulus }
    });
}

// 計算元素階
function findOrder() {
    hideError();

    const element = elements.orderElement.value.trim();
    const modulus = elements.orderModulus.value.trim();

    if (!element || !modulus) {
        showError('請填寫所有欄位');
        return;
    }

    elements.orderBtn.disabled = true;
    elements.stopBtn.disabled = false;
    elements.progressText.textContent = '計算元素階...';

    worker.postMessage({
        type: 'FIND_ORDER',
        payload: { element, modulus }
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
    // 模數預設
    document.querySelectorAll('.preset-btn[data-mod]').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.modulus.value = btn.dataset.mod;
        });
    });

    // DH 預設
    document.querySelectorAll('.dh-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.dhPrime.value = btn.dataset.p;
            elements.dhGenerator.value = btn.dataset.g;

            // 模擬一些公鑰
            const p = BigInt(btn.dataset.p);
            const g = BigInt(btn.dataset.g);
            const a = BigInt(Math.floor(Math.random() * (Number(p) - 2)) + 2);
            const b = BigInt(Math.floor(Math.random() * (Number(p) - 2)) + 2);

            // 簡單模冪
            function quickPow(base, exp, mod) {
                let result = 1n;
                base = base % mod;
                while (exp > 0n) {
                    if (exp & 1n) result = (result * base) % mod;
                    exp = exp >> 1n;
                    base = (base * base) % mod;
                }
                return result;
            }

            elements.dhAlicePublic.value = quickPow(g, a, p).toString();
            elements.dhBobPublic.value = quickPow(g, b, p).toString();
        });
    });

    // 範例問題預設
    document.querySelectorAll('.problem-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.generator.value = btn.dataset.g;
            elements.target.value = btn.dataset.h;
            elements.modulus.value = btn.dataset.p;
        });
    });

    // 元素階預設
    document.querySelectorAll('.order-preset').forEach(btn => {
        btn.addEventListener('click', () => {
            elements.orderElement.value = btn.dataset.a;
            elements.orderModulus.value = btn.dataset.p;
        });
    });
}

// 綁定事件
function bindEvents() {
    elements.calculateBtn.addEventListener('click', calculate);
    elements.stopBtn.addEventListener('click', stopCalculation);
    elements.dhAttackBtn.addEventListener('click', attackDH);
    elements.batchBtn.addEventListener('click', calculateBatch);
    elements.compareBtn.addEventListener('click', compareMethods);
    elements.orderBtn.addEventListener('click', findOrder);

    // Enter 鍵觸發計算
    [elements.generator, elements.target, elements.modulus].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') calculate();
        });
    });

    setupPresets();
}

// 初始化
function init() {
    initWorker();
    bindEvents();
    console.log('離散對數計算器已初始化');
}

// 啟動
init();
