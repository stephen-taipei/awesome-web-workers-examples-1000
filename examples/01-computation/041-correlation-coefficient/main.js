/**
 * Main Thread: Correlation Coefficient Calculator
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
        const correlation = parseFloat(document.getElementById('targetCorrelation').value) || 0.7;
        worker.postMessage({ type: 'generate', count, targetCorrelation: correlation });
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

    let html = `<div class="result-card">
        <h3>Correlation Analysis Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'pearson':
        case 'spearman':
        case 'kendall':
            html += renderSingleCorrelation(result);
            break;

        case 'all':
        case 'generate':
            html += renderAllCorrelations(result);
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function renderSingleCorrelation(result) {
    const strengthClass = getStrengthClass(result.strength);
    const directionClass = result.direction.toLowerCase();

    return `
        <div class="correlation-display ${strengthClass} ${directionClass}">
            <div class="corr-value">${formatNumber(result.correlation)}</div>
            <div class="corr-type">${result.type} Correlation</div>
            <div class="corr-strength">${result.strength} ${result.direction}</div>
        </div>

        <div class="formula-box">
            <code>${result.formula}</code>
        </div>

        <div class="interpretation-box ${directionClass}">
            ${result.interpretation}
        </div>

        <div class="stat-grid">
            <div class="stat-item highlight">
                <span class="stat-label">Correlation (r)</span>
                <span class="stat-value">${formatNumber(result.correlation)}</span>
            </div>
            ${result.rSquared !== undefined ? `
            <div class="stat-item">
                <span class="stat-label">R-Squared</span>
                <span class="stat-value">${formatNumber(result.rSquared)}</span>
            </div>` : ''}
            ${result.tStatistic !== null ? `
            <div class="stat-item">
                <span class="stat-label">t-Statistic</span>
                <span class="stat-value">${formatNumber(result.tStatistic)}</span>
            </div>` : ''}
            <div class="stat-item">
                <span class="stat-label">Count</span>
                <span class="stat-value">${result.n.toLocaleString()}</span>
            </div>
        </div>

        ${result.note ? `<div class="info-box">${result.note}</div>` : ''}`;
}

function renderAllCorrelations(result) {
    const pearsonClass = getDirectionClass(result.pearson);
    const spearmanClass = getDirectionClass(result.spearman);
    const kendallClass = getDirectionClass(result.kendall);

    let html = '';

    if (result.generated) {
        html += `
            <div class="info-box">
                <strong>Generated:</strong> ${result.generated.toLocaleString()} data points
                <br><strong>Target Correlation:</strong> ${result.targetCorrelation}
                <br><strong>Actual Pearson:</strong> ${formatNumber(result.actualCorrelation)}
            </div>`;
    }

    html += `
        <h4>Correlation Coefficients</h4>
        <div class="comparison-grid">
            <div class="comparison-item ${pearsonClass}">
                <h5>Pearson</h5>
                <div class="big-number">${formatNumber(result.pearson)}</div>
                <p>Linear relationship</p>
            </div>
            <div class="comparison-item ${spearmanClass}">
                <h5>Spearman</h5>
                <div class="big-number">${formatNumber(result.spearman)}</div>
                <p>Monotonic relationship</p>
            </div>
            <div class="comparison-item ${kendallClass}">
                <h5>Kendall</h5>
                <div class="big-number">${formatNumber(result.kendall)}</div>
                <p>Ordinal association</p>
            </div>
        </div>

        <h4>Interpretation</h4>
        <div class="interpretation-box ${pearsonClass}">
            ${result.pearsonDetails.interpretation}
        </div>

        ${result.comparison.note ? `
        <div class="info-box">
            <strong>Analysis:</strong> ${result.comparison.note}
        </div>` : ''}

        <h4>Detailed Statistics</h4>
        <div class="stat-grid">
            <div class="stat-item">
                <span class="stat-label">R-Squared</span>
                <span class="stat-value">${formatNumber(result.pearsonDetails.rSquared)}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">t-Statistic</span>
                <span class="stat-value">${result.pearsonDetails.tStatistic ? formatNumber(result.pearsonDetails.tStatistic) : 'N/A'}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Concordant</span>
                <span class="stat-value">${result.kendallDetails.concordantPairs.toLocaleString()}</span>
            </div>
            <div class="stat-item">
                <span class="stat-label">Discordant</span>
                <span class="stat-value">${result.kendallDetails.discordantPairs.toLocaleString()}</span>
            </div>
        </div>

        <h4>Which Correlation to Use?</h4>
        <div class="recommendation-list">
            ${result.recommendation.map(rec => `
                <div class="rec-item">
                    <strong>${rec.method}</strong>: ${rec.use}
                </div>
            `).join('')}
        </div>`;

    if (result.sampleX) {
        html += `
            <h4>Sample Data</h4>
            <div class="sample-data">
                X: [${result.sampleX.join(', ')}]<br>
                Y: [${result.sampleY.join(', ')}]
            </div>`;
    }

    return html;
}

function getStrengthClass(strength) {
    const s = strength.toLowerCase();
    if (s === 'very strong' || s === 'strong') return 'strong';
    if (s === 'moderate') return 'moderate';
    return 'weak';
}

function getDirectionClass(r) {
    if (r > 0.1) return 'positive';
    if (r < -0.1) return 'negative';
    return 'neutral';
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
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [1.2, 2.1, 2.8, 4.2, 4.9, 6.1, 7.2, 7.8, 9.1, 10.2];
            break;
        case 'weak':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [5, 3, 7, 2, 8, 4, 9, 3, 6, 5];
            break;
        case 'negative':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
            break;
        case 'nonlinear':
            x = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
            y = x.map(v => v * v); // Quadratic
            break;
        default:
            x = Array.from({ length: 20 }, () => Math.random() * 100);
            y = Array.from({ length: 20 }, () => Math.random() * 100);
    }

    document.getElementById('dataX').value = x.map(v => typeof v === 'number' && v % 1 !== 0 ? v.toFixed(2) : v).join(', ');
    document.getElementById('dataY').value = y.map(v => typeof v === 'number' && v % 1 !== 0 ? v.toFixed(2) : v).join(', ');
}

// Initialize
updateOptions();
