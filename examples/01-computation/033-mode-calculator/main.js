/**
 * Main Thread: Mode Calculator
 */

const worker = new Worker('worker.js');
const resultsDiv = document.getElementById('results');
const progressDiv = document.getElementById('progress');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const calculateBtn = document.getElementById('calculateBtn');

worker.onmessage = function(e) {
    const { type } = e.data;

    if (type === 'progress') {
        progressDiv.style.display = 'block';
        progressBar.style.width = e.data.percentage + '%';
        progressText.textContent = `Processing: ${e.data.percentage}%`;
    } else if (type === 'result') {
        displayResult(e.data);
        calculateBtn.disabled = false;
        progressDiv.style.display = 'none';
    } else if (type === 'error') {
        resultsDiv.innerHTML = `<div class="error">Error: ${e.data.message}</div>`;
        calculateBtn.disabled = false;
        progressDiv.style.display = 'none';
    }
};

function calculate() {
    const calcType = document.getElementById('calcType').value;
    const dataInput = document.getElementById('dataInput').value.trim();

    calculateBtn.disabled = true;
    resultsDiv.innerHTML = '<p>Calculating...</p>';

    if (calcType === 'generate') {
        const count = parseInt(document.getElementById('generateCount').value) || 100000;
        const distribution = document.getElementById('distribution').value;
        const params = getDistributionParams(distribution);

        worker.postMessage({ type: 'generate', count, distribution, params });
    } else {
        const data = parseData(dataInput);

        if (data.length === 0) {
            resultsDiv.innerHTML = '<div class="error">Please enter valid numeric data</div>';
            calculateBtn.disabled = false;
            return;
        }

        if (calcType === 'grouped') {
            const binWidth = parseFloat(document.getElementById('binWidth').value) || 1;
            worker.postMessage({ type: calcType, data, binWidth });
        } else if (calcType === 'frequency') {
            const topN = parseInt(document.getElementById('topN').value) || 10;
            worker.postMessage({ type: calcType, data, topN });
        } else {
            worker.postMessage({ type: calcType, data });
        }
    }
}

function parseData(input) {
    return input.split(/[\s,;]+/)
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
}

function getDistributionParams(distribution) {
    switch (distribution) {
        case 'uniform':
            return {
                min: parseInt(document.getElementById('uniformMin').value) || 1,
                max: parseInt(document.getElementById('uniformMax').value) || 10
            };
        case 'normal':
            return {
                mean: parseFloat(document.getElementById('normalMean').value) || 50,
                stdDev: parseFloat(document.getElementById('normalStdDev').value) || 10
            };
        case 'poisson':
            return {
                lambda: parseFloat(document.getElementById('poissonLambda').value) || 5
            };
        case 'binomial':
            return {
                n: parseInt(document.getElementById('binomialN').value) || 10,
                p: parseFloat(document.getElementById('binomialP').value) || 0.5
            };
        case 'geometric':
            return {
                p: parseFloat(document.getElementById('geometricP').value) || 0.3
            };
        default:
            return {};
    }
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Mode Calculation Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'mode':
            html += `
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Mode</span>
                        <span class="stat-value">${formatNumber(result.mode)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Frequency</span>
                        <span class="stat-value">${result.frequency} (${result.percentage}%)</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Modality</span>
                        <span class="stat-value">${result.isUnimodal ? 'Unimodal' : 'Multimodal (' + result.modeCount + ' modes)'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Unique Values</span>
                        <span class="stat-value">${result.uniqueValues.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Count</span>
                        <span class="stat-value">${result.totalCount.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${result.mean}</span>
                    </div>
                </div>`;
            break;

        case 'multimode':
            html += `
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Modality</span>
                        <span class="stat-value">${result.modality}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mode Count</span>
                        <span class="stat-value">${result.modeCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Max Frequency</span>
                        <span class="stat-value">${result.maxFrequency}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Unique Values</span>
                        <span class="stat-value">${result.uniqueValues.toLocaleString()}</span>
                    </div>
                </div>
                <h4>Modes${result.truncated ? ' (Top 20)' : ''}</h4>
                <div class="modes-list">
                    ${result.modes.map(m => `<span class="mode-chip">${formatNumber(m.value)} (${m.count})</span>`).join('')}
                </div>`;
            break;

        case 'frequency':
            html += `
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Unique Values</span>
                        <span class="stat-value">${result.uniqueValues.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Count</span>
                        <span class="stat-value">${result.totalCount.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Entropy</span>
                        <span class="stat-value">${result.entropy} bits</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Max Entropy</span>
                        <span class="stat-value">${result.maxEntropy} bits</span>
                    </div>
                </div>
                <h4>Top Frequencies</h4>
                <table class="freq-table">
                    <tr><th>Value</th><th>Count</th><th>Percentage</th></tr>
                    ${result.topN.map(f => `<tr><td>${formatNumber(f.value)}</td><td>${f.count}</td><td>${f.percentage}%</td></tr>`).join('')}
                </table>`;
            break;

        case 'grouped':
            html += `
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Modal Class</span>
                        <span class="stat-value">[${formatNumber(result.modalClass.start)}, ${formatNumber(result.modalClass.end)})</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Modal Center</span>
                        <span class="stat-value">${formatNumber(result.modalClass.center)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Modal Frequency</span>
                        <span class="stat-value">${result.modalClass.frequency}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Bin Width</span>
                        <span class="stat-value">${result.binWidth}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Bin Count</span>
                        <span class="stat-value">${result.binCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range</span>
                        <span class="stat-value">[${formatNumber(result.min)}, ${formatNumber(result.max)}]</span>
                    </div>
                </div>
                <h4>Bin Distribution</h4>
                <table class="freq-table">
                    <tr><th>Bin</th><th>Count</th><th>Percentage</th></tr>
                    ${result.distribution.map(b => `<tr><td>[${formatNumber(b.start)}, ${formatNumber(b.end)})</td><td>${b.count}</td><td>${b.percentage}%</td></tr>`).join('')}
                </table>`;
            break;

        case 'generate':
            html += `
                <div class="info-box">
                    <strong>Distribution:</strong> ${result.distribution}
                    ${result.params ? `<br><strong>Parameters:</strong> ${JSON.stringify(result.params)}` : ''}
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Generated</span>
                        <span class="stat-value">${result.generated.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mode</span>
                        <span class="stat-value">${result.mode}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Frequency</span>
                        <span class="stat-value">${result.frequency} (${result.percentage}%)</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Modality</span>
                        <span class="stat-value">${result.modality}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Unique Values</span>
                        <span class="stat-value">${result.uniqueValues.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${result.mean}</span>
                    </div>
                </div>
                <h4>Top Modes</h4>
                <div class="modes-list">
                    ${result.modes.map(m => `<span class="mode-chip">${m.value} (${m.count})</span>`).join('')}
                </div>
                <h4>Sample Data</h4>
                <div class="sample-data">${result.sample.join(', ')}</div>`;
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function formatNumber(num) {
    if (typeof num === 'number') {
        return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(4);
    }
    return num;
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;
    document.getElementById('dataInputGroup').style.display = calcType === 'generate' ? 'none' : 'block';
    document.getElementById('generateOptions').style.display = calcType === 'generate' ? 'block' : 'none';
    document.getElementById('binWidthGroup').style.display = calcType === 'grouped' ? 'block' : 'none';
    document.getElementById('topNGroup').style.display = calcType === 'frequency' ? 'block' : 'none';
}

function updateDistributionParams() {
    const distribution = document.getElementById('distribution').value;
    document.querySelectorAll('.dist-params').forEach(el => el.style.display = 'none');
    const paramDiv = document.getElementById(distribution + 'Params');
    if (paramDiv) paramDiv.style.display = 'block';
}

function loadSample() {
    // Multimodal sample data
    const data = [];
    for (let i = 0; i < 100; i++) {
        if (Math.random() < 0.4) data.push(5);
        else if (Math.random() < 0.7) data.push(10);
        else data.push(Math.floor(Math.random() * 20) + 1);
    }
    document.getElementById('dataInput').value = data.join(', ');
}

// Initialize
updateOptions();
updateDistributionParams();
