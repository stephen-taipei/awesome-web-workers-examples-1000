/**
 * Main Thread: Kurtosis Calculator
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

        if (data.length < 4) {
            resultsDiv.innerHTML = '<div class="error">Need at least 4 data points for kurtosis</div>';
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
        case 'normal':
            return {
                mean: parseFloat(document.getElementById('normalMean').value) || 50,
                stdDev: parseFloat(document.getElementById('normalStdDev').value) || 15
            };
        case 'uniform':
            return {
                min: parseFloat(document.getElementById('uniformMin').value) || 0,
                max: parseFloat(document.getElementById('uniformMax').value) || 100
            };
        case 'laplace':
            return {
                mu: parseFloat(document.getElementById('laplaceMu').value) || 0,
                b: parseFloat(document.getElementById('laplaceB').value) || 1
            };
        case 't':
            return {
                df: parseFloat(document.getElementById('tDf').value) || 5
            };
        case 'exponential':
            return {
                lambda: parseFloat(document.getElementById('expLambda').value) || 1
            };
        default:
            return {};
    }
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Kurtosis Analysis Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    const shapeClass = getShapeClass(result.shape || result.excessKurtosis);

    switch (calculationType) {
        case 'excess':
        case 'fisher':
            html += `
                <div class="kurtosis-display ${shapeClass}">
                    <div class="k-value">${formatNumber(result.excessKurtosis)}</div>
                    <div class="k-type">${result.type}</div>
                    <div class="k-shape">${result.shape}</div>
                </div>
                <div class="formula-box">
                    <code>${result.formula}</code>
                </div>
                <div class="interpretation-box ${shapeClass}">
                    ${result.interpretation}
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Adjusted (G2)</span>
                        <span class="stat-value">${formatNumber(result.adjustedKurtosis)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Std Error</span>
                        <span class="stat-value">${formatNumber(result.standardError)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Z-Score</span>
                        <span class="stat-value">${formatNumber(result.zScore)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.n.toLocaleString()}</span>
                    </div>
                </div>`;
            break;

        case 'pearson':
            html += `
                <div class="comparison-grid">
                    <div class="comparison-item ${shapeClass}">
                        <h4>Pearson's β₂</h4>
                        <div class="big-number">${formatNumber(result.pearsonKurtosis)}</div>
                        <p>Normal = 3</p>
                    </div>
                    <div class="comparison-item ${shapeClass}">
                        <h4>Excess Kurtosis</h4>
                        <div class="big-number">${formatNumber(result.excessKurtosis)}</div>
                        <p>Normal = 0</p>
                    </div>
                </div>
                <div class="interpretation-box ${shapeClass}">
                    ${result.interpretation}
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Std Dev</span>
                        <span class="stat-value">${formatNumber(result.stdDev)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.n.toLocaleString()}</span>
                    </div>
                </div>`;
            break;

        case 'all':
            html += `
                <div class="shape-display ${shapeClass}">
                    <div class="shape-icon">${getShapeIcon(result.shape)}</div>
                    <div class="shape-name">${result.shape}</div>
                    <div class="shape-desc">${result.tailDescription}</div>
                </div>

                <h4>Kurtosis Measures</h4>
                <div class="stat-grid">
                    <div class="stat-item ${shapeClass}">
                        <span class="stat-label">Pearson β₂</span>
                        <span class="stat-value">${formatNumber(result.pearsonKurtosis)}</span>
                    </div>
                    <div class="stat-item highlight ${shapeClass}">
                        <span class="stat-label">Excess (g₂)</span>
                        <span class="stat-value">${formatNumber(result.excessKurtosis)}</span>
                    </div>
                    <div class="stat-item ${shapeClass}">
                        <span class="stat-label">Adjusted (G₂)</span>
                        <span class="stat-value">${formatNumber(result.adjustedKurtosis)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Quartile Kurt</span>
                        <span class="stat-value">${formatNumber(result.quartileKurtosis)}</span>
                    </div>
                </div>

                <h4>Related Measures</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Skewness</span>
                        <span class="stat-value">${formatNumber(result.skewness)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Std Error</span>
                        <span class="stat-value">${result.standardError ? formatNumber(result.standardError) : 'N/A'}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Z-Score</span>
                        <span class="stat-value">${result.zScore ? formatNumber(result.zScore) : 'N/A'}</span>
                    </div>
                </div>

                <h4>Basic Statistics</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.n.toLocaleString()}</span>
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
                        <span class="stat-value">${formatNumber(result.range)}</span>
                    </div>
                </div>`;
            break;

        case 'generate':
            html += `
                <div class="info-box">
                    <strong>Distribution:</strong> ${result.distribution}
                    <br><strong>Generated:</strong> ${result.generated.toLocaleString()} values
                    ${result.theoreticalKurtosis !== null ?
                        `<br><strong>Theoretical Kurtosis:</strong> ${formatNumber(result.theoreticalKurtosis)}` : ''}
                </div>

                <div class="shape-display ${shapeClass}">
                    <div class="shape-icon">${getShapeIcon(result.shape)}</div>
                    <div class="shape-name">${result.shape}</div>
                    <div class="shape-desc">${result.tailDescription}</div>
                </div>

                <h4>Kurtosis Measures</h4>
                <div class="stat-grid">
                    <div class="stat-item highlight ${shapeClass}">
                        <span class="stat-label">Excess Kurtosis</span>
                        <span class="stat-value">${formatNumber(result.excessKurtosis)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Pearson β₂</span>
                        <span class="stat-value">${formatNumber(result.pearsonKurtosis)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Skewness</span>
                        <span class="stat-value">${formatNumber(result.skewness)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Std Dev</span>
                        <span class="stat-value">${formatNumber(result.stdDev)}</span>
                    </div>
                </div>

                <h4>Sample Data</h4>
                <div class="sample-data">${result.sample.join(', ')}</div>`;
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function getShapeClass(shapeOrValue) {
    if (typeof shapeOrValue === 'string') {
        if (shapeOrValue === 'Mesokurtic') return 'mesokurtic';
        if (shapeOrValue === 'Leptokurtic') return 'leptokurtic';
        return 'platykurtic';
    }
    if (Math.abs(shapeOrValue) < 0.5) return 'mesokurtic';
    return shapeOrValue > 0 ? 'leptokurtic' : 'platykurtic';
}

function getShapeIcon(shape) {
    if (shape === 'Mesokurtic') return '🔔';
    if (shape === 'Leptokurtic') return '📍';
    return '🫓';
}

function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
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

function loadSample(type) {
    let data;
    switch (type) {
        case 'normal':
            // Generate normal-like data
            data = [];
            for (let i = 0; i < 100; i++) {
                const u1 = Math.random(), u2 = Math.random();
                data.push(50 + 10 * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2));
            }
            break;
        case 'heavy':
            // Heavy tails (leptokurtic)
            data = [1, 2, 3, 4, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 6, 7, 8, 9, 100];
            break;
        case 'light':
            // Light tails (platykurtic) - uniform-like
            data = Array.from({length: 50}, (_, i) => i * 2);
            break;
        default:
            data = Array.from({length: 50}, () => Math.round(Math.random() * 100));
    }
    document.getElementById('dataInput').value = data.map(x => x.toFixed ? x.toFixed(2) : x).join(', ');
}

// Initialize
updateOptions();
updateDistributionParams();
