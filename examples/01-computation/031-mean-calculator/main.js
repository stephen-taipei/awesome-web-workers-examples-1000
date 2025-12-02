/**
 * Main Thread: Mean Calculator
 */

const calcTypeSelect = document.getElementById('calcType');
const dataInputGroup = document.getElementById('dataInputGroup');
const dataInput = document.getElementById('dataInput');
const weightsGroup = document.getElementById('weightsGroup');
const weightsInput = document.getElementById('weightsInput');
const trimGroup = document.getElementById('trimGroup');
const trimPercentInput = document.getElementById('trimPercentInput');
const generateGroup = document.getElementById('generateGroup');
const countInput = document.getElementById('countInput');
const distributionSelect = document.getElementById('distributionSelect');
const paramsGroup = document.getElementById('paramsGroup');
const paramMinInput = document.getElementById('paramMinInput');
const paramMaxInput = document.getElementById('paramMaxInput');
const paramMeanInput = document.getElementById('paramMeanInput');
const paramStdDevInput = document.getElementById('paramStdDevInput');
const paramLambdaInput = document.getElementById('paramLambdaInput');
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
    let html = '<div class="result-mean">';

    if (data.calculationType === 'generate') {
        html += `<h4>Generated Data: ${r.distribution}</h4>`;
        html += `<p class="sample">Sample: ${r.sample.join(', ')}...</p>`;
    }

    switch (data.calculationType) {
        case 'arithmetic':
            html += '<h4>Arithmetic Mean</h4>';
            html += `<div class="big-number">${r.mean.toFixed(6)}</div>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Count</td><td>${r.count.toLocaleString()}</td></tr>`;
            html += `<tr><td>Sum</td><td>${r.sum.toFixed(4)}</td></tr>`;
            html += `<tr><td>Min</td><td>${r.min.toFixed(4)}</td></tr>`;
            html += `<tr><td>Max</td><td>${r.max.toFixed(4)}</td></tr>`;
            html += `<tr><td>Range</td><td>${r.range.toFixed(4)}</td></tr>`;
            html += `<tr><td>Variance</td><td>${r.variance.toFixed(6)}</td></tr>`;
            html += `<tr><td>Std Dev</td><td>${r.stdDev.toFixed(6)}</td></tr>`;
            html += `<tr><td>Std Error</td><td>${r.standardError.toFixed(6)}</td></tr>`;
            html += '</tbody></table>';
            break;

        case 'geometric':
            html += '<h4>Geometric Mean</h4>';
            html += `<div class="big-number">${r.geometricMean.toFixed(6)}</div>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Count</td><td>${r.count.toLocaleString()}</td></tr>`;
            html += `<tr><td>Log Mean</td><td>${r.logMean.toFixed(6)}</td></tr>`;
            html += `<tr><td>Product</td><td>${typeof r.product === 'number' ? r.product.toExponential(4) : r.product}</td></tr>`;
            html += '</tbody></table>';
            html += '<p class="note">Geometric mean is useful for growth rates and ratios</p>';
            break;

        case 'harmonic':
            html += '<h4>Harmonic Mean</h4>';
            html += `<div class="big-number">${r.harmonicMean.toFixed(6)}</div>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Count</td><td>${r.count.toLocaleString()}</td></tr>`;
            if (r.reciprocalSum) {
                html += `<tr><td>Reciprocal Sum</td><td>${r.reciprocalSum.toFixed(6)}</td></tr>`;
            }
            if (r.zeroCount) {
                html += `<tr><td>Zeros</td><td>${r.zeroCount}</td></tr>`;
            }
            html += '</tbody></table>';
            html += '<p class="note">Harmonic mean is useful for averaging rates</p>';
            break;

        case 'weighted':
            html += '<h4>Weighted Mean</h4>';
            html += `<div class="big-number">${r.weightedMean.toFixed(6)}</div>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Count</td><td>${r.count.toLocaleString()}</td></tr>`;
            html += `<tr><td>Weighted Sum</td><td>${r.weightedSum.toFixed(4)}</td></tr>`;
            html += `<tr><td>Total Weight</td><td>${r.totalWeight.toFixed(4)}</td></tr>`;
            html += '</tbody></table>';
            break;

        case 'trimmed':
            html += `<h4>Trimmed Mean (${r.trimPercent}%)</h4>`;
            html += `<div class="big-number">${r.trimmedMean.toFixed(6)}</div>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Original Count</td><td>${r.originalCount.toLocaleString()}</td></tr>`;
            html += `<tr><td>Trimmed Count</td><td>${r.trimmedCount.toLocaleString()}</td></tr>`;
            html += `<tr><td>Removed (low)</td><td>${r.removedLow}</td></tr>`;
            html += `<tr><td>Removed (high)</td><td>${r.removedHigh}</td></tr>`;
            html += `<tr><td>Lowest Kept</td><td>${r.lowestKept.toFixed(4)}</td></tr>`;
            html += `<tr><td>Highest Kept</td><td>${r.highestKept.toFixed(4)}</td></tr>`;
            html += '</tbody></table>';
            break;

        case 'all':
        case 'generate':
            html += '<h4>All Types of Means</h4>';
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Count</td><td>${r.count.toLocaleString()}</td></tr>`;
            html += `<tr><td>Arithmetic Mean</td><td class="highlight">${r.arithmetic.toFixed(6)}</td></tr>`;
            html += `<tr><td>Geometric Mean</td><td>${r.geometric ? r.geometric.toFixed(6) : 'N/A (non-positive values)'}</td></tr>`;
            html += `<tr><td>Harmonic Mean</td><td>${r.harmonic ? r.harmonic.toFixed(6) : 'N/A (zeros present)'}</td></tr>`;
            html += `<tr><td>Quadratic Mean (RMS)</td><td>${r.quadratic.toFixed(6)}</td></tr>`;
            html += `<tr><td>Trimmed Mean (5%)</td><td>${r.trimmed5.toFixed(6)}</td></tr>`;
            html += `<tr><td>Min</td><td>${r.min.toFixed(4)}</td></tr>`;
            html += `<tr><td>Max</td><td>${r.max.toFixed(4)}</td></tr>`;
            html += `<tr><td>Range</td><td>${r.range.toFixed(4)}</td></tr>`;
            html += `<tr><td>Std Dev</td><td>${r.stdDev.toFixed(6)}</td></tr>`;
            html += '</tbody></table>';
            html += `<p class="inequality">${r.inequality}</p>`;
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
    document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = false);
}

function setCalculatingUI() {
    calculateBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    document.querySelectorAll('input, select, textarea').forEach(el => el.disabled = true);
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    hideError();
    progressBar.style.width = '0%';
}

function updateInputUI() {
    const type = calcTypeSelect.value;
    dataInputGroup.classList.toggle('hidden', type === 'generate');
    weightsGroup.classList.toggle('hidden', type !== 'weighted');
    trimGroup.classList.toggle('hidden', type !== 'trimmed');
    generateGroup.classList.toggle('hidden', type !== 'generate');
    updateParamsUI();
}

function updateParamsUI() {
    const dist = distributionSelect.value;
    document.querySelectorAll('.param-row').forEach(el => el.classList.add('hidden'));
    if (dist === 'uniform') {
        document.getElementById('uniformParams').classList.remove('hidden');
    } else if (dist === 'normal') {
        document.getElementById('normalParams').classList.remove('hidden');
    } else if (dist === 'exponential' || dist === 'poisson') {
        document.getElementById('expParams').classList.remove('hidden');
    }
}

function parseData(str) {
    return str.split(/[,\s\n]+/)
              .map(s => parseFloat(s.trim()))
              .filter(n => !isNaN(n));
}

function startCalculation() {
    const type = calcTypeSelect.value;
    setCalculatingUI();
    initWorker();

    if (type === 'generate') {
        const count = parseInt(countInput.value) || 100000;
        const distribution = distributionSelect.value;
        let params = {};

        switch (distribution) {
            case 'uniform':
                params = { min: parseFloat(paramMinInput.value) || 0, max: parseFloat(paramMaxInput.value) || 100 };
                break;
            case 'normal':
                params = { mean: parseFloat(paramMeanInput.value) || 50, stdDev: parseFloat(paramStdDevInput.value) || 10 };
                break;
            case 'exponential':
            case 'poisson':
                params = { lambda: parseFloat(paramLambdaInput.value) || 1 };
                break;
        }

        worker.postMessage({ type: 'generate', count, distribution, params });
        return;
    }

    const data = parseData(dataInput.value);
    if (data.length === 0) { displayError('Enter valid numeric data'); return; }

    switch (type) {
        case 'arithmetic':
        case 'geometric':
        case 'harmonic':
        case 'all':
            worker.postMessage({ type, data });
            break;

        case 'weighted':
            const weights = parseData(weightsInput.value);
            if (weights.length !== data.length) {
                displayError('Weights must match data length');
                return;
            }
            worker.postMessage({ type: 'weighted', data, weights });
            break;

        case 'trimmed':
            const trimPercent = parseFloat(trimPercentInput.value) || 5;
            worker.postMessage({ type: 'trimmed', data, trimPercent });
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
distributionSelect.addEventListener('change', updateParamsUI);
document.addEventListener('DOMContentLoaded', () => { updateInputUI(); updateParamsUI(); });
