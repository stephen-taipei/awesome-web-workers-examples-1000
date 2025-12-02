/**
 * Main Thread: Linear Regression Calculator
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

    calculateBtn.disabled = true;
    resultsDiv.innerHTML = '<p>Calculating...</p>';

    if (calcType === 'generate') {
        const count = parseInt(document.getElementById('generateCount').value) || 10000;
        const slope = parseFloat(document.getElementById('trueSlope').value) || 2;
        const intercept = parseFloat(document.getElementById('trueIntercept').value) || 5;
        const noise = parseFloat(document.getElementById('noiseLevel').value) || 10;
        worker.postMessage({ type: 'generate', count, slope, intercept, noise });
    } else if (calcType === 'predict') {
        const xInput = document.getElementById('dataX').value.trim();
        const yInput = document.getElementById('dataY').value.trim();
        const predictInput = document.getElementById('predictX').value.trim();

        const x = parseData(xInput);
        const y = parseData(yInput);
        const predictX = parseData(predictInput);

        if (!validateData(x, y)) return;

        worker.postMessage({ type: 'predict', data: { x, y, predictX } });
    } else {
        const xInput = document.getElementById('dataX').value.trim();
        const yInput = document.getElementById('dataY').value.trim();

        const x = parseData(xInput);
        const y = parseData(yInput);

        if (!validateData(x, y)) return;

        worker.postMessage({ type: calcType, data: { x, y } });
    }
}

function parseData(input) {
    return input.split(/[\s,;]+/)
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
}

function validateData(x, y) {
    if (x.length < 2 || y.length < 2) {
        resultsDiv.innerHTML = '<div class="error">Need at least 2 data points</div>';
        calculateBtn.disabled = false;
        return false;
    }
    if (x.length !== y.length) {
        resultsDiv.innerHTML = '<div class="error">X and Y must have same number of values</div>';
        calculateBtn.disabled = false;
        return false;
    }
    return true;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Linear Regression Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    const model = result.model || result;

    // Equation display
    html += `
        <div class="equation-display">
            <div class="equation">${model.equation}</div>
        </div>

        <div class="interpretation-box ${model.rSquared >= 0.7 ? 'good' : model.rSquared >= 0.4 ? 'moderate' : 'weak'}">
            ${model.interpretation}
        </div>`;

    // R-squared visualization
    html += `
        <h4>Model Fit</h4>
        <div class="r-squared-display">
            <div class="r-squared-bar">
                <div class="r-squared-fill" style="width: ${model.rSquared * 100}%"></div>
            </div>
            <div class="r-squared-label">
                <span>R² = ${formatNumber(model.rSquared)}</span>
                <span>${(model.rSquared * 100).toFixed(1)}% variance explained</span>
            </div>
        </div>`;

    // Model parameters
    html += `
        <h4>Model Parameters</h4>
        <div class="param-grid">
            <div class="param-item">
                <div class="param-label">Slope (β₁)</div>
                <div class="param-value">${formatNumber(model.slope)}</div>
                <div class="param-se">SE: ${formatNumber(model.seSlope)}</div>
            </div>
            <div class="param-item">
                <div class="param-label">Intercept (β₀)</div>
                <div class="param-value">${formatNumber(model.intercept)}</div>
                <div class="param-se">SE: ${formatNumber(model.seIntercept)}</div>
            </div>
        </div>`;

    // Statistics
    html += `
        <h4>Regression Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">R²</span>
                <span class="stat-value">${formatNumber(model.rSquared)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Adjusted R²</span>
                <span class="stat-value">${formatNumber(model.adjRSquared)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Correlation (r)</span>
                <span class="stat-value">${formatNumber(model.r)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Std Error</span>
                <span class="stat-value">${formatNumber(model.standardError)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">F-Statistic</span>
                <span class="stat-value">${formatNumber(model.fStatistic)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Sample Size</span>
                <span class="stat-value">${model.n.toLocaleString()}</span>
            </div>
        </div>`;

    // Sum of squares
    html += `
        <h4>ANOVA Table</h4>
        <div class="table-container">
            <table class="anova-table">
                <thead>
                    <tr>
                        <th>Source</th>
                        <th>SS</th>
                        <th>df</th>
                        <th>MS</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Regression</td>
                        <td>${formatNumber(model.SSE)}</td>
                        <td>1</td>
                        <td>${formatNumber(model.SSE)}</td>
                    </tr>
                    <tr>
                        <td>Residual</td>
                        <td>${formatNumber(model.SSR)}</td>
                        <td>${model.n - 2}</td>
                        <td>${formatNumber(model.SSR / (model.n - 2))}</td>
                    </tr>
                    <tr class="total-row">
                        <td>Total</td>
                        <td>${formatNumber(model.SST)}</td>
                        <td>${model.n - 1}</td>
                        <td>-</td>
                    </tr>
                </tbody>
            </table>
        </div>`;

    // Predictions (if applicable)
    if (result.predictions) {
        html += `
            <h4>Predictions</h4>
            <div class="table-container">
                <table class="prediction-table">
                    <thead>
                        <tr>
                            <th>X</th>
                            <th>Predicted Y</th>
                            <th>95% CI Lower</th>
                            <th>95% CI Upper</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.predictions.map(p => `
                            <tr>
                                <td>${formatNumber(p.x)}</td>
                                <td><strong>${formatNumber(p.predicted)}</strong></td>
                                <td>${formatNumber(p.lower)}</td>
                                <td>${formatNumber(p.upper)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    // Residuals (if applicable)
    if (result.residuals) {
        html += `
            <h4>Residual Analysis</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Mean Residual</span>
                    <span class="stat-value">${formatNumber(result.meanResidual)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Durbin-Watson</span>
                    <span class="stat-value">${formatNumber(result.durbinWatson)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Outliers</span>
                    <span class="stat-value">${result.outlierCount}</span>
                </div>
            </div>

            <div class="table-container">
                <table class="residual-table">
                    <thead>
                        <tr>
                            <th>i</th>
                            <th>X</th>
                            <th>Y</th>
                            <th>Ŷ</th>
                            <th>Residual</th>
                            <th>Std. Res.</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.residuals.slice(0, 20).map(r => `
                            <tr class="${Math.abs(r.standardized) > 2 ? 'outlier' : ''}">
                                <td>${r.index}</td>
                                <td>${formatNumber(r.x)}</td>
                                <td>${formatNumber(r.y)}</td>
                                <td>${formatNumber(r.predicted)}</td>
                                <td>${formatNumber(r.residual)}</td>
                                <td>${formatNumber(r.standardized)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;
    }

    // Generated data info
    if (result.trueSlope !== undefined) {
        html += `
            <h4>Parameter Recovery</h4>
            <div class="info-box">
                <p><strong>True Parameters:</strong> y = ${result.trueSlope}x + ${result.trueIntercept} (noise: ±${result.noiseLevel})</p>
                <p><strong>Estimated:</strong> ${model.equation}</p>
                <p><strong>Slope Error:</strong> ${formatNumber(result.slopeError)} (${formatNumber(result.slopeRecovery)}% accuracy)</p>
            </div>

            <h4>Sample Data</h4>
            <div class="sample-data">
                X: [${result.sampleX.join(', ')}]<br>
                Y: [${result.sampleY.join(', ')}]
            </div>`;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
    if (typeof num === 'number') {
        if (Math.abs(num) >= 100000) return num.toExponential(3);
        if (Number.isInteger(num)) return num.toLocaleString();
        return num.toFixed(4);
    }
    return num;
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;
    document.getElementById('dataInputs').style.display = calcType === 'generate' ? 'none' : 'block';
    document.getElementById('generateOptions').style.display = calcType === 'generate' ? 'block' : 'none';
    document.getElementById('predictInputs').style.display = calcType === 'predict' ? 'block' : 'none';
}

function loadSample(type) {
    let x, y;
    switch (type) {
        case 'perfect':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [3, 5, 7, 9, 11, 13, 15, 17, 19, 21];
            break;
        case 'strong':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [2.1, 4.3, 5.8, 8.2, 10.1, 11.8, 14.2, 15.9, 18.1, 20.3];
            break;
        case 'weak':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [5, 12, 8, 15, 10, 18, 14, 20, 16, 22];
            break;
        case 'negative':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [20, 18, 16, 14, 12, 10, 8, 6, 4, 2];
            break;
        default:
            x = Array.from({ length: 20 }, () => Math.round(Math.random() * 100));
            y = x.map(v => v * 2 + 5 + (Math.random() - 0.5) * 20);
    }

    document.getElementById('dataX').value = x.map(v => typeof v === 'number' && v % 1 !== 0 ? v.toFixed(1) : v).join(', ');
    document.getElementById('dataY').value = y.map(v => typeof v === 'number' && v % 1 !== 0 ? v.toFixed(1) : v).join(', ');
}

// Initialize
updateOptions();
