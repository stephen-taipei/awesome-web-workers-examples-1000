/**
 * Main Thread: Kendall Tau Correlation Calculator
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
        const relationship = document.getElementById('relationship').value;
        worker.postMessage({ type: 'generate', count, relationship });
    } else {
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

    let html = `<div class="result-card">
        <h3>Kendall Tau Correlation Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    // Main tau display
    const mainTau = result.tauB !== undefined ? result.tauB : result.tau;
    html += `
        <div class="tau-display ${dirClass}">
            <div class="tau-symbol">τ</div>
            <div class="tau-value">${formatNumber(mainTau)}</div>
            <div class="tau-strength">${result.strength} ${result.direction}</div>
        </div>

        <div class="interpretation-box ${dirClass}">
            ${result.interpretation}
        </div>`;

    // For all tau variants
    if (result.tauA !== undefined && result.tauB !== undefined && result.tauC !== undefined) {
        html += `
            <h4>Tau Variants</h4>
            <div class="comparison-grid">
                <div class="comparison-item">
                    <h5>τ-a</h5>
                    <div class="big-number">${formatNumber(result.tauA)}</div>
                    <p>Ignores ties</p>
                </div>
                <div class="comparison-item highlight">
                    <h5>τ-b</h5>
                    <div class="big-number">${formatNumber(result.tauB)}</div>
                    <p>Accounts for ties</p>
                </div>
                <div class="comparison-item">
                    <h5>τ-c</h5>
                    <div class="big-number">${formatNumber(result.tauC)}</div>
                    <p>For categories</p>
                </div>
            </div>

            ${result.gamma !== undefined ? `
            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Gamma (γ)</span>
                    <span class="stat-value">${formatNumber(result.gamma)}</span>
                </div>
            </div>` : ''}`;
    }

    // Pair counts
    html += `
        <h4>Pair Analysis</h4>
        <div class="pair-grid">
            <div class="pair-item concordant">
                <div class="pair-icon">✓✓</div>
                <div class="pair-count">${result.concordant.toLocaleString()}</div>
                <div class="pair-label">Concordant</div>
            </div>
            <div class="pair-item discordant">
                <div class="pair-icon">✗✗</div>
                <div class="pair-count">${result.discordant.toLocaleString()}</div>
                <div class="pair-label">Discordant</div>
            </div>
            ${result.tiesX !== undefined ? `
            <div class="pair-item ties">
                <div class="pair-icon">==</div>
                <div class="pair-count">${(result.tiesX + result.tiesY + (result.tiesBoth || 0)).toLocaleString()}</div>
                <div class="pair-label">Ties</div>
            </div>` : ''}
        </div>

        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">Total Pairs</span>
                <span class="stat-value">${result.totalPairs.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Sample Size</span>
                <span class="stat-value">${result.n.toLocaleString()}</span>
            </div>
            ${result.standardError !== undefined ? `
            <div class="stat-item">
                <span class="stat-label">Std Error</span>
                <span class="stat-value">${formatNumber(result.standardError)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Z-Score</span>
                <span class="stat-value">${formatNumber(result.zScore)}</span>
            </div>` : ''}
        </div>`;

    // Recommendation
    if (result.recommendation) {
        html += `
            <div class="info-box">
                <strong>Recommendation:</strong> ${result.recommendation}
            </div>`;
    }

    // Note
    if (result.note) {
        html += `
            <div class="note-box">
                <strong>Note:</strong> ${result.note}
            </div>`;
    }

    // Detailed pairs table
    if (result.pairs) {
        html += `
            <h4>Pair Details</h4>
            <div class="table-container">
                <table class="pair-table">
                    <thead>
                        <tr>
                            <th>Pair (i,j)</th>
                            <th>X[i], X[j]</th>
                            <th>Y[i], Y[j]</th>
                            <th>Sign(ΔX)</th>
                            <th>Sign(ΔY)</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.pairs.map(p => `
                            <tr class="${p.type.toLowerCase().replace(' ', '-')}">
                                <td>(${p.i}, ${p.j})</td>
                                <td>${formatNumber(p.xi)}, ${formatNumber(p.xj)}</td>
                                <td>${formatNumber(p.yi)}, ${formatNumber(p.yj)}</td>
                                <td>${p.xSign > 0 ? '+' : p.xSign < 0 ? '-' : '0'}</td>
                                <td>${p.ySign > 0 ? '+' : p.ySign < 0 ? '-' : '0'}</td>
                                <td><span class="type-badge ${p.type.toLowerCase().replace(' ', '-')}">${p.type}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <div class="formula-box">
                <p><strong>τ-a</strong> = (${result.concordant} - ${result.discordant}) / ${result.totalPairs} = <strong>${formatNumber(result.tauA)}</strong></p>
                <p><strong>τ-b</strong> = (C - D) / √((n₀ - n₁)(n₀ - n₂)) = <strong>${formatNumber(result.tauB)}</strong></p>
            </div>`;
    }

    // Sample data
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
            x = [1, 2, 3, 4, 5, 6, 7, 8];
            y = [1, 2, 3, 4, 5, 6, 7, 8];
            break;
        case 'negative':
            x = [1, 2, 3, 4, 5, 6, 7, 8];
            y = [8, 7, 6, 5, 4, 3, 2, 1];
            break;
        case 'ties':
            x = [1, 1, 2, 2, 3, 3, 4, 4];
            y = [1, 2, 1, 2, 3, 4, 3, 4];
            break;
        case 'example':
            x = [4, 10, 3, 1, 9, 2, 6, 7, 8, 5];
            y = [5, 8, 6, 2, 10, 3, 9, 4, 7, 1];
            break;
        default:
            x = Array.from({ length: 10 }, () => Math.round(Math.random() * 10));
            y = Array.from({ length: 10 }, () => Math.round(Math.random() * 10));
    }

    document.getElementById('dataX').value = x.join(', ');
    document.getElementById('dataY').value = y.join(', ');
}

// Initialize
updateOptions();
