/**
 * Main Thread: Series Summation Calculator
 */

const seriesTypeSelect = document.getElementById('seriesType');
const seriesSelect = document.getElementById('seriesSelect');
const customExpressionGroup = document.getElementById('customExpressionGroup');
const customExpression = document.getElementById('customExpression');
const nInput = document.getElementById('nInput');
const paramsGroup = document.getElementById('paramsGroup');
const paramInputs = document.getElementById('paramInputs');
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

const seriesParams = {
    geometric: [{ name: 'r', label: 'Common ratio r', default: 0.5 }],
    power: [{ name: 'p', label: 'Power p', default: 2 }],
    exponential: [{ name: 'x', label: 'Value x', default: 1 }],
    sine: [{ name: 'x', label: 'Angle x (radians)', default: 1 }],
    cosine: [{ name: 'x', label: 'Angle x (radians)', default: 1 }],
    logarithm: [{ name: 'x', label: 'Value x (-1 < x ≤ 1)', default: 0.5 }],
    arctan: [{ name: 'x', label: 'Value x (|x| ≤ 1)', default: 1 }],
    basel: [],
    leibniz: [],
    zeta: [{ name: 's', label: 'Exponent s (s > 1)', default: 2 }],
    fibonacciReciprocal: []
};

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

    worker.onerror = (error) => { displayError(`Worker error: ${error.message}`); resetUI(); };
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

    const result = data.result;
    let html = '<div class="result-series">';
    html += `<h4>Sum = ${result.sum}</h4>`;
    html += `<p class="convergence-info">${result.convergence}</p>`;

    if (result.terms && result.terms.length > 0) {
        html += '<h5>Terms:</h5><table class="result-table">';
        html += '<thead><tr><th>k</th><th>Term</th><th>Partial Sum</th></tr></thead><tbody>';
        result.terms.forEach(t => {
            html += `<tr><td>${t.k}</td><td class="number-value">${t.term}</td><td>${t.partialSum}</td></tr>`;
        });
        html += '</tbody></table>';
    }
    html += '</div>';
    resultContent.innerHTML = html;
    resetUI();
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

function updateSeriesUI() {
    const isPredefined = seriesTypeSelect.value === 'predefined';
    seriesSelect.parentElement.classList.toggle('hidden', !isPredefined);
    customExpressionGroup.classList.toggle('hidden', isPredefined);

    if (isPredefined) {
        updateParamsUI();
    } else {
        paramsGroup.classList.add('hidden');
    }
}

function updateParamsUI() {
    const series = seriesSelect.value;
    const params = seriesParams[series] || [];

    if (params.length === 0) {
        paramsGroup.classList.add('hidden');
        return;
    }

    paramsGroup.classList.remove('hidden');
    paramInputs.innerHTML = params.map(p => `
        <div class="param-input">
            <label for="param_${p.name}">${p.label}:</label>
            <input type="number" id="param_${p.name}" step="any" value="${p.default}">
        </div>
    `).join('');
}

function getParams() {
    const params = {};
    document.querySelectorAll('#paramInputs input').forEach(input => {
        const name = input.id.replace('param_', '');
        params[name] = parseFloat(input.value);
    });
    return params;
}

function startCalculation() {
    const n = parseInt(nInput.value, 10);
    if (isNaN(n) || n < 1) {
        displayError('Please enter a valid positive integer for n.');
        return;
    }
    if (n > 10000000) {
        displayError('n should be <= 10,000,000.');
        return;
    }

    setCalculatingUI();
    initWorker();

    if (seriesTypeSelect.value === 'predefined') {
        worker.postMessage({
            type: 'predefined',
            seriesName: seriesSelect.value,
            n: n,
            params: getParams(),
            startIndex: ['logarithm', 'fibonacciReciprocal', 'basel', 'zeta', 'power'].includes(seriesSelect.value) ? 1 : 0
        });
    } else {
        worker.postMessage({
            type: 'custom',
            expression: customExpression.value,
            n: n,
            startIndex: 1
        });
    }
}

function cancelCalculation() {
    if (worker) { worker.terminate(); worker = null; }
    resetUI();
    progressContainer.classList.add('hidden');
}

calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);
seriesTypeSelect.addEventListener('change', updateSeriesUI);
seriesSelect.addEventListener('change', updateParamsUI);
nInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') startCalculation(); });

document.addEventListener('DOMContentLoaded', () => { updateSeriesUI(); });
