/**
 * Main Thread: Median Calculator
 */

const calcTypeSelect = document.getElementById('calcType');
const dataInputGroup = document.getElementById('dataInputGroup');
const dataInput = document.getElementById('dataInput');
const weightsGroup = document.getElementById('weightsGroup');
const weightsInput = document.getElementById('weightsInput');
const windowGroup = document.getElementById('windowGroup');
const windowSizeInput = document.getElementById('windowSizeInput');
const generateGroup = document.getElementById('generateGroup');
const countInput = document.getElementById('countInput');
const distributionSelect = document.getElementById('distributionSelect');
const paramsGroup = document.getElementById('paramsGroup');
const paramMinInput = document.getElementById('paramMinInput');
const paramMaxInput = document.getElementById('paramMaxInput');
const paramMeanInput = document.getElementById('paramMeanInput');
const paramStdDevInput = document.getElementById('paramStdDevInput');
const paramLambdaInput = document.getElementById('paramLambdaInput');
const bimodalParams = document.getElementById('bimodalParams');
const paramMean1Input = document.getElementById('paramMean1Input');
const paramMean2Input = document.getElementById('paramMean2Input');
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
    let html = '<div class="result-median">';

    if (data.calculationType === 'generate') {
        html += `<h4>Generated Data: ${r.distribution}</h4>`;
        html += `<p class="sample">Sample: ${r.sample.join(', ')}...</p>`;
    }

    switch (data.calculationType) {
        case 'median':
        case 'generate':
            html += '<h4>Median Analysis</h4>';
            html += `<div class="big-number">${r.median.toFixed(6)}</div>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Count</td><td>${r.count.toLocaleString()}</td></tr>`;
            html += `<tr><td>Median</td><td class="highlight">${r.median.toFixed(6)}</td></tr>`;
            html += `<tr><td>Mean</td><td>${r.mean.toFixed(6)}</td></tr>`;
            html += `<tr><td>Median - Mean</td><td>${r.medianVsMean.toFixed(6)}</td></tr>`;
            html += `<tr><td>Distribution</td><td>${r.skewIndicator}</td></tr>`;
            html += `<tr><td>Min</td><td>${r.min.toFixed(4)}</td></tr>`;
            html += `<tr><td>Q1 (25%)</td><td>${r.q1.toFixed(4)}</td></tr>`;
            html += `<tr><td>Q3 (75%)</td><td>${r.q3.toFixed(4)}</td></tr>`;
            html += `<tr><td>Max</td><td>${r.max.toFixed(4)}</td></tr>`;
            html += `<tr><td>IQR</td><td>${r.iqr.toFixed(4)}</td></tr>`;
            html += `<tr><td>Range</td><td>${r.range.toFixed(4)}</td></tr>`;
            html += '</tbody></table>';

            // Box plot visualization
            html += '<h5>Box Plot</h5>';
            html += '<div class="box-plot">';
            const scale = 100 / r.range;
            const q1Pos = (r.q1 - r.min) * scale;
            const medPos = (r.median - r.min) * scale;
            const q3Pos = (r.q3 - r.min) * scale;
            html += `<div class="whisker-left" style="width:${q1Pos}%"></div>`;
            html += `<div class="box" style="left:${q1Pos}%;width:${q3Pos - q1Pos}%">`;
            html += `<div class="median-line" style="left:${((medPos - q1Pos) / (q3Pos - q1Pos)) * 100}%"></div>`;
            html += '</div>';
            html += `<div class="whisker-right" style="left:${q3Pos}%;width:${100 - q3Pos}%"></div>`;
            html += '</div>';
            html += '<div class="box-labels"><span>Min</span><span>Q1</span><span>Med</span><span>Q3</span><span>Max</span></div>';
            break;

        case 'medianAbsoluteDeviation':
            html += '<h4>Median Absolute Deviation (MAD)</h4>';
            html += `<div class="big-number">${r.mad.toFixed(6)}</div>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Median</td><td>${r.median.toFixed(6)}</td></tr>`;
            html += `<tr><td>MAD</td><td class="highlight">${r.mad.toFixed(6)}</td></tr>`;
            html += `<tr><td>Scaled MAD (σ estimate)</td><td>${r.scaledMAD.toFixed(6)}</td></tr>`;
            html += `<tr><td>Count</td><td>${r.count.toLocaleString()}</td></tr>`;
            html += '</tbody></table>';
            html += `<p class="note">${r.interpretation}</p>`;
            break;

        case 'runningMedian':
            html += `<h4>Running Median (Window: ${r.windowSize})</h4>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Windows</td><td>${r.count.toLocaleString()}</td></tr>`;
            html += `<tr><td>Median of Medians</td><td class="highlight">${r.medianOfMedians.toFixed(6)}</td></tr>`;
            html += `<tr><td>Min Median</td><td>${r.minMedian.toFixed(6)}</td></tr>`;
            html += `<tr><td>Max Median</td><td>${r.maxMedian.toFixed(6)}</td></tr>`;
            html += '</tbody></table>';
            html += '<h5>Running Medians</h5>';
            html += '<table class="result-table"><thead><tr><th>Index</th><th>Median</th></tr></thead><tbody>';
            r.runningMedians.forEach(rm => {
                html += `<tr><td>${rm.index}</td><td class="number-value">${rm.median.toFixed(4)}</td></tr>`;
            });
            html += '</tbody></table>';
            if (r.truncated) html += '<p class="note">Showing first 100 windows</p>';
            break;

        case 'weightedMedian':
            html += '<h4>Weighted Median</h4>';
            html += `<div class="big-number">${r.weightedMedian.toFixed(6)}</div>`;
            html += '<table class="result-table"><tbody>';
            html += `<tr><td>Count</td><td>${r.count.toLocaleString()}</td></tr>`;
            html += `<tr><td>Total Weight</td><td>${r.totalWeight.toFixed(4)}</td></tr>`;
            html += `<tr><td>Method</td><td>${r.method}</td></tr>`;
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
    weightsGroup.classList.toggle('hidden', type !== 'weightedMedian');
    windowGroup.classList.toggle('hidden', type !== 'runningMedian');
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
    } else if (dist === 'exponential') {
        document.getElementById('expParams').classList.remove('hidden');
    } else if (dist === 'bimodal') {
        document.getElementById('bimodalParams').classList.remove('hidden');
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
                params = { lambda: parseFloat(paramLambdaInput.value) || 1 };
                break;
            case 'bimodal':
                params = {
                    mean1: parseFloat(paramMean1Input.value) || 30,
                    mean2: parseFloat(paramMean2Input.value) || 70,
                    stdDev: parseFloat(paramStdDevInput.value) || 10
                };
                break;
        }

        worker.postMessage({ type: 'generate', count, distribution, params });
        return;
    }

    const data = parseData(dataInput.value);
    if (data.length === 0) { displayError('Enter valid numeric data'); return; }

    switch (type) {
        case 'median':
        case 'medianAbsoluteDeviation':
            worker.postMessage({ type, data });
            break;

        case 'runningMedian':
            const windowSize = parseInt(windowSizeInput.value) || 10;
            if (windowSize > data.length) { displayError('Window size larger than data'); return; }
            worker.postMessage({ type: 'runningMedian', data, windowSize });
            break;

        case 'weightedMedian':
            const weights = parseData(weightsInput.value);
            if (weights.length !== data.length) {
                displayError('Weights must match data length');
                return;
            }
            worker.postMessage({ type: 'weightedMedian', data, weights });
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
