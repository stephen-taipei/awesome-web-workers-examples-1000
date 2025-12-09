/**
 * Main Thread: Standard Deviation Calculator
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
    } else if (calcType === 'grouped') {
        const values = parseData(document.getElementById('groupedValues').value);
        const frequencies = parseData(document.getElementById('groupedFreq').value);

        if (values.length === 0 || frequencies.length === 0) {
            resultsDiv.innerHTML = '<div class="error">Please enter values and frequencies</div>';
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: 'grouped', values, frequencies });
    } else if (calcType === 'pooled') {
        const groupsText = document.getElementById('pooledGroups').value.trim();
        const groups = groupsText.split('\n')
            .map(line => parseData(line))
            .filter(g => g.length > 0);

        if (groups.length < 2) {
            resultsDiv.innerHTML = '<div class="error">Please enter at least 2 groups (one per line)</div>';
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: 'pooled', groups });
    } else {
        const data = parseData(dataInput);

        if (data.length === 0) {
            resultsDiv.innerHTML = '<div class="error">Please enter valid numeric data</div>';
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: calcType, data });
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
                stdDev: parseFloat(document.getElementById('normalStdDev').value) || 10
            };
        case 'exponential':
            return {
                lambda: parseFloat(document.getElementById('expLambda').value) || 1
            };
        case 'lognormal':
            return {
                mu: parseFloat(document.getElementById('lognormalMu').value) || 0,
                sigma: parseFloat(document.getElementById('lognormalSigma').value) || 1
            };
        default:
            return {};
    }
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Standard Deviation Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'population':
        case 'sample':
            html += `
                <div class="formula-box">
                    <strong>${result.type}</strong><br>
                    <code>${result.formula}</code>
                </div>
                <div class="stat-grid">
                    <div class="stat-item highlight">
                        <span class="stat-label">Standard Deviation</span>
                        <span class="stat-value">${formatNumber(result.stdDev)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Variance</span>
                        <span class="stat-value">${formatNumber(result.variance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.count.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range</span>
                        <span class="stat-value">[${formatNumber(result.min)}, ${formatNumber(result.max)}]</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">CV (%)</span>
                        <span class="stat-value">${result.coefficientOfVariation}</span>
                    </div>
                </div>`;
            if (result.standardError) {
                html += `
                    <div class="extra-stat">
                        <strong>Standard Error:</strong> ${formatNumber(result.standardError)}
                    </div>`;
            }
            break;

        case 'both':
            html += `
                <div class="comparison-grid">
                    <div class="comparison-item">
                        <h4>Population (σ)</h4>
                        <div class="big-number">${formatNumber(result.population.stdDev)}</div>
                        <p>Variance: ${formatNumber(result.population.variance)}</p>
                    </div>
                    <div class="comparison-item">
                        <h4>Sample (s)</h4>
                        <div class="big-number">${result.sample ? formatNumber(result.sample.stdDev) : 'N/A'}</div>
                        <p>Variance: ${result.sample ? formatNumber(result.sample.variance) : 'N/A'}</p>
                        ${result.sample ? `<p>Std Error: ${formatNumber(result.sample.standardError)}</p>` : ''}
                    </div>
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.count.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range</span>
                        <span class="stat-value">${formatNumber(result.range)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Difference</span>
                        <span class="stat-value">${result.difference}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Bessel Factor</span>
                        <span class="stat-value">${result.besselCorrection}</span>
                    </div>
                </div>`;
            break;

        case 'grouped':
            html += `
                <div class="formula-box">
                    <strong>${result.type}</strong><br>
                    <code>${result.formula}</code>
                </div>
                <div class="stat-grid">
                    <div class="stat-item highlight">
                        <span class="stat-label">Standard Deviation</span>
                        <span class="stat-value">${formatNumber(result.stdDev)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Variance</span>
                        <span class="stat-value">${formatNumber(result.variance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total Frequency</span>
                        <span class="stat-value">${result.totalFrequency.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Groups</span>
                        <span class="stat-value">${result.groups}</span>
                    </div>
                </div>`;
            break;

        case 'pooled':
            html += `
                <div class="formula-box">
                    <code>${result.formula}</code>
                </div>
                <div class="stat-grid">
                    <div class="stat-item highlight">
                        <span class="stat-label">Pooled Std Dev</span>
                        <span class="stat-value">${formatNumber(result.pooledStdDev)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Pooled Variance</span>
                        <span class="stat-value">${formatNumber(result.pooledVariance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Groups</span>
                        <span class="stat-value">${result.groupCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total N</span>
                        <span class="stat-value">${result.totalN}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Degrees of Freedom</span>
                        <span class="stat-value">${result.degreesOfFreedom}</span>
                    </div>
                </div>
                <h4>Group Statistics</h4>
                <table class="data-table">
                    <tr><th>Group</th><th>N</th><th>Mean</th><th>Std Dev</th><th>Variance</th></tr>
                    ${result.groupStats.map(g =>
                        `<tr><td>${g.group}</td><td>${g.n}</td><td>${g.mean}</td><td>${g.stdDev}</td><td>${g.variance}</td></tr>`
                    ).join('')}
                </table>`;
            break;

        case 'generate':
            html += `
                <div class="info-box">
                    <strong>Distribution:</strong> ${result.distribution}
                    ${result.params ? `<br><strong>Parameters:</strong> ${JSON.stringify(result.params)}` : ''}
                </div>
                <div class="comparison-grid">
                    <div class="comparison-item">
                        <h4>Population (σ)</h4>
                        <div class="big-number">${formatNumber(result.population.stdDev)}</div>
                    </div>
                    <div class="comparison-item">
                        <h4>Sample (s)</h4>
                        <div class="big-number">${result.sample ? formatNumber(result.sample.stdDev) : 'N/A'}</div>
                    </div>
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Generated</span>
                        <span class="stat-value">${result.generated.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range</span>
                        <span class="stat-value">${formatNumber(result.range)}</span>
                    </div>
                </div>
                <h4>Sample Data</h4>
                <div class="sample-data">${result.sample ? result.sample.join(', ') : ''}</div>`;
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function formatNumber(num) {
    if (typeof num === 'number') {
        if (Math.abs(num) >= 1000000) return num.toExponential(4);
        if (Math.abs(num) < 0.0001 && num !== 0) return num.toExponential(4);
        return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(6);
    }
    return num;
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;
    document.getElementById('dataInputGroup').style.display =
        ['population', 'sample', 'both'].includes(calcType) ? 'block' : 'none';
    document.getElementById('generateOptions').style.display = calcType === 'generate' ? 'block' : 'none';
    document.getElementById('groupedOptions').style.display = calcType === 'grouped' ? 'block' : 'none';
    document.getElementById('pooledOptions').style.display = calcType === 'pooled' ? 'block' : 'none';
}

function updateDistributionParams() {
    const distribution = document.getElementById('distribution').value;
    document.querySelectorAll('.dist-params').forEach(el => el.style.display = 'none');
    const paramDiv = document.getElementById(distribution + 'Params');
    if (paramDiv) paramDiv.style.display = 'block';
}

function loadSample() {
    document.getElementById('dataInput').value =
        '12.5, 15.3, 14.2, 16.1, 13.8, 15.9, 14.7, 16.4, 13.2, 15.1, 14.5, 15.8, 13.9, 16.2, 14.3';
}

// Initialize
updateOptions();
updateDistributionParams();
