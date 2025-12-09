/**
 * Main Thread: Harmonic Series Calculator
 */

const calculationTypeSelect = document.getElementById('calculationType');
const nInput = document.getElementById('nInput');
const mInputGroup = document.getElementById('mInputGroup');
const mInput = document.getElementById('mInput');
const targetInputGroup = document.getElementById('targetInputGroup');
const targetInput = document.getElementById('targetInput');
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

    worker.onmessage = function(e) {
        const data = e.data;
        switch (data.type) {
            case 'progress':
                updateProgress(data.current, data.total, data.percentage);
                break;
            case 'result':
                displayResult(data);
                break;
            case 'error':
                displayError(data.message);
                break;
        }
    };

    worker.onerror = function(error) {
        displayError(`Worker error: ${error.message}`);
        resetUI();
    };
}

function updateProgress(current, total, percentage) {
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `Processing: ${current.toLocaleString()} / ${total.toLocaleString()} (${percentage}%)`;
}

function displayResult(data) {
    hideError();
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');
    executionTime.textContent = `${data.executionTime} ms`;

    let html = '';
    switch (data.calculationType) {
        case 'harmonic':
            html = `<div class="result-single">
                <h4>H(${data.n.toLocaleString()})</h4>
                <div class="big-number">${data.result}</div>
                <p class="result-info">Approximation: ln(${data.n}) + γ ≈ ${(Math.log(data.n) + 0.5772156649).toFixed(10)}</p>
            </div>`;
            break;
        case 'generalized':
            html = `<div class="result-single">
                <h4>H(${data.n.toLocaleString()}, ${data.m})</h4>
                <div class="big-number">${data.result}</div>
                <p class="result-info">Generalized harmonic number of order ${data.m}</p>
            </div>`;
            break;
        case 'alternating':
            html = `<div class="result-single">
                <h4>Alternating Harmonic (${data.n.toLocaleString()} terms)</h4>
                <div class="big-number">${data.result}</div>
                <p class="result-info">Converges to ln(2) ≈ ${Math.LN2.toFixed(15)}</p>
            </div>`;
            break;
        case 'sequence':
            html = formatSequenceResult(data.result);
            break;
        case 'exceeding':
            html = `<div class="result-single">
                <h4>First n where H(n) > ${data.target}</h4>
                <p><strong>n = ${data.result.n.toLocaleString()}</strong></p>
                <p>H(n) = ${data.result.harmonicValue}</p>
                <p class="result-info">Euler-Mascheroni constant γ ≈ ${data.result.gamma}</p>
            </div>`;
            break;
    }
    resultContent.innerHTML = html;
    resetUI();
}

function formatSequenceResult(results) {
    let html = '<div class="result-sequence"><h4>Harmonic Sequence</h4>';
    html += '<table class="result-table"><thead><tr><th>n</th><th>H(n)</th></tr></thead><tbody>';
    results.forEach(item => {
        html += `<tr><td>${item.index}</td><td class="number-value">${item.value}</td></tr>`;
    });
    html += '</tbody></table></div>';
    return html;
}

function displayError(message) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = message;
    resetUI();
}

function hideError() { errorContainer.classList.add('hidden'); }

function resetUI() {
    calculateBtn.disabled = false;
    cancelBtn.classList.add('hidden');
    nInput.disabled = false;
    mInput.disabled = false;
    targetInput.disabled = false;
    calculationTypeSelect.disabled = false;
}

function setCalculatingUI() {
    calculateBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    nInput.disabled = true;
    mInput.disabled = true;
    targetInput.disabled = true;
    calculationTypeSelect.disabled = true;
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    hideError();
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting calculation...';
}

function updateInputVisibility() {
    const type = calculationTypeSelect.value;
    mInputGroup.classList.toggle('hidden', type !== 'generalized');
    targetInputGroup.classList.toggle('hidden', type !== 'exceeding');
    nInput.parentElement.classList.toggle('hidden', type === 'exceeding');
}

function startCalculation() {
    const type = calculationTypeSelect.value;
    const n = parseInt(nInput.value, 10);
    const m = parseInt(mInput.value, 10);
    const target = parseFloat(targetInput.value);

    if (type !== 'exceeding' && (isNaN(n) || n < 1)) {
        displayError('Please enter a valid positive integer for n.');
        return;
    }
    if (type === 'generalized' && (isNaN(m) || m < 1)) {
        displayError('Please enter a valid positive integer for m.');
        return;
    }
    if (type === 'exceeding' && (isNaN(target) || target < 1)) {
        displayError('Please enter a valid target value >= 1.');
        return;
    }

    const limits = { harmonic: 100000000, generalized: 10000000, alternating: 100000000, sequence: 1000, exceeding: 20 };
    if (type !== 'exceeding' && n > limits[type]) {
        displayError(`For ${type}, n should be <= ${limits[type].toLocaleString()}.`);
        return;
    }
    if (type === 'exceeding' && target > limits.exceeding) {
        displayError(`Target should be <= ${limits.exceeding} (very large n required).`);
        return;
    }

    setCalculatingUI();
    initWorker();
    worker.postMessage({ type, n, m, target, precision: 15 });
}

function cancelCalculation() {
    if (worker) { worker.terminate(); worker = null; }
    resetUI();
    progressContainer.classList.add('hidden');
}

calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);
calculationTypeSelect.addEventListener('change', updateInputVisibility);
nInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') startCalculation(); });

document.addEventListener('DOMContentLoaded', updateInputVisibility);
