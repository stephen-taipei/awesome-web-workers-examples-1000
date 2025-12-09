/**
 * Main Thread: Spearman Rank Correlation Calculator
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
        const relationship = document.getElementById('relationship').value;
        worker.postMessage({ type: 'generate', count, relationship });
    } else {
        const xInput = document.getElementById('dataX').value.trim();
        const yInput = document.getElementById('dataY').value.trim();

        const x = parseData(xInput);
        const y = parseData(yInput);

        if (x.length < 3 || y.length < 3) {
            resultsDiv.innerHTML = '<div class="error">Need at least 3 data points per variable</div>';
            calculateBtn.disabled = false;
            return;
        }

        if (x.length !== y.length) {
            resultsDiv.innerHTML = '<div class="error">Variables must have same number of values</div>';
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: calcType, data: { x, y } });
    }
}

function parseData(input) {
    return input.split(/[\s,;]+/)
        .map(s => parseFloat(s.trim()))
        .filter(n => !isNaN(n));
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;
    const dirClass = result.direction.toLowerCase();
    const strengthClass = result.strength.toLowerCase().replace(' ', '-');

    let html = `<div class="result-card">
        <h3>Spearman Rank Correlation Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    // Main correlation display
    html += `
        <div class="correlation-display ${dirClass}">
            <div class="rho-symbol">ρ</div>
            <div class="rho-value">${formatNumber(result.rho)}</div>
            <div class="rho-strength">${result.strength} ${result.direction}</div>
        </div>

        <div class="interpretation-box ${dirClass}">
            ${result.interpretation}
        </div>`;

    // Statistics grid
    html += `
        <h4>Correlation Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Spearman ρ</span>
                <span class="stat-value">${formatNumber(result.rho)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">ρ (simplified)</span>
                <span class="stat-value">${formatNumber(result.rhoSimple)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Σd²</span>
                <span class="stat-value">${formatNumber(result.sumSquaredDiff)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Count</span>
                <span class="stat-value">${result.n.toLocaleString()}</span>
            </div>
        </div>`;

    // Significance testing
    if (result.tStatistic !== undefined) {
        html += `
            <h4>Significance Testing</h4>
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">t-Statistic</span>
                    <span class="stat-value">${formatNumber(result.tStatistic)}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Degrees of Freedom</span>
                    <span class="stat-value">${result.degreesOfFreedom}</span>
                </div>
            </div>`;
    }

    // Ties information
    if (result.hasTies !== undefined) {
        html += `
            <div class="info-box ${result.hasTies ? 'warning' : ''}">
                <strong>Ties:</strong> ${result.hasTies ?
                    `Found ${result.tiesX} ties in X, ${result.tiesY} ties in Y. Using Pearson formula on ranks.` :
                    'No ties detected. Simplified formula is accurate.'}
            </div>`;
    }

    // Detailed table (for small datasets)
    if (result.table) {
        html += `
            <h4>Rank Calculation Table</h4>
            <div class="table-container">
                <table class="rank-table">
                    <thead>
                        <tr>
                            <th>i</th>
                            <th>X</th>
                            <th>Y</th>
                            <th>Rank(X)</th>
                            <th>Rank(Y)</th>
                            <th>d</th>
                            <th>d²</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.table.map(row => `
                            <tr>
                                <td>${row.index}</td>
                                <td>${formatNumber(row.x)}</td>
                                <td>${formatNumber(row.y)}</td>
                                <td>${row.rankX}</td>
                                <td>${row.rankY}</td>
                                <td class="${row.d !== 0 ? 'highlight-cell' : ''}">${row.d}</td>
                                <td>${row.d2}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="6"><strong>Total Σd²</strong></td>
                            <td><strong>${result.sumSquaredDiff}</strong></td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="formula-box">
                <code>${result.formula}</code>
            </div>`;
    }

    // Sample data for generated
    if (result.sampleX) {
        html += `
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
        if (Math.abs(num) >= 10000) return num.toExponential(3);
        if (Number.isInteger(num)) return num.toLocaleString();
        return num.toFixed(4);
    }
    return num;
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;
    document.getElementById('dataInputs').style.display = calcType === 'generate' ? 'none' : 'block';
    document.getElementById('generateOptions').style.display = calcType === 'generate' ? 'block' : 'none';
}

function loadSample(type) {
    let x, y;
    switch (type) {
        case 'perfect':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            break;
        case 'strong':
            x = [86, 97, 99, 100, 101, 103, 106, 110, 112, 113];
            y = [0, 20, 28, 27, 50, 29, 7, 17, 6, 12];
            break;
        case 'ties':
            x = [1, 2, 2, 3, 4, 4, 4, 5];
            y = [1, 2, 3, 3, 4, 5, 5, 6];
            break;
        case 'monotonic':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [1, 4, 9, 16, 25, 36, 49, 64, 81, 100]; // x²
            break;
        default:
            x = Array.from({ length: 15 }, () => Math.round(Math.random() * 100));
            y = Array.from({ length: 15 }, () => Math.round(Math.random() * 100));
    }

    document.getElementById('dataX').value = x.join(', ');
    document.getElementById('dataY').value = y.join(', ');
}

// Initialize
updateOptions();
