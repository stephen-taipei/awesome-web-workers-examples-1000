/**
 * Main Thread: Quartile Calculator
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
                stdDev: parseFloat(document.getElementById('normalStdDev').value) || 15
            };
        case 'exponential':
        case 'skewedLeft':
            return {
                lambda: parseFloat(document.getElementById('expLambda').value) || 0.1
            };
        case 'skewedRight':
            return {
                mu: parseFloat(document.getElementById('lognormalMu').value) || 3,
                sigma: parseFloat(document.getElementById('lognormalSigma').value) || 0.5
            };
        default:
            return {};
    }
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Quartile Analysis Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'quartiles':
            html += `
                <div class="quartile-display">
                    <div class="quartile-item q1">
                        <span class="q-label">Q1 (25%)</span>
                        <span class="q-value">${formatNumber(result.Q1)}</span>
                    </div>
                    <div class="quartile-item q2">
                        <span class="q-label">Q2 (Median)</span>
                        <span class="q-value">${formatNumber(result.Q2)}</span>
                    </div>
                    <div class="quartile-item q3">
                        <span class="q-label">Q3 (75%)</span>
                        <span class="q-value">${formatNumber(result.Q3)}</span>
                    </div>
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">IQR</span>
                        <span class="stat-value">${formatNumber(result.IQR)}</span>
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
                        <span class="stat-label">Range</span>
                        <span class="stat-value">${formatNumber(result.range)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Quartile Skewness</span>
                        <span class="stat-value">${formatNumber(result.quartileSkewness)}</span>
                    </div>
                </div>`;
            break;

        case 'iqr':
            html += `
                <div class="stat-grid">
                    <div class="stat-item highlight">
                        <span class="stat-label">IQR</span>
                        <span class="stat-value">${formatNumber(result.IQR)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Q1</span>
                        <span class="stat-value">${formatNumber(result.Q1)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Q3</span>
                        <span class="stat-value">${formatNumber(result.Q3)}</span>
                    </div>
                </div>
                <h4>Outlier Fences</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Lower Fence</span>
                        <span class="stat-value">${formatNumber(result.lowerFence)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Upper Fence</span>
                        <span class="stat-value">${formatNumber(result.upperFence)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Extreme Lower</span>
                        <span class="stat-value">${formatNumber(result.extremeLowerFence)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Extreme Upper</span>
                        <span class="stat-value">${formatNumber(result.extremeUpperFence)}</span>
                    </div>
                </div>
                <h4>Outlier Detection</h4>
                <div class="stat-grid">
                    <div class="stat-item ${result.totalOutliers > 0 ? 'warning' : ''}">
                        <span class="stat-label">Total Outliers</span>
                        <span class="stat-value">${result.totalOutliers} (${result.outlierPercentage}%)</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mild Outliers</span>
                        <span class="stat-value">${result.mildOutliers}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Extreme Outliers</span>
                        <span class="stat-value">${result.extremeOutliers}</span>
                    </div>
                </div>
                ${result.outlierValues.length > 0 ? `
                    <h4>Outlier Values</h4>
                    <div class="outlier-list">
                        ${result.outlierValues.map(o =>
                            `<span class="outlier-chip ${o.type}">${formatNumber(o.value)}</span>`
                        ).join('')}
                    </div>
                ` : ''}`;
            break;

        case 'boxplot':
            html += `
                ${drawBoxPlot(result)}
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Min</span>
                        <span class="stat-value">${formatNumber(result.min)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Q1</span>
                        <span class="stat-value">${formatNumber(result.Q1)}</span>
                    </div>
                    <div class="stat-item highlight">
                        <span class="stat-label">Median</span>
                        <span class="stat-value">${formatNumber(result.Q2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Q3</span>
                        <span class="stat-value">${formatNumber(result.Q3)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Max</span>
                        <span class="stat-value">${formatNumber(result.max)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">IQR</span>
                        <span class="stat-value">${formatNumber(result.IQR)}</span>
                    </div>
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Lower Whisker</span>
                        <span class="stat-value">${formatNumber(result.lowerWhisker)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Upper Whisker</span>
                        <span class="stat-value">${formatNumber(result.upperWhisker)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Outliers</span>
                        <span class="stat-value">${result.outlierCount}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                </div>`;
            break;

        case 'fiveNumber':
            html += `
                <div class="five-number">
                    <div class="fn-item">
                        <span class="fn-label">Min</span>
                        <span class="fn-value">${formatNumber(result.fiveNumber.min)}</span>
                    </div>
                    <div class="fn-item">
                        <span class="fn-label">Q1</span>
                        <span class="fn-value">${formatNumber(result.fiveNumber.Q1)}</span>
                    </div>
                    <div class="fn-item highlight">
                        <span class="fn-label">Median</span>
                        <span class="fn-value">${formatNumber(result.fiveNumber.Q2)}</span>
                    </div>
                    <div class="fn-item">
                        <span class="fn-label">Q3</span>
                        <span class="fn-value">${formatNumber(result.fiveNumber.Q3)}</span>
                    </div>
                    <div class="fn-item">
                        <span class="fn-label">Max</span>
                        <span class="fn-value">${formatNumber(result.fiveNumber.max)}</span>
                    </div>
                </div>
                <h4>Measures of Spread</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">IQR</span>
                        <span class="stat-value">${formatNumber(result.IQR)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range</span>
                        <span class="stat-value">${formatNumber(result.range)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Semi-IQR</span>
                        <span class="stat-value">${formatNumber(result.semiIQR)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Std Dev</span>
                        <span class="stat-value">${formatNumber(result.stdDev)}</span>
                    </div>
                </div>
                <h4>Measures of Center</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Midhinge</span>
                        <span class="stat-value">${formatNumber(result.midhinge)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Midrange</span>
                        <span class="stat-value">${formatNumber(result.midrange)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Trimean</span>
                        <span class="stat-value">${formatNumber(result.trimean)}</span>
                    </div>
                </div>`;
            break;

        case 'deciles':
            html += `
                <h4>Deciles</h4>
                <table class="data-table">
                    <tr><th>Decile</th><th>Percentile</th><th>Value</th></tr>
                    ${Object.entries(result.deciles).map(([k, v]) =>
                        `<tr><td>${k}</td><td>${parseInt(k.slice(1)) * 10}%</td><td>${formatNumber(v)}</td></tr>`
                    ).join('')}
                </table>
                <h4>Quintiles</h4>
                <div class="stat-grid">
                    ${Object.entries(result.quintiles).map(([k, v]) => `
                        <div class="stat-item">
                            <span class="stat-label">${k}</span>
                            <span class="stat-value">${formatNumber(v)}</span>
                        </div>
                    `).join('')}
                </div>`;
            break;

        case 'generate':
            html += `
                <div class="info-box">
                    <strong>Distribution:</strong> ${result.distribution}
                    <br><strong>Generated:</strong> ${result.generated.toLocaleString()} values
                </div>
                ${drawBoxPlot(result)}
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Q1</span>
                        <span class="stat-value">${formatNumber(result.Q1)}</span>
                    </div>
                    <div class="stat-item highlight">
                        <span class="stat-label">Median</span>
                        <span class="stat-value">${formatNumber(result.Q2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Q3</span>
                        <span class="stat-value">${formatNumber(result.Q3)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">IQR</span>
                        <span class="stat-value">${formatNumber(result.IQR)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Outliers</span>
                        <span class="stat-value">${result.outlierCount}</span>
                    </div>
                </div>
                <h4>Sample Data</h4>
                <div class="sample-data">${result.sample.join(', ')}</div>`;
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function drawBoxPlot(result) {
    const { min, Q1, Q2, Q3, max, lowerWhisker, upperWhisker, mean, outliers = [] } = result;
    const range = max - min;
    const padding = range * 0.1;
    const plotMin = min - padding;
    const plotMax = max + padding;
    const plotRange = plotMax - plotMin;

    const toPercent = (val) => ((val - plotMin) / plotRange * 100).toFixed(1);

    return `
        <div class="boxplot-container">
            <div class="boxplot">
                <div class="whisker-line" style="left: ${toPercent(lowerWhisker)}%; width: ${toPercent(Q1) - toPercent(lowerWhisker)}%;"></div>
                <div class="whisker-cap" style="left: ${toPercent(lowerWhisker)}%;"></div>
                <div class="box" style="left: ${toPercent(Q1)}%; width: ${toPercent(Q3) - toPercent(Q1)}%;">
                    <div class="median-line" style="left: ${((Q2 - Q1) / (Q3 - Q1) * 100).toFixed(1)}%;"></div>
                    <div class="mean-marker" style="left: ${((mean - Q1) / (Q3 - Q1) * 100).toFixed(1)}%;">+</div>
                </div>
                <div class="whisker-line" style="left: ${toPercent(Q3)}%; width: ${toPercent(upperWhisker) - toPercent(Q3)}%;"></div>
                <div class="whisker-cap" style="left: ${toPercent(upperWhisker)}%;"></div>
                ${outliers.slice(0, 20).map(o =>
                    `<div class="outlier-dot" style="left: ${toPercent(o)}%;"></div>`
                ).join('')}
            </div>
            <div class="boxplot-labels">
                <span style="left: ${toPercent(lowerWhisker)}%;">${formatNumber(lowerWhisker)}</span>
                <span style="left: ${toPercent(Q1)}%;">Q1</span>
                <span style="left: ${toPercent(Q2)}%;">Med</span>
                <span style="left: ${toPercent(Q3)}%;">Q3</span>
                <span style="left: ${toPercent(upperWhisker)}%;">${formatNumber(upperWhisker)}</span>
            </div>
        </div>`;
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
    document.getElementById('dataInputGroup').style.display = calcType === 'generate' ? 'none' : 'block';
    document.getElementById('generateOptions').style.display = calcType === 'generate' ? 'block' : 'none';
}

function updateDistributionParams() {
    const distribution = document.getElementById('distribution').value;
    document.querySelectorAll('.dist-params').forEach(el => el.style.display = 'none');
    const paramDiv = document.getElementById(distribution + 'Params');
    if (paramDiv) paramDiv.style.display = 'block';
}

function loadSample() {
    const sample = [12, 15, 18, 21, 23, 25, 27, 29, 31, 33, 35, 37, 39, 42, 45, 48, 52, 55, 58, 62, 95];
    document.getElementById('dataInput').value = sample.join(', ');
}

// Initialize
updateOptions();
updateDistributionParams();
