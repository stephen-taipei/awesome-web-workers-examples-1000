/**
 * Main Thread: Percentile Calculator
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

        const method = document.getElementById('method').value;

        switch (calcType) {
            case 'single':
                const percentile = parseFloat(document.getElementById('singlePercentile').value);
                worker.postMessage({ type: 'single', data, percentile, method });
                break;
            case 'multiple':
                const percentilesInput = document.getElementById('multiplePercentiles').value;
                const percentiles = percentilesInput.split(/[\s,;]+/).map(Number).filter(n => !isNaN(n));
                worker.postMessage({ type: 'multiple', data, percentiles, method });
                break;
            case 'rank':
                const value = parseFloat(document.getElementById('rankValue').value);
                worker.postMessage({ type: 'rank', data, value });
                break;
            case 'range':
                const lower = parseFloat(document.getElementById('rangeLower').value);
                const upper = parseFloat(document.getElementById('rangeUpper').value);
                worker.postMessage({ type: 'range', data, lower, upper });
                break;
            case 'all':
                worker.postMessage({ type: 'all', data });
                break;
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
                min: parseFloat(document.getElementById('uniformMin').value) || 0,
                max: parseFloat(document.getElementById('uniformMax').value) || 100
            };
        case 'normal':
            return {
                mean: parseFloat(document.getElementById('normalMean').value) || 50,
                stdDev: parseFloat(document.getElementById('normalStdDev').value) || 15
            };
        case 'exponential':
            return {
                lambda: parseFloat(document.getElementById('expLambda').value) || 0.1
            };
        case 'pareto':
            return {
                alpha: parseFloat(document.getElementById('paretoAlpha').value) || 2,
                xm: parseFloat(document.getElementById('paretoXm').value) || 1
            };
        default:
            return {};
    }
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Percentile Analysis Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'single':
            html += `
                <div class="percentile-highlight">
                    <div class="p-value">${result.percentile}th Percentile</div>
                    <div class="p-result">${formatNumber(result.value)}</div>
                    <div class="p-method">Method: ${result.method}</div>
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.count.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Min</span>
                        <span class="stat-value">${formatNumber(result.min)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Max</span>
                        <span class="stat-value">${formatNumber(result.max)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">At or Below</span>
                        <span class="stat-value">${result.countAtOrBelow}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Actual %</span>
                        <span class="stat-value">${result.actualPercentage}%</span>
                    </div>
                </div>`;
            break;

        case 'multiple':
            html += `
                <div class="info-box">
                    <strong>Method:</strong> ${result.method}
                    <br><strong>Count:</strong> ${result.count.toLocaleString()}
                </div>
                <table class="data-table">
                    <tr><th>Percentile</th><th>Value</th></tr>
                    ${result.percentiles.map(p =>
                        `<tr><td>P${p.percentile}</td><td>${formatNumber(p.value)}</td></tr>`
                    ).join('')}
                </table>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Min</span>
                        <span class="stat-value">${formatNumber(result.min)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Max</span>
                        <span class="stat-value">${formatNumber(result.max)}</span>
                    </div>
                </div>`;
            break;

        case 'rank':
            html += `
                <div class="percentile-highlight">
                    <div class="p-value">Value: ${formatNumber(result.value)}</div>
                    <div class="p-result">Percentile Rank: ${result.percentileRank.mean}%</div>
                </div>
                <h4>Percentile Rank Methods</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Strict (< value)</span>
                        <span class="stat-value">${result.percentileRank.strict}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Weak (≤ value)</span>
                        <span class="stat-value">${result.percentileRank.weak}%</span>
                    </div>
                    <div class="stat-item highlight">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${result.percentileRank.mean}%</span>
                    </div>
                </div>
                <h4>Distribution</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Below</span>
                        <span class="stat-value">${result.countBelow}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Equal</span>
                        <span class="stat-value">${result.countEqual}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Above</span>
                        <span class="stat-value">${result.countAbove}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">In Range</span>
                        <span class="stat-value">${result.isInRange ? 'Yes' : 'No'}</span>
                    </div>
                </div>`;
            break;

        case 'range':
            html += `
                <div class="range-highlight">
                    <span class="range-label">P${result.lowerPercentile} to P${result.upperPercentile}</span>
                    <span class="range-values">${formatNumber(result.lowerValue)} to ${formatNumber(result.upperValue)}</span>
                </div>
                <div class="stat-grid">
                    <div class="stat-item highlight">
                        <span class="stat-label">Values in Range</span>
                        <span class="stat-value">${result.countInRange} (${result.percentageInRange}%)</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range Width</span>
                        <span class="stat-value">${formatNumber(result.range)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range Mean</span>
                        <span class="stat-value">${formatNumber(result.rangeMean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range Median</span>
                        <span class="stat-value">${formatNumber(result.rangeMedian)}</span>
                    </div>
                </div>
                ${result.sample.length > 0 ? `
                    <h4>Sample Values in Range</h4>
                    <div class="sample-data">${result.sample.join(', ')}</div>
                ` : ''}`;
            break;

        case 'all':
            html += `
                <h4>Key Percentiles</h4>
                <div class="percentile-grid">
                    ${Object.entries(result.keyPercentiles).map(([k, v]) => `
                        <div class="percentile-item ${k === 'P50' ? 'highlight' : ''}">
                            <span class="p-label">${k}</span>
                            <span class="p-val">${formatNumber(v)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.count.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Std Dev</span>
                        <span class="stat-value">${formatNumber(result.stdDev)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range</span>
                        <span class="stat-value">${formatNumber(result.min)} - ${formatNumber(result.max)}</span>
                    </div>
                </div>
                <details>
                    <summary>All Percentiles (P1-P99)</summary>
                    <table class="data-table compact">
                        <tr><th>P</th><th>Value</th><th>P</th><th>Value</th><th>P</th><th>Value</th></tr>
                        ${generatePercentileRows(result.percentiles)}
                    </table>
                </details>`;
            break;

        case 'generate':
            html += `
                <div class="info-box">
                    <strong>Distribution:</strong> ${result.distribution}
                    <br><strong>Generated:</strong> ${result.generated.toLocaleString()} values
                </div>
                <h4>Key Percentiles</h4>
                <table class="data-table">
                    <tr><th>Percentile</th><th>Value</th></tr>
                    ${result.percentiles.map(p =>
                        `<tr><td>P${p.percentile}</td><td>${formatNumber(p.value)}</td></tr>`
                    ).join('')}
                </table>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Min</span>
                        <span class="stat-value">${formatNumber(result.min)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Max</span>
                        <span class="stat-value">${formatNumber(result.max)}</span>
                    </div>
                </div>
                <h4>Sample Data</h4>
                <div class="sample-data">${result.sample.join(', ')}</div>`;
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function generatePercentileRows(percentiles) {
    let html = '';
    const keys = Object.keys(percentiles);
    for (let i = 0; i < keys.length; i += 3) {
        html += '<tr>';
        for (let j = 0; j < 3 && i + j < keys.length; j++) {
            const k = keys[i + j];
            html += `<td>${k}</td><td>${formatNumber(percentiles[k])}</td>`;
        }
        html += '</tr>';
    }
    return html;
}

function formatNumber(num) {
    if (typeof num === 'number') {
        if (Math.abs(num) >= 10000) return num.toExponential(3);
        return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(4);
    }
    return num;
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;

    // Hide all option groups
    document.querySelectorAll('.option-group').forEach(el => el.style.display = 'none');

    // Show relevant options
    if (calcType === 'generate') {
        document.getElementById('generateOptions').style.display = 'block';
        document.getElementById('dataInputGroup').style.display = 'none';
    } else {
        document.getElementById('dataInputGroup').style.display = 'block';
        document.getElementById('generateOptions').style.display = 'none';

        if (calcType === 'single') {
            document.getElementById('singleOptions').style.display = 'block';
            document.getElementById('methodGroup').style.display = 'block';
        } else if (calcType === 'multiple') {
            document.getElementById('multipleOptions').style.display = 'block';
            document.getElementById('methodGroup').style.display = 'block';
        } else if (calcType === 'rank') {
            document.getElementById('rankOptions').style.display = 'block';
        } else if (calcType === 'range') {
            document.getElementById('rangeOptions').style.display = 'block';
        }
    }
}

function updateDistributionParams() {
    const distribution = document.getElementById('distribution').value;
    document.querySelectorAll('.dist-params').forEach(el => el.style.display = 'none');
    const paramDiv = document.getElementById(distribution + 'Params');
    if (paramDiv) paramDiv.style.display = 'block';
}

function loadSample() {
    const sample = [];
    for (let i = 0; i < 100; i++) {
        sample.push(Math.round(Math.random() * 100));
    }
    document.getElementById('dataInput').value = sample.join(', ');
}

// Initialize
updateOptions();
updateDistributionParams();
