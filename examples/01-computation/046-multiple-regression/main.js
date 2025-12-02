/**
 * Main Thread: Multiple Regression Calculator
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
        const n = parseInt(document.getElementById('generateCount').value) || 1000;
        const numVars = parseInt(document.getElementById('numVars').value) || 3;
        const coeffStr = document.getElementById('trueCoefficients').value;
        const trueCoeffs = coeffStr.split(',').map(s => parseFloat(s.trim())).filter(v => !isNaN(v));
        const noise = parseFloat(document.getElementById('noiseLevel').value) || 5;

        if (trueCoeffs.length !== numVars + 1) {
            resultsDiv.innerHTML = `<div class="error">Need ${numVars + 1} coefficients (intercept + ${numVars} slopes)</div>`;
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: 'generate', n, numVars, trueCoeffs, noise });
    } else {
        const { X, y } = parseMatrixData();

        if (!X || !y) return;

        if (calcType === 'stepwise') {
            const method = document.getElementById('stepwiseMethod').value;
            worker.postMessage({ type: 'stepwise', data: { X, y, method } });
        } else if (calcType === 'predict') {
            const newX = parseNewX();
            if (!newX) return;
            worker.postMessage({ type: 'predict', data: { X, y, newX } });
        } else {
            worker.postMessage({ type: 'fit', data: { X, y } });
        }
    }
}

function parseMatrixData() {
    const xInput = document.getElementById('dataX').value.trim();
    const yInput = document.getElementById('dataY').value.trim();

    const yValues = yInput.split(/[\s,;]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v));

    if (yValues.length < 3) {
        resultsDiv.innerHTML = '<div class="error">Need at least 3 Y values</div>';
        calculateBtn.disabled = false;
        return { X: null, y: null };
    }

    // Parse X as matrix (rows separated by newlines or semicolons)
    const xRows = xInput.split(/[;\n]+/).filter(r => r.trim());
    const X = xRows.map(row =>
        row.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v))
    );

    if (X.length !== yValues.length) {
        resultsDiv.innerHTML = '<div class="error">Number of X rows must match Y values</div>';
        calculateBtn.disabled = false;
        return { X: null, y: null };
    }

    const numVars = X[0].length;
    for (const row of X) {
        if (row.length !== numVars) {
            resultsDiv.innerHTML = '<div class="error">All X rows must have same number of variables</div>';
            calculateBtn.disabled = false;
            return { X: null, y: null };
        }
    }

    return { X, y: yValues };
}

function parseNewX() {
    const input = document.getElementById('newX').value.trim();
    const rows = input.split(/[;\n]+/).filter(r => r.trim());
    const newX = rows.map(row =>
        row.split(/[\s,]+/).map(s => parseFloat(s.trim())).filter(v => !isNaN(v))
    );

    if (newX.length === 0) {
        resultsDiv.innerHTML = '<div class="error">Enter X values to predict</div>';
        calculateBtn.disabled = false;
        return null;
    }

    return newX;
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Multiple Regression Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    if (calculationType === 'stepwise') {
        html += displayStepwise(result);
    } else {
        const model = result.model || result;

        // Equation
        html += `
            <div class="equation-display">
                <div class="equation">${model.equation}</div>
            </div>

            <div class="interpretation-box ${model.rSquared >= 0.7 ? 'good' : model.rSquared >= 0.4 ? 'moderate' : 'weak'}">
                ${model.interpretation}
            </div>`;

        // R² visualization
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

        // Coefficients table
        html += `
            <h4>Coefficients</h4>
            <div class="table-container">
                <table class="coeff-table">
                    <thead>
                        <tr>
                            <th>Variable</th>
                            <th>Coefficient</th>
                            <th>Std Error</th>
                            <th>t-Statistic</th>
                            <th>VIF</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>Intercept</td>
                            <td>${formatNumber(model.intercept)}</td>
                            <td>${formatNumber(model.standardErrors[0])}</td>
                            <td>${formatNumber(model.tStatistics[0])}</td>
                            <td>-</td>
                        </tr>
                        ${model.slopes.map((s, i) => `
                            <tr class="${model.vif[i] > 10 ? 'warning' : model.vif[i] > 5 ? 'caution' : ''}">
                                <td>X${i + 1}</td>
                                <td>${formatNumber(s)}</td>
                                <td>${formatNumber(model.standardErrors[i + 1])}</td>
                                <td>${formatNumber(model.tStatistics[i + 1])}</td>
                                <td>${formatNumber(model.vif[i])}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>`;

        // Statistics
        html += `
            <h4>Model Statistics</h4>
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
                    <span class="stat-label">RMSE</span>
                    <span class="stat-value">${formatNumber(model.RMSE)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">F-Statistic</span>
                    <span class="stat-value">${formatNumber(model.fStatistic)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">AIC</span>
                    <span class="stat-value">${formatNumber(model.AIC)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Observations</span>
                    <span class="stat-value">${model.n}</span>
                </div>
            </div>`;

        // Predictions
        if (result.predictions && calculationType === 'predict') {
            html += `
                <h4>Predictions</h4>
                <div class="table-container">
                    <table class="prediction-table">
                        <thead>
                            <tr>
                                <th>X Values</th>
                                <th>Predicted Y</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${result.predictions.map(p => `
                                <tr>
                                    <td>[${p.x.map(v => formatNumber(v)).join(', ')}]</td>
                                    <td><strong>${formatNumber(p.predicted)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        }

        // Generated data
        if (result.trueCoefficients) {
            html += `
                <h4>Parameter Recovery</h4>
                <div class="info-box">
                    <p><strong>True Coefficients:</strong> [${result.trueCoefficients.join(', ')}]</p>
                    <p><strong>Estimated:</strong> [${model.coefficients.map(c => c.toFixed(4)).join(', ')}]</p>
                </div>`;
        }
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function displayStepwise(result) {
    let html = `
        <h4>${result.method}</h4>
        <div class="recommendation-box">
            <strong>Final Variables:</strong> ${result.finalVariables.join(', ')}
        </div>

        <div class="table-container">
            <table class="stepwise-table">
                <thead>
                    <tr>
                        <th>Step</th>
                        <th>${result.method.includes('Forward') ? 'Added' : 'Removed'}</th>
                        <th>Variables</th>
                        <th>R²</th>
                        <th>Adj R²</th>
                        <th>AIC</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.steps.map(s => `
                        <tr>
                            <td>${s.step}</td>
                            <td>X${s.addedVar || s.removedVar}</td>
                            <td>[${s.variables.join(', ')}]</td>
                            <td>${formatNumber(s.rSquared)}</td>
                            <td>${formatNumber(s.adjRSquared)}</td>
                            <td>${formatNumber(s.AIC)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>`;

    return html;
}

function formatNumber(num) {
    if (num === null || num === undefined || num === Infinity) return 'N/A';
    if (typeof num === 'number') {
        if (Math.abs(num) >= 100000 || (Math.abs(num) < 0.0001 && num !== 0)) {
            return num.toExponential(3);
        }
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
    document.getElementById('stepwiseOptions').style.display = calcType === 'stepwise' ? 'block' : 'none';
}

function loadSample(type) {
    let x, y;
    switch (type) {
        case 'simple':
            x = '1, 2; 2, 3; 3, 5; 4, 4; 5, 6; 6, 7; 7, 8; 8, 9; 9, 10; 10, 11';
            y = '3, 5, 8, 9, 11, 14, 16, 18, 21, 23';
            break;
        case 'housing':
            x = '1500, 3, 10; 2000, 4, 5; 1200, 2, 20; 1800, 3, 8; 2200, 4, 3; 1600, 3, 12; 1400, 2, 15; 1900, 3, 6; 2100, 4, 4; 1700, 3, 9';
            y = '200, 280, 150, 240, 320, 210, 170, 260, 300, 230';
            break;
        default:
            x = '1, 1; 2, 2; 3, 3; 4, 4; 5, 5';
            y = '3, 5, 7, 9, 11';
    }

    document.getElementById('dataX').value = x;
    document.getElementById('dataY').value = y;
}

// Initialize
updateOptions();
