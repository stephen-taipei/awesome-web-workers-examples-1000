/**
 * Main Thread: Covariance Matrix Calculator
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

    if (calcType === 'pairwise') {
        const xInput = document.getElementById('dataX').value.trim();
        const yInput = document.getElementById('dataY').value.trim();

        const x = parseData(xInput);
        const y = parseData(yInput);

        if (x.length < 2 || y.length < 2) {
            resultsDiv.innerHTML = '<div class="error">Need at least 2 data points per variable</div>';
            calculateBtn.disabled = false;
            return;
        }

        if (x.length !== y.length) {
            resultsDiv.innerHTML = '<div class="error">Variables must have same number of values</div>';
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: 'pairwise', data: { x, y } });
    } else if (calcType === 'matrix') {
        const variables = [];
        const inputs = document.querySelectorAll('.variable-input');

        inputs.forEach(input => {
            const data = parseData(input.value.trim());
            if (data.length > 0) variables.push(data);
        });

        if (variables.length < 2) {
            resultsDiv.innerHTML = '<div class="error">Need at least 2 variables</div>';
            calculateBtn.disabled = false;
            return;
        }

        const n = variables[0].length;
        for (const v of variables) {
            if (v.length !== n) {
                resultsDiv.innerHTML = '<div class="error">All variables must have same length</div>';
                calculateBtn.disabled = false;
                return;
            }
        }

        worker.postMessage({ type: 'matrix', variables });
    } else if (calcType === 'generate') {
        const count = parseInt(document.getElementById('generateCount').value) || 10000;
        const numVars = parseInt(document.getElementById('numVars').value) || 3;
        const correlation = parseFloat(document.getElementById('targetCorrelation').value) || 0.5;

        worker.postMessage({ type: 'generate', count, numVars, correlation });
    }
}

function parseData(input) {
    return input.split(/[\s,;]+/)
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Covariance Analysis Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'pairwise':
            const relClass = getRelationshipClass(result.relationship);
            html += `
                <div class="relationship-display ${relClass}">
                    <div class="rel-icon">${getRelationshipIcon(result.relationship)}</div>
                    <div class="rel-name">${result.relationship} Relationship</div>
                    <div class="rel-value">r = ${formatNumber(result.correlation)}</div>
                </div>

                <div class="interpretation-box ${relClass}">
                    ${result.interpretation}
                </div>

                <h4>Covariance Values</h4>
                <div class="stat-grid">
                    <div class="stat-item highlight">
                        <span class="stat-label">Sample Cov</span>
                        <span class="stat-value">${formatNumber(result.sampleCovariance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Population Cov</span>
                        <span class="stat-value">${formatNumber(result.populationCovariance)}</span>
                    </div>
                    <div class="stat-item highlight">
                        <span class="stat-label">Correlation</span>
                        <span class="stat-value">${formatNumber(result.correlation)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.n.toLocaleString()}</span>
                    </div>
                </div>

                <h4>Variable Statistics</h4>
                <div class="var-stats">
                    <div class="var-stat-box">
                        <h5>Variable X</h5>
                        <p>Mean: ${formatNumber(result.meanX)}</p>
                        <p>Std Dev: ${formatNumber(result.stdDevX)}</p>
                        <p>Variance: ${formatNumber(result.varianceX)}</p>
                    </div>
                    <div class="var-stat-box">
                        <h5>Variable Y</h5>
                        <p>Mean: ${formatNumber(result.meanY)}</p>
                        <p>Std Dev: ${formatNumber(result.stdDevY)}</p>
                        <p>Variance: ${formatNumber(result.varianceY)}</p>
                    </div>
                </div>`;
            break;

        case 'matrix':
        case 'generate':
            html += `
                <div class="info-box">
                    <strong>Variables:</strong> ${result.numVariables}
                    <br><strong>Data Points:</strong> ${result.n.toLocaleString()}
                    ${result.generated ? `<br><strong>Target Correlation:</strong> ${result.targetCorrelation}` : ''}
                </div>

                <h4>Covariance Matrix</h4>
                <div class="matrix-container">
                    ${renderMatrix(result.covarianceMatrix, 'cov')}
                </div>

                <h4>Correlation Matrix</h4>
                <div class="matrix-container">
                    ${renderMatrix(result.correlationMatrix, 'corr')}
                </div>

                <h4>Variable Statistics</h4>
                <div class="stat-grid">
                    ${result.means.map((m, i) => `
                        <div class="stat-item">
                            <span class="stat-label">Var ${i + 1} Mean</span>
                            <span class="stat-value">${formatNumber(m)}</span>
                        </div>
                    `).join('')}
                </div>
                <div class="stat-grid">
                    ${result.standardDeviations.map((s, i) => `
                        <div class="stat-item">
                            <span class="stat-label">Var ${i + 1} Std</span>
                            <span class="stat-value">${formatNumber(s)}</span>
                        </div>
                    `).join('')}
                </div>

                <h4>Matrix Properties</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Trace</span>
                        <span class="stat-value">${formatNumber(result.trace)}</span>
                    </div>
                    ${result.determinant !== null ? `
                    <div class="stat-item">
                        <span class="stat-label">Determinant</span>
                        <span class="stat-value">${formatNumber(result.determinant)}</span>
                    </div>` : ''}
                    <div class="stat-item">
                        <span class="stat-label">Positive Definite</span>
                        <span class="stat-value">${result.isPositiveDefinite ? 'Yes' : 'No'}</span>
                    </div>
                </div>

                ${result.eigenvalues && !result.eigenvalues.complex ? `
                <h4>Eigenvalues (2x2)</h4>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">λ₁</span>
                        <span class="stat-value">${formatNumber(result.eigenvalues.lambda1)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">λ₂</span>
                        <span class="stat-value">${formatNumber(result.eigenvalues.lambda2)}</span>
                    </div>
                </div>` : ''}`;

            if (result.samples) {
                html += `
                <h4>Sample Data</h4>
                <div class="sample-data">
                    ${result.samples.map((s, i) => `Var ${i + 1}: [${s.join(', ')}]`).join('<br>')}
                </div>`;
            }
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function renderMatrix(matrix, type) {
    const n = matrix.length;
    let html = '<table class="matrix-table">';

    // Header row
    html += '<tr><th></th>';
    for (let j = 0; j < n; j++) {
        html += `<th>V${j + 1}</th>`;
    }
    html += '</tr>';

    // Data rows
    for (let i = 0; i < n; i++) {
        html += `<tr><th>V${i + 1}</th>`;
        for (let j = 0; j < n; j++) {
            const value = matrix[i][j];
            let cellClass = '';

            if (type === 'corr') {
                if (i === j) cellClass = 'diagonal';
                else if (Math.abs(value) > 0.7) cellClass = 'strong';
                else if (Math.abs(value) > 0.3) cellClass = 'moderate';
            } else {
                if (i === j) cellClass = 'diagonal';
            }

            html += `<td class="${cellClass}">${formatNumber(value)}</td>`;
        }
        html += '</tr>';
    }

    html += '</table>';
    return html;
}

function getRelationshipClass(rel) {
    if (rel === 'Positive') return 'positive';
    if (rel === 'Negative') return 'negative';
    return 'neutral';
}

function getRelationshipIcon(rel) {
    if (rel === 'Positive') return '📈';
    if (rel === 'Negative') return '📉';
    return '➖';
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
    document.getElementById('pairwiseInputs').style.display = calcType === 'pairwise' ? 'block' : 'none';
    document.getElementById('matrixInputs').style.display = calcType === 'matrix' ? 'block' : 'none';
    document.getElementById('generateOptions').style.display = calcType === 'generate' ? 'block' : 'none';
}

function addVariable() {
    const container = document.getElementById('variablesContainer');
    const count = container.children.length + 1;

    const div = document.createElement('div');
    div.className = 'control-group';
    div.innerHTML = `
        <label>Variable ${count}:</label>
        <textarea class="variable-input" rows="2" placeholder="1, 2, 3, 4, 5"></textarea>
    `;
    container.appendChild(div);
}

function loadSample(type) {
    let x, y;
    switch (type) {
        case 'positive':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [2, 4, 5, 4, 5, 7, 8, 9, 10, 11];
            break;
        case 'negative':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
            break;
        case 'none':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [5, 3, 7, 2, 8, 4, 6, 3, 7, 5];
            break;
        default:
            x = Array.from({ length: 20 }, () => Math.random() * 100);
            y = Array.from({ length: 20 }, () => Math.random() * 100);
    }

    document.getElementById('dataX').value = x.map(v => v.toFixed ? v.toFixed(2) : v).join(', ');
    document.getElementById('dataY').value = y.map(v => v.toFixed ? v.toFixed(2) : v).join(', ');
}

// Initialize
updateOptions();
