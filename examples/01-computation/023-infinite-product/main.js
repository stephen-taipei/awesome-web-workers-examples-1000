/**
 * Main Thread: Infinite Product Calculator
 */

const productTypeSelect = document.getElementById('productType');
const productSelect = document.getElementById('productSelect');
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

const productParams = {
    wallis: [],
    vieta: [],
    eulerSine: [{ name: 'x', label: 'Value x', default: 1 }],
    pentagonal: [{ name: 'x', label: 'Value x (|x| < 1)', default: 0.5 }],
    convergentSimple: [],
    telescoping: [],
    inverseE: [],
    catalanLike: []
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
    let html = '<div class="result-product">';
    html += `<h4>${result.description || 'Custom Product'}</h4>`;
    html += `<div class="product-value"><span class="label">Product =</span> <span class="value">${result.product}</span></div>`;

    if (result.limit && result.limit !== 'Unknown (custom product)') {
        html += `<div class="limit-value"><span class="label">Limit =</span> <span class="value">${result.limit}</span></div>`;
        if (result.error && result.error !== 'N/A') {
            html += `<div class="error-value"><span class="label">Error =</span> <span class="value">${result.error}</span></div>`;
        }
    }

    if (result.terms && result.terms.length > 0) {
        html += '<h5>Partial Products:</h5><table class="result-table">';
        html += '<thead><tr><th>k</th><th>Factor</th><th>Partial Product</th></tr></thead><tbody>';
        result.terms.slice(0, 25).forEach(t => {
            html += `<tr><td>${t.k}</td><td class="number-value">${t.factor}</td><td>${t.partialProduct}</td></tr>`;
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

function updateProductUI() {
    const isPredefined = productTypeSelect.value === 'predefined';
    productSelect.parentElement.classList.toggle('hidden', !isPredefined);
    customExpressionGroup.classList.toggle('hidden', isPredefined);

    if (isPredefined) {
        updateParamsUI();
    } else {
        paramsGroup.classList.add('hidden');
    }
}

function updateParamsUI() {
    const product = productSelect.value;
    const params = productParams[product] || [];

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

    if (productTypeSelect.value === 'predefined') {
        worker.postMessage({
            type: 'predefined',
            productName: productSelect.value,
            n: n,
            params: getParams()
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
productTypeSelect.addEventListener('change', updateProductUI);
productSelect.addEventListener('change', updateParamsUI);
nInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') startCalculation(); });

document.addEventListener('DOMContentLoaded', () => { updateProductUI(); });
