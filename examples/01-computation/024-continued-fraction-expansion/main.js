/**
 * Main Thread: Continued Fraction Expansion
 */

const inputTypeSelect = document.getElementById('inputType');
const decimalGroup = document.getElementById('decimalGroup');
const decimalInput = document.getElementById('decimalInput');
const rationalGroup = document.getElementById('rationalGroup');
const numeratorInput = document.getElementById('numeratorInput');
const denominatorInput = document.getElementById('denominatorInput');
const constantGroup = document.getElementById('constantGroup');
const constantSelect = document.getElementById('constantSelect');
const termsInput = document.getElementById('termsInput');
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
    progressText.textContent = `Processing: ${current}/${total} (${pct}%)`;
}

function displayResult(data) {
    hideError();
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    executionTime.textContent = `${data.executionTime} ms`;

    const r = data.result;
    let html = '<div class="result-cf">';

    // Display CF notation
    const cfDisplay = r.cf.slice(0, 20).join(', ') + (r.cf.length > 20 ? ', ...' : '');
    html += `<h4>Continued Fraction</h4>`;
    html += `<div class="cf-notation">[${r.cf[0]}; ${r.cf.slice(1, 20).join(', ')}${r.cf.length > 20 ? ', ...' : ''}]</div>`;
    html += `<p class="cf-length">Terms: ${r.cf.length}</p>`;

    if (r.pattern) {
        html += `<p class="cf-pattern">Pattern: ${r.pattern}</p>`;
    }

    // Display convergents
    if (r.convergents && r.convergents.length > 0) {
        html += '<h4>Convergents (Rational Approximations)</h4>';
        html += '<table class="result-table"><thead><tr><th>n</th><th>p/q</th><th>Value</th></tr></thead><tbody>';
        r.convergents.slice(0, 15).forEach(c => {
            html += `<tr><td>${c.index}</td><td>${c.p}/${c.q}</td><td>${c.value.toFixed(10)}</td></tr>`;
        });
        html += '</tbody></table>';
    }

    if (r.trueValue !== undefined) {
        html += `<p class="true-value">True value: ${r.trueValue}</p>`;
    }
    if (r.error !== undefined) {
        html += `<p class="error-value">Error: ${r.error.toExponential(6)}</p>`;
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
    const type = inputTypeSelect.value;
    decimalGroup.classList.toggle('hidden', type !== 'decimal');
    rationalGroup.classList.toggle('hidden', type !== 'rational');
    constantGroup.classList.toggle('hidden', type !== 'constant');
}

function startCalculation() {
    const type = inputTypeSelect.value;
    const terms = parseInt(termsInput.value) || 30;

    setCalculatingUI();
    initWorker();

    if (type === 'decimal') {
        const value = parseFloat(decimalInput.value);
        if (isNaN(value)) { displayError('Invalid decimal'); return; }
        worker.postMessage({ type: 'decimal', value, maxTerms: terms });
    } else if (type === 'rational') {
        const num = numeratorInput.value;
        const den = denominatorInput.value;
        if (!num || !den || den === '0') { displayError('Invalid fraction'); return; }
        worker.postMessage({ type: 'rational', numerator: num, denominator: den, maxTerms: terms });
    } else {
        worker.postMessage({ type: 'constant', constant: constantSelect.value, terms });
    }
}

function cancelCalculation() {
    if (worker) { worker.terminate(); worker = null; }
    resetUI();
    progressContainer.classList.add('hidden');
}

calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);
inputTypeSelect.addEventListener('change', updateInputUI);
document.addEventListener('DOMContentLoaded', updateInputUI);
