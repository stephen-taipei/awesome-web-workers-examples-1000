/**
 * Main Thread: Continued Fraction Evaluation
 */

const evalTypeSelect = document.getElementById('evalType');
const standardGroup = document.getElementById('standardGroup');
const cfInput = document.getElementById('cfInput');
const periodicGroup = document.getElementById('periodicGroup');
const a0Input = document.getElementById('a0Input');
const periodInput = document.getElementById('periodInput');
const repsInput = document.getElementById('repsInput');
const famousGroup = document.getElementById('famousGroup');
const formulaSelect = document.getElementById('formulaSelect');
const sqrtNGroup = document.getElementById('sqrtNGroup');
const sqrtNInput = document.getElementById('sqrtNInput');
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
    let html = '<div class="result-eval">';

    html += `<h4>Evaluated Value</h4>`;
    html += `<div class="big-number">${r.value}</div>`;

    if (r.exact) {
        html += `<p class="exact-fraction">Exact: ${r.exact.p}/${r.exact.q}</p>`;
    }

    if (r.trueValue !== undefined) {
        html += `<p class="true-value">True value: ${r.trueValue}</p>`;
        html += `<p class="error-info">Error: ${r.error?.toExponential(6) || 'N/A'}</p>`;
    }

    if (r.cf) {
        const cfStr = r.cf.slice(0, 15).join(', ') + (r.cf.length > 15 ? '...' : '');
        html += `<p class="cf-used">CF: [${cfStr}]</p>`;
    }

    if (r.convergence) {
        html += '<h4>Convergence</h4>';
        html += '<table class="result-table"><thead><tr><th>Terms</th><th>Value</th></tr></thead><tbody>';
        r.convergence.forEach(c => {
            html += `<tr><td>${c.terms}</td><td>${c.value.toFixed(12)}</td></tr>`;
        });
        html += '</tbody></table>';
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
    const type = evalTypeSelect.value;
    standardGroup.classList.toggle('hidden', type !== 'standard');
    periodicGroup.classList.toggle('hidden', type !== 'periodic');
    famousGroup.classList.toggle('hidden', type !== 'famous');
    sqrtNGroup.classList.toggle('hidden', formulaSelect.value !== 'sqrtN' || type !== 'famous');
}

function updateFormulaUI() {
    sqrtNGroup.classList.toggle('hidden', formulaSelect.value !== 'sqrtN');
}

function startCalculation() {
    const type = evalTypeSelect.value;
    const terms = parseInt(termsInput.value) || 50;

    setCalculatingUI();
    initWorker();

    if (type === 'standard') {
        try {
            const cf = cfInput.value.split(',').map(s => parseInt(s.trim()));
            if (cf.some(isNaN)) throw new Error('Invalid');
            worker.postMessage({ type: 'standard', cf });
        } catch { displayError('Invalid CF format. Use: 1, 2, 2, 2, ...'); return; }
    } else if (type === 'periodic') {
        const a0 = parseInt(a0Input.value);
        const period = periodInput.value.split(',').map(s => parseInt(s.trim()));
        const reps = parseInt(repsInput.value) || 20;
        if (isNaN(a0) || period.some(isNaN)) { displayError('Invalid input'); return; }
        worker.postMessage({ type: 'periodic', a0, period, repetitions: reps });
    } else {
        const formula = formulaSelect.value;
        const N = parseInt(sqrtNInput.value) || 2;
        worker.postMessage({ type: 'famous', formula, terms, N });
    }
}

function cancelCalculation() {
    if (worker) { worker.terminate(); worker = null; }
    resetUI();
    progressContainer.classList.add('hidden');
}

calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);
evalTypeSelect.addEventListener('change', updateInputUI);
formulaSelect.addEventListener('change', updateFormulaUI);
document.addEventListener('DOMContentLoaded', () => { updateInputUI(); updateFormulaUI(); });
