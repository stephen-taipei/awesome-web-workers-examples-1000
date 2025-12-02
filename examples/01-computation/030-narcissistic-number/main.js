/**
 * Main Thread: Narcissistic Number Search
 */

const calcTypeSelect = document.getElementById('calcType');
const powerGroup = document.getElementById('powerGroup');
const powerInput = document.getElementById('powerInput');
const maxDigitsGroup = document.getElementById('maxDigitsGroup');
const maxDigitsInput = document.getElementById('maxDigitsInput');
const singleGroup = document.getElementById('singleGroup');
const numberInput = document.getElementById('numberInput');
const verifyPowerInput = document.getElementById('verifyPowerInput');
const maxNumberGroup = document.getElementById('maxNumberGroup');
const maxNumberInput = document.getElementById('maxNumberInput');
const maxPowerInput = document.getElementById('maxPowerInput');
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
    let html = '<div class="result-narcissistic">';

    switch (data.calculationType) {
        case 'searchByPower':
            html += `<h4>Narcissistic Numbers (Power ${r.power})</h4>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Power</td><td>${r.power}</td></tr>`;
            html += `<tr><td>Max Digits</td><td>${r.maxDigits}</td></tr>`;
            html += `<tr><td>Found</td><td class="highlight">${r.count}</td></tr>`;
            html += '</tbody></table>';
            if (r.numbers.length > 0) {
                html += '<h5>Numbers Found</h5><div class="number-list">';
                r.numbers.forEach(n => {
                    html += `<span class="number-item" title="${n.digits} digits">${n.number}</span>`;
                });
                html += '</div>';
            }
            break;

        case 'searchAllPowers':
            html += '<h4>Numbers Narcissistic for Some Power</h4>';
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Max Number</td><td>${r.maxNumber.toLocaleString()}</td></tr>`;
            html += `<tr><td>Max Power</td><td>${r.maxPower}</td></tr>`;
            html += `<tr><td>Found</td><td class="highlight">${r.count}</td></tr>`;
            html += '</tbody></table>';
            if (r.numbers.length > 0) {
                html += '<h5>Numbers and Their Powers</h5>';
                html += '<table class="result-table"><thead><tr><th>Number</th><th>Powers</th></tr></thead><tbody>';
                r.numbers.slice(0, 100).forEach(n => {
                    html += `<tr><td class="number-value">${n.number}</td><td>${n.powers.join(', ')}</td></tr>`;
                });
                html += '</tbody></table>';
                if (r.numbers.length > 100) html += '<p class="note">Showing first 100 results</p>';
            }
            break;

        case 'verify':
            html += '<h4>Verification Result</h4>';
            html += `<div class="check-result ${r.isNarcissistic ? 'is-narcissistic' : 'not-narcissistic'}">`;
            html += `<span class="status">${r.isNarcissistic ? 'YES' : 'NO'}</span>`;
            html += '</div>';
            html += `<div class="formula-box">${r.formula} = ${r.sum}</div>`;
            html += '<h5>Breakdown</h5>';
            html += '<table class="result-table"><thead><tr><th>Digit</th><th>Calculation</th><th>Value</th></tr></thead><tbody>';
            r.breakdown.forEach(b => {
                html += `<tr><td>${b.digit}</td><td>${b.digit}^${b.power}</td><td class="number-value">${b.value}</td></tr>`;
            });
            html += `<tr class="total-row"><td colspan="2"><strong>Sum</strong></td><td class="number-value"><strong>${r.sum}</strong></td></tr>`;
            html += '</tbody></table>';
            html += `<p class="comparison">${r.number} ${r.isNarcissistic ? '=' : '≠'} ${r.sum}</p>`;
            break;

        case 'munchausen':
            html += '<h4>Munchausen Numbers</h4>';
            html += `<p class="note">${r.note}</p>`;
            html += `<p class="total-count">Found: <strong>${r.count}</strong></p>`;
            if (r.numbers.length > 0) {
                r.numbers.forEach(n => {
                    html += `<div class="munchausen-item">`;
                    html += `<div class="number">${n.number}</div>`;
                    html += `<div class="formula">${n.formula}</div>`;
                    html += '</div>';
                });
            }
            break;

        case 'perfectDigital':
            html += '<h4>Perfect Digital Invariants (Non-Armstrong)</h4>';
            html += '<p class="description">Numbers where sum of k-th powers equals the number, but k ≠ digit count</p>';
            html += `<p class="total-count">Found: <strong>${r.count}</strong></p>`;
            if (r.numbers.length > 0) {
                html += '<table class="result-table"><thead><tr><th>Number</th><th>Power</th><th>Digits</th><th>Type</th></tr></thead><tbody>';
                r.numbers.forEach(n => {
                    html += `<tr><td class="number-value">${n.number}</td><td>${n.power}</td><td>${n.digitCount}</td><td>${n.type}</td></tr>`;
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
    powerGroup.classList.toggle('hidden', type !== 'searchByPower');
    maxDigitsGroup.classList.toggle('hidden', type === 'searchAllPowers' || type === 'verify');
    singleGroup.classList.toggle('hidden', type !== 'verify');
    maxNumberGroup.classList.toggle('hidden', type !== 'searchAllPowers');
}

function startCalculation() {
    const type = calcTypeSelect.value;
    setCalculatingUI();
    initWorker();

    switch (type) {
        case 'searchByPower':
            const power = parseInt(powerInput.value) || 3;
            const maxDigits = parseInt(maxDigitsInput.value) || 7;
            if (power < 1 || power > 20) { displayError('Power must be 1-20'); return; }
            if (maxDigits < 1 || maxDigits > 10) { displayError('Max digits must be 1-10'); return; }
            worker.postMessage({ type: 'searchByPower', power, maxDigits });
            break;

        case 'searchAllPowers':
            const maxNumber = parseInt(maxNumberInput.value) || 100000;
            const maxPower = parseInt(maxPowerInput.value) || 10;
            if (maxNumber > 1000000) { displayError('Max number limited to 1,000,000'); return; }
            worker.postMessage({ type: 'searchAllPowers', maxNumber, maxPower });
            break;

        case 'verify':
            const num = numberInput.value.trim();
            const verifyPower = parseInt(verifyPowerInput.value) || 3;
            if (!num || !/^\d+$/.test(num)) { displayError('Enter a valid positive integer'); return; }
            worker.postMessage({ type: 'verify', number: num, power: verifyPower });
            break;

        case 'munchausen':
            const maxD = parseInt(maxDigitsInput.value) || 7;
            if (maxD > 9) { displayError('Max 9 digits for Munchausen search'); return; }
            worker.postMessage({ type: 'munchausen', maxDigits: maxD });
            break;

        case 'perfectDigital':
            const maxDPDI = parseInt(maxDigitsInput.value) || 6;
            if (maxDPDI > 8) { displayError('Max 8 digits for PDI search'); return; }
            worker.postMessage({ type: 'perfectDigital', maxDigits: maxDPDI });
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
