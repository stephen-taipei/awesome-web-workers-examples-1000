/**
 * Main Thread: Armstrong Number Calculator
 */

const calcTypeSelect = document.getElementById('calcType');
const singleGroup = document.getElementById('singleGroup');
const numberInput = document.getElementById('numberInput');
const digitsGroup = document.getElementById('digitsGroup');
const digitsInput = document.getElementById('digitsInput');
const rangeGroup = document.getElementById('rangeGroup');
const startInput = document.getElementById('startInput');
const endInput = document.getElementById('endInput');
const maxDigitsGroup = document.getElementById('maxDigitsGroup');
const maxDigitsInput = document.getElementById('maxDigitsInput');
const calculateBtn = document.getElementById('calculateBtn');
const cancelBtn = document.getElementById('cancelBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultContainer = document.getElementById('resultContainer');
const resultContent = document.getElementById('resultContent');
const executionTime = document.getElementById('executionTime');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');

let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        const data = e.data;
        if (data.type === 'progress') updateProgress(data.current, data.total, data.percentage);
        else if (data.type === 'result') displayResult(data);
        else if (data.type === 'error') displayError(data.message);
    };
    worker.onerror = (err) => { displayError(err.message); resetUI(); };
}

function updateProgress(current, total, pct) {
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `Processing: ${current.toLocaleString()}/${total.toLocaleString()} (${pct}%)`;
}

function displayResult(data) {
    hideError();
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    executionTime.textContent = `${data.executionTime} ms`;

    const r = data.result;
    let html = '<div class="result-armstrong">';

    switch (data.calculationType) {
        case 'check':
            html += `<h4>Armstrong Number Check</h4>`;
            html += `<div class="check-result ${r.isArmstrong ? 'is-armstrong' : 'not-armstrong'}">`;
            html += `<span class="status">${r.isArmstrong ? 'YES' : 'NO'}</span>`;
            html += `</div>`;
            html += `<div class="formula-box">${r.formula} = ${r.digitPowerSum}</div>`;
            html += '<h5>Breakdown</h5>';
            html += '<table class="result-table"><thead><tr><th>Digit</th><th>Power</th><th>Value</th></tr></thead><tbody>';
            r.breakdown.forEach(b => {
                html += `<tr><td>${b.digit}</td><td>${b.digit}^${b.power}</td><td class="number-value">${b.value}</td></tr>`;
            });
            html += `<tr class="total-row"><td colspan="2"><strong>Sum</strong></td><td class="number-value"><strong>${r.digitPowerSum}</strong></td></tr>`;
            html += '</tbody></table>';
            html += `<p class="comparison">${r.number} ${r.isArmstrong ? '=' : '≠'} ${r.digitPowerSum}</p>`;
            break;

        case 'findByDigits':
            html += `<h4>Armstrong Numbers (${r.digits} digits)</h4>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Digit Count</td><td>${r.digits}</td></tr>`;
            html += `<tr><td>Range</td><td>${r.range.start} - ${r.range.end}</td></tr>`;
            html += `<tr><td>Found</td><td class="highlight">${r.count}</td></tr>`;
            html += '</tbody></table>';
            if (r.numbers.length > 0) {
                html += '<h5>Armstrong Numbers</h5><div class="armstrong-list">';
                r.numbers.forEach(n => {
                    html += `<span class="armstrong-item">${n}</span>`;
                });
                html += '</div>';
            } else {
                html += '<p class="no-results">No Armstrong numbers found with this digit count.</p>';
            }
            break;

        case 'findInRange':
            html += '<h4>Armstrong Numbers in Range</h4>';
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Range</td><td>${r.range.start} - ${r.range.end}</td></tr>`;
            html += `<tr><td>Total Checked</td><td>${r.total.toLocaleString()}</td></tr>`;
            html += `<tr><td>Found</td><td class="highlight">${r.count}</td></tr>`;
            html += '</tbody></table>';
            if (r.numbers.length > 0) {
                html += '<h5>Armstrong Numbers</h5>';
                html += '<table class="result-table"><thead><tr><th>Number</th><th>Digits</th></tr></thead><tbody>';
                r.numbers.forEach(n => {
                    html += `<tr><td class="number-value">${n.number}</td><td>${n.digits}</td></tr>`;
                });
                html += '</tbody></table>';
            }
            break;

        case 'allKnown':
            html += `<h4>All Armstrong Numbers (1-${r.maxDigits} digits)</h4>`;
            html += `<p class="total-count">Total: <strong>${r.totalCount}</strong> Armstrong numbers</p>`;
            html += '<div class="by-digits">';
            for (const [digits, numbers] of Object.entries(r.byDigits)) {
                html += `<div class="digit-group"><h5>${digits}-digit (${numbers.length})</h5>`;
                html += '<div class="armstrong-list">';
                numbers.forEach(n => {
                    html += `<span class="armstrong-item">${n}</span>`;
                });
                html += '</div></div>';
            }
            html += '</div>';
            break;

        case 'pluperfect':
            html += '<h4>Pluperfect Digital Invariants</h4>';
            html += '<p class="description">Numbers where sum of k-th powers equals the number (k ≠ digit count)</p>';
            html += `<p class="total-count">Found: <strong>${r.count}</strong></p>`;
            if (r.numbers.length > 0) {
                html += '<table class="result-table"><thead><tr><th>Number</th><th>Power</th><th>Digits</th></tr></thead><tbody>';
                r.numbers.forEach(n => {
                    html += `<tr><td class="number-value">${n.number}</td><td>${n.power}</td><td>${n.numDigits}</td></tr>`;
                });
                html += '</tbody></table>';
            }
            break;
    }

    html += '</div>';
    resultContent.innerHTML = html;
    resetUI();
}

function displayError(msg) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = msg;
    resetUI();
}

function hideError() { errorContainer.classList.add('hidden'); }

function resetUI() {
    calculateBtn.disabled = false;
    cancelBtn.classList.add('hidden');
    document.querySelectorAll('input, select').forEach(el => el.disabled = false);
}

function setCalculatingUI() {
    calculateBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    document.querySelectorAll('input, select').forEach(el => el.disabled = true);
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    hideError();
    progressBar.style.width = '0%';
}

function updateInputUI() {
    const type = calcTypeSelect.value;
    singleGroup.classList.toggle('hidden', type !== 'check');
    digitsGroup.classList.toggle('hidden', type !== 'findByDigits');
    rangeGroup.classList.toggle('hidden', type !== 'findInRange');
    maxDigitsGroup.classList.toggle('hidden', type !== 'allKnown' && type !== 'pluperfect');
}

function startCalculation() {
    const type = calcTypeSelect.value;
    setCalculatingUI();
    initWorker();

    switch (type) {
        case 'check':
            const num = numberInput.value.trim();
            if (!num || !/^\d+$/.test(num)) { displayError('Enter a valid positive integer'); return; }
            worker.postMessage({ type: 'check', number: num });
            break;

        case 'findByDigits':
            const digits = parseInt(digitsInput.value);
            if (digits < 1 || digits > 15) { displayError('Digits must be between 1 and 15'); return; }
            worker.postMessage({ type: 'findByDigits', digits });
            break;

        case 'findInRange':
            const start = startInput.value.trim();
            const end = endInput.value.trim();
            if (!start || !end) { displayError('Enter valid range'); return; }
            if (BigInt(end) - BigInt(start) > 10000000n) { displayError('Range too large (max 10M)'); return; }
            worker.postMessage({ type: 'findInRange', start, end });
            break;

        case 'allKnown':
            const maxDigits = parseInt(maxDigitsInput.value);
            if (maxDigits < 1 || maxDigits > 15) { displayError('Max digits must be between 1 and 15'); return; }
            worker.postMessage({ type: 'allKnown', maxDigits });
            break;

        case 'pluperfect':
            const maxD = parseInt(maxDigitsInput.value);
            if (maxD < 1 || maxD > 8) { displayError('Max digits must be between 1 and 8'); return; }
            worker.postMessage({ type: 'pluperfect', maxDigits: maxD });
            break;
    }
}

function cancelCalculation() {
    if (worker) { worker.terminate(); worker = null; }
    resetUI();
    progressContainer.classList.add('hidden');
}

calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);
calcTypeSelect.addEventListener('change', updateInputUI);
document.addEventListener('DOMContentLoaded', updateInputUI);
