/**
 * Main Thread: Skewness Calculator
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
        case 'normal':
            return {
                mean: parseFloat(document.getElementById('normalMean').value) || 50,
                stdDev: parseFloat(document.getElementById('normalStdDev').value) || 15
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
        case 'gamma':
            return {
                shape: parseFloat(document.getElementById('gammaShape').value) || 2,
                scale: parseFloat(document.getElementById('gammaScale').value) || 1
            };
        case 'beta':
            return {
                a: parseFloat(document.getElementById('betaA').value) || 2,
                b: parseFloat(document.getElementById('betaB').value) || 5
            };
        case 'weibull':
            return {
                k: parseFloat(document.getElementById('weibullK').value) || 1.5,
                lambda: parseFloat(document.getElementById('weibullLambda').value) || 1
            };
        default:
            return {};
    }
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Skewness Analysis Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'fisher':
        case 'adjusted':
            html += `
                <div class="skewness-display ${getSkewnessClass(result.skewness)}">
                    <div class="sk-value">${formatNumber(result.skewness)}</div>
                    <div class="sk-type">${result.type}</div>
                    <div class="sk-direction">${result.direction}</div>
                </div>
                <div class="formula-box">
                    <code>${result.formula}</code>
                </div>
                <div class="interpretation-box ${getInterpretationClass(result.interpretation)}">
                    ${result.interpretation}
                </div>`;

            if (result.standardError) {
                html += `
                    <h4>Statistical Significance</h4>
                    <div class="stat-grid">
                        <div class="stat-item">
                            <span class="stat-label">Standard Error</span>
                            <span class="stat-value">${formatNumber(result.standardError)}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Z-Score</span>
                            <span class="stat-value">${formatNumber(result.zScore)}</span>
                        </div>
                        <div class="stat-item ${result.significantAt005 ? 'highlight' : ''}">
                            <span class="stat-label">Significant (α=0.05)</span>
                            <span class="stat-value">${result.significantAt005 ? 'Yes' : 'No'}</span>
                        </div>
                    </div>`;
            }

            html += `
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
                        <span class="stat-value">${formatNumber(result.min)} - ${formatNumber(result.max)}</span>
                    </div>
                </div>`;
            break;

        case 'pearson':
            html += `
                <div class="comparison-grid">
                    <div class="comparison-item ${getSkewnessClass(result.pearsonFirst)}">
                        <h4>Pearson's First</h4>
                        <div class="big-number">${formatNumber(result.pearsonFirst)}</div>
                        <p>Mode-based</p>
                    </div>
                    <div class="comparison-item ${getSkewnessClass(result.pearsonSecond)}">
                        <h4>Pearson's Second</h4>
                        <div class="big-number">${formatNumber(result.pearsonSecond)}</div>
                        <p>Median-based</p>
                    </div>
                </div>
                <div class="formula-box">
                    <p><strong>First:</strong> <code>${result.formulaFirst}</code></p>
                    <p><strong>Second:</strong> <code>${result.formulaSecond}</code></p>
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Median</span>
                        <span class="stat-value">${formatNumber(result.median)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Est. Mode</span>
                        <span class="stat-value">${formatNumber(result.estimatedMode)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Std Dev</span>
                        <span class="stat-value">${formatNumber(result.stdDev)}</span>
                    </div>
                </div>`;
            break;

        case 'bowley':
            html += `
                <div class="comparison-grid">
                    <div class="comparison-item ${getSkewnessClass(result.bowleySkewness * 3)}">
                        <h4>Bowley's Skewness</h4>
                        <div class="big-number">${formatNumber(result.bowleySkewness)}</div>
                        <p>Quartile-based</p>
                    </div>
                    <div class="comparison-item ${getSkewnessClass(result.kellySkewness * 3)}">
                        <h4>Kelly's Skewness</h4>
                        <div class="big-number">${formatNumber(result.kellySkewness)}</div>
                        <p>Decile-based</p>
                    </div>
                </div>
                <div class="formula-box">
                    <code>${result.formula}</code>
                </div>
                <div class="interpretation-box ${getInterpretationClass(result.interpretation)}">
                    ${result.interpretation}
                </div>
                <h4>Quartile Values</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Q1</span>
                        <span class="stat-value">${formatNumber(result.Q1)}</span>
                    </div>
                    <div class="stat-item highlight">
                        <span class="stat-label">Q2 (Median)</span>
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
                </div>`;
            break;

        case 'all':
            html += `
                <div class="shape-display ${getSkewnessClass(result.fisherPearson.G1)}">
                    <div class="shape-title">Distribution Shape</div>
                    <div class="shape-description">${result.distributionShape}</div>
                </div>

                <h4>Skewness Measures</h4>
                <div class="stat-grid">
                    <div class="stat-item ${getSkewnessClass(result.fisherPearson.g1)}">
                        <span class="stat-label">Fisher g1</span>
                        <span class="stat-value">${formatNumber(result.fisherPearson.g1)}</span>
                    </div>
                    <div class="stat-item highlight ${getSkewnessClass(result.fisherPearson.G1)}">
                        <span class="stat-label">Adjusted G1</span>
                        <span class="stat-value">${formatNumber(result.fisherPearson.G1)}</span>
                    </div>
                    <div class="stat-item ${getSkewnessClass(result.pearsonSecond)}">
                        <span class="stat-label">Pearson 2nd</span>
                        <span class="stat-value">${formatNumber(result.pearsonSecond)}</span>
                    </div>
                    <div class="stat-item ${getSkewnessClass(result.bowley * 3)}">
                        <span class="stat-label">Bowley</span>
                        <span class="stat-value">${formatNumber(result.bowley)}</span>
                    </div>
                </div>

                <h4>Related Measures</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Excess Kurtosis</span>
                        <span class="stat-value">${formatNumber(result.excessKurtosis)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Z-Score</span>
                        <span class="stat-value">${formatNumber(result.fisherPearson.zScore)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Std Error</span>
                        <span class="stat-value">${formatNumber(result.fisherPearson.standardError)}</span>
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
                        <span class="stat-label">Median</span>
                        <span class="stat-value">${formatNumber(result.quartiles.Q2)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Std Dev</span>
                        <span class="stat-value">${formatNumber(result.stdDev)}</span>
                    </div>
                </div>`;
            break;

        case 'generate':
            html += `
                <div class="info-box">
                    <strong>Distribution:</strong> ${result.distribution}
                    <br><strong>Generated:</strong> ${result.generated.toLocaleString()} values
                    ${result.theoreticalSkewness !== null ?
                        `<br><strong>Theoretical Skewness:</strong> ${formatNumber(result.theoreticalSkewness)}` : ''}
                </div>

                <div class="shape-display ${getSkewnessClass(result.fisherPearson.G1)}">
                    <div class="shape-title">Distribution Shape</div>
                    <div class="shape-description">${result.distributionShape}</div>
                </div>

                <h4>Skewness Measures</h4>
                <div class="stat-grid">
                    <div class="stat-item highlight ${getSkewnessClass(result.fisherPearson.G1)}">
                        <span class="stat-label">Adjusted G1</span>
                        <span class="stat-value">${formatNumber(result.fisherPearson.G1)}</span>
                    </div>
                    <div class="stat-item ${getSkewnessClass(result.pearsonSecond)}">
                        <span class="stat-label">Pearson 2nd</span>
                        <span class="stat-value">${formatNumber(result.pearsonSecond)}</span>
                    </div>
                    <div class="stat-item ${getSkewnessClass(result.bowley * 3)}">
                        <span class="stat-label">Bowley</span>
                        <span class="stat-value">${formatNumber(result.bowley)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Kurtosis</span>
                        <span class="stat-value">${formatNumber(result.excessKurtosis)}</span>
                    </div>
                </div>

                <h4>Sample Data</h4>
                <div class="sample-data">${result.sample.join(', ')}</div>`;
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function getSkewnessClass(sk) {
    if (Math.abs(sk) < 0.5) return 'symmetric';
    return sk > 0 ? 'right-skewed' : 'left-skewed';
}

function getInterpretationClass(interp) {
    if (interp.includes('symmetric')) return 'symmetric';
    if (interp.includes('Highly')) return 'highly-skewed';
    return 'moderate-skewed';
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

function loadSample(type) {
    let data;
    switch (type) {
        case 'symmetric':
            data = [10, 20, 30, 40, 50, 50, 60, 70, 80, 90];
            break;
        case 'right':
            data = [1, 2, 3, 4, 5, 6, 7, 10, 15, 25, 50];
            break;
        case 'left':
            data = [50, 75, 85, 90, 93, 94, 95, 96, 97, 98, 99];
            break;
        default:
            data = Array.from({length: 50}, () => Math.round(Math.random() * 100));
    }
    document.getElementById('dataInput').value = data.join(', ');
}

// Initialize
updateOptions();
updateDistributionParams();
