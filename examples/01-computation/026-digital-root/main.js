/**
 * Main Thread: Digital Root Calculator
 */

const calcTypeSelect = document.getElementById('calcType');
const singleGroup = document.getElementById('singleGroup');
const numberInput = document.getElementById('numberInput');
const batchGroup = document.getElementById('batchGroup');
const startInput = document.getElementById('startInput');
const endInput = document.getElementById('endInput');
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
    let html = '<div class="result-dr">';

    switch (data.calculationType) {
        case 'single':
            html += `<h4>Digital Root of ${numberInput.value}</h4>`;
            html += `<div class="big-number">${r.digitalRoot}</div>`;
            html += `<p class="formula-check">Formula (mod 9): ${r.formula}</p>`;
            html += '<h5>Steps:</h5><ul class="steps-list">';
            r.steps.forEach((s, i) => {
                html += `<li>${i === 0 ? 'Original' : `Step ${i}`}: ${s.value}</li>`;
            });
            html += '</ul>';
            html += `<p class="step-count">Total steps: ${r.stepCount}</p>`;
            break;

        case 'multiplicative':
            html += `<h4>Multiplicative Digital Root</h4>`;
            html += `<div class="big-number">${r.multiplicativeRoot}</div>`;
            html += '<h5>Steps:</h5><ul class="steps-list">';
            r.steps.forEach((s, i) => {
                html += `<li>${i === 0 ? 'Original' : `Step ${i}`}: ${s.value}</li>`;
            });
            html += '</ul>';
            break;

        case 'persistence':
            html += '<h4>Persistence Analysis</h4>';
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Additive Root</td><td class="number-value">${r.additiveRoot}</td></tr>`;
            html += `<tr><td>Additive Persistence</td><td class="number-value">${r.additive}</td></tr>`;
            html += `<tr><td>Multiplicative Root</td><td class="number-value">${r.multiplicativeRoot}</td></tr>`;
            html += `<tr><td>Multiplicative Persistence</td><td class="number-value">${r.multiplicative}</td></tr>`;
            html += '</tbody></table>';
            break;

        case 'batch':
            html += '<h4>Digital Root Distribution</h4>';
            html += '<div class="distribution">';
            for (let i = 1; i <= 9; i++) {
                const count = r.distribution[i];
                const pct = ((count / r.total) * 100).toFixed(1);
                html += `<div class="dist-bar"><span class="label">${i}</span><div class="bar" style="width:${pct}%"></div><span class="value">${pct}%</span></div>`;
            }
            html += '</div>';
            html += `<p class="total-count">Total numbers: ${r.total.toLocaleString()}</p>`;
            break;

        case 'highPersistence':
            html += '<h4>Numbers with High Multiplicative Persistence</h4>';
            html += '<table class="result-table"><thead><tr><th>Number</th><th>Persistence</th></tr></thead><tbody>';
            r.forEach(item => {
                html += `<tr><td class="number-value">${item.n}</td><td>${item.persistence}</td></tr>`;
            });
            html += '</tbody></table>';
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
    singleGroup.classList.toggle('hidden', type === 'batch');
    batchGroup.classList.toggle('hidden', type !== 'batch');
}

function startCalculation() {
    const type = calcTypeSelect.value;
    setCalculatingUI();
    initWorker();

    if (type === 'batch') {
        const start = parseInt(startInput.value) || 1;
        const end = parseInt(endInput.value) || 1000;
        if (end - start > 10000000) { displayError('Range too large (max 10M)'); return; }
        worker.postMessage({ type: 'batch', start, end });
    } else if (type === 'highPersistence') {
        worker.postMessage({ type: 'highPersistence', maxDigits: 20, minPersistence: 5 });
    } else {
        const num = numberInput.value.replace(/\D/g, '');
        if (!num) { displayError('Enter a valid number'); return; }
        worker.postMessage({ type, number: num });
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
