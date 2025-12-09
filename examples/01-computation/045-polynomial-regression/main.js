/**
 * Main Thread: Polynomial Regression Calculator
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
        const count = parseInt(document.getElementById('generateCount').value) || 1000;
        const coeffStr = document.getElementById('trueCoefficients').value;
        const coefficients = coeffStr.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        const noise = parseFloat(document.getElementById('noiseLevel').value) || 5;

        if (coefficients.length < 2) {
            resultsDiv.innerHTML = '<div class="error">Need at least 2 coefficients (e.g., "1, 2, 3" for 1 + 2x + 3x²)</div>';
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: 'generate', count, coefficients, noise });
    } else if (calcType === 'compare') {
        const xInput = document.getElementById('dataX').value.trim();
        const yInput = document.getElementById('dataY').value.trim();

        const x = parseData(xInput);
        const y = parseData(yInput);

        if (!validateData(x, y)) return;

        const maxDegree = Math.min(parseInt(document.getElementById('degree').value) || 5, x.length - 1);
        worker.postMessage({ type: 'compare', data: { x, y, maxDegree } });
    } else {
        const xInput = document.getElementById('dataX').value.trim();
        const yInput = document.getElementById('dataY').value.trim();

        const x = parseData(xInput);
        const y = parseData(yInput);

        if (!validateData(x, y)) return;

        const degree = parseInt(document.getElementById('degree').value) || 2;

        if (calcType === 'predict') {
            const predictInput = document.getElementById('predictX').value.trim();
            const predictX = parseData(predictInput);
            worker.postMessage({ type: 'predict', data: { x, y, degree, predictX } });
        } else {
            worker.postMessage({ type: 'fit', data: { x, y, degree } });
        }
    }
}

function parseData(input) {
    return input.split(/[\s,;]+/)
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
}

function validateData(x, y) {
    if (x.length < 3 || y.length < 3) {
        resultsDiv.innerHTML = '<div class="error">Need at least 3 data points</div>';
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
        <h3>Polynomial Regression Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    if (calculationType === 'compare') {
        html += displayComparison(result);
    } else {
        const model = result.model || result;

        // Equation display
        html += `
            <div class="equation-display">
                <div class="equation">${model.equation}</div>
                <div class="degree-badge">Degree ${model.degree}</div>
            </div>

            <div class="interpretation-box ${model.rSquared >= 0.8 ? 'good' : model.rSquared >= 0.5 ? 'moderate' : 'weak'}">
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

        // Coefficients
        html += `
            <h4>Coefficients</h4>
            <div class="coeff-grid">
                ${model.coefficients.map((c, i) => `
                    <div class="coeff-item">
                        <div class="coeff-label">β${subscript(i)}</div>
                        <div class="coeff-value">${formatNumber(c)}</div>
                        <div class="coeff-term">${i === 0 ? '(constant)' : i === 1 ? '(x)' : `(x^${i})`}</div>
                    </div>
                `).join('')}
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
                    <span class="stat-label">AIC</span>
                    <span class="stat-value">${formatNumber(model.AIC)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">BIC</span>
                    <span class="stat-value">${formatNumber(model.BIC)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Sample Size</span>
                    <span class="stat-value">${model.n.toLocaleString()}</span>
                </div>
            </div>`;

        // Predictions
        if (result.predictions && calculationType === 'predict') {
            html += `
                <h4>Predictions</h4>
                <div class="table-container">
                    <table class="prediction-table">
                        <thead>
                            <tr><th>X</th><th>Predicted Y</th></tr>
                        </thead>
                        <tbody>
                            ${result.predictions.map(p => `
                                <tr>
                                    <td>${formatNumber(p.x)}</td>
                                    <td><strong>${formatNumber(p.predicted)}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>`;
        }

        // Generated data info
        if (result.trueCoefficients) {
            html += `
                <h4>Parameter Recovery</h4>
                <div class="info-box">
                    <p><strong>True Coefficients:</strong> [${result.trueCoefficients.join(', ')}]</p>
                    <p><strong>Estimated:</strong> [${model.coefficients.map(c => c.toFixed(4)).join(', ')}]</p>
                    <p><strong>Noise Level:</strong> ±${result.noiseLevel}</p>
                </div>

                <h4>Sample Data</h4>
                <div class="sample-data">
                    X: [${result.sampleX.join(', ')}]<br>
                    Y: [${result.sampleY.join(', ')}]
                </div>`;
        }
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function displayComparison(result) {
    let html = `
        <h4>Degree Comparison</h4>
        <div class="recommendation-box">
            <strong>Recommended Degree:</strong> ${result.recommendation}
            <p>Best by Adjusted R²: ${result.bestByAdjR2} | Best by AIC: ${result.bestByAIC}</p>
        </div>

        <div class="table-container">
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>Degree</th>
                        <th>R²</th>
                        <th>Adj R²</th>
                        <th>RMSE</th>
                        <th>AIC</th>
                        <th>BIC</th>
                    </tr>
                </thead>
                <tbody>
                    ${result.comparisons.map(c => `
                        <tr class="${c.degree === result.recommendation ? 'recommended' : ''}">
                            <td>${c.degree}</td>
                            <td>${formatNumber(c.rSquared)}</td>
                            <td>${formatNumber(c.adjRSquared)}</td>
                            <td>${formatNumber(c.RMSE)}</td>
                            <td>${formatNumber(c.AIC)}</td>
                            <td>${formatNumber(c.BIC)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="info-box">
            <strong>Note:</strong> Lower AIC/BIC values indicate better model fit with penalty for complexity.
            Adjusted R² penalizes additional parameters.
        </div>`;

    return html;
}

function subscript(n) {
    const subs = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];
    return String(n).split('').map(d => subs[parseInt(d)]).join('');
}

function formatNumber(num) {
    if (num === null || num === undefined) return 'N/A';
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
    document.getElementById('degreeGroup').style.display = calcType === 'generate' ? 'none' : 'block';
}

function loadSample(type) {
    let x, y, degree;
    switch (type) {
        case 'quadratic':
            x = [-3, -2, -1, 0, 1, 2, 3, 4, 5];
            y = [9, 4, 1, 0, 1, 4, 9, 16, 25];
            degree = 2;
            break;
        case 'cubic':
            x = [-2, -1.5, -1, -0.5, 0, 0.5, 1, 1.5, 2];
            y = [-8, -3.375, -1, -0.125, 0, 0.125, 1, 3.375, 8];
            degree = 3;
            break;
        case 'noisy':
            x = Array.from({ length: 20 }, (_, i) => i - 10);
            y = x.map(v => v * v + (Math.random() - 0.5) * 20);
            degree = 2;
            break;
        default:
            x = Array.from({ length: 15 }, (_, i) => i);
            y = x.map(v => 2 + 3 * v - 0.5 * v * v + (Math.random() - 0.5) * 5);
            degree = 2;
    }

    document.getElementById('dataX').value = x.map(v => typeof v === 'number' && v % 1 !== 0 ? v.toFixed(2) : v).join(', ');
    document.getElementById('dataY').value = y.map(v => typeof v === 'number' && v % 1 !== 0 ? v.toFixed(2) : v).join(', ');
    document.getElementById('degree').value = degree;
}

// Initialize
updateOptions();
