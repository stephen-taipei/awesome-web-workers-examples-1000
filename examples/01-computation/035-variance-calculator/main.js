/**
 * Main Thread: Variance Calculator
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
    } else if (calcType === 'components') {
        const data = parseData(dataInput);
        if (data.length === 0) {
            resultsDiv.innerHTML = '<div class="error">Please enter valid numeric data</div>';
            calculateBtn.disabled = false;
            return;
        }
        worker.postMessage({ type: 'components', data });
    } else if (calcType === 'betweenWithin') {
        const groupsText = document.getElementById('betweenWithinGroups').value.trim();
        const groups = groupsText.split('\n')
            .map(line => parseData(line))
            .filter(g => g.length > 0);

        if (groups.length < 2) {
            resultsDiv.innerHTML = '<div class="error">Please enter at least 2 groups (one per line)</div>';
            calculateBtn.disabled = false;
            return;
        }

        worker.postMessage({ type: 'betweenWithin', groups });
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
                stdDev: parseFloat(document.getElementById('normalStdDev').value) || 10
            };
        case 'exponential':
            return {
                lambda: parseFloat(document.getElementById('expLambda').value) || 1
            };
        case 'chi-squared':
            return {
                df: parseInt(document.getElementById('chiDf').value) || 5
            };
        default:
            return {};
    }
}

function displayResult(data) {
    const { calculationType, result, executionTime } = data;

    let html = `<div class="result-card">
        <h3>Variance Calculation Result</h3>
        <p class="execution-time">Execution time: ${executionTime}ms</p>`;

    switch (calculationType) {
        case 'population':
        case 'sample':
            html += `
                <div class="formula-box">
                    <strong>${result.type}</strong><br>
                    <code>${result.formula}</code>
                </div>
                <div class="stat-grid">
                    <div class="stat-item highlight">
                        <span class="stat-label">Variance</span>
                        <span class="stat-value">${formatNumber(result.variance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Standard Deviation</span>
                        <span class="stat-value">${formatNumber(result.stdDev)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.count.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sum of Squared Dev</span>
                        <span class="stat-value">${formatNumber(result.sumSquaredDev)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range</span>
                        <span class="stat-value">${formatNumber(result.range)}</span>
                    </div>
                </div>`;
            if (result.whyN1) {
                html += `<div class="info-note"><strong>Note:</strong> ${result.whyN1}</div>`;
            }
            break;

        case 'both':
            html += `
                <div class="comparison-grid">
                    <div class="comparison-item">
                        <h4>Population (σ²)</h4>
                        <div class="big-number">${formatNumber(result.population.variance)}</div>
                        <p>Std Dev: ${formatNumber(result.population.stdDev)}</p>
                    </div>
                    <div class="comparison-item">
                        <h4>Sample (s²)</h4>
                        <div class="big-number">${result.sample ? formatNumber(result.sample.variance) : 'N/A'}</div>
                        <p>Std Dev: ${result.sample ? formatNumber(result.sample.stdDev) : 'N/A'}</p>
                    </div>
                </div>
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Count</span>
                        <span class="stat-value">${result.count.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sum of Squared Dev</span>
                        <span class="stat-value">${formatNumber(result.sumSquaredDev)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range</span>
                        <span class="stat-value">${formatNumber(result.range)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Ratio (s²/σ²)</span>
                        <span class="stat-value">${result.ratio}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Bessel Factor</span>
                        <span class="stat-value">${result.besselFactor}</span>
                    </div>
                </div>`;
            break;

        case 'components':
            html += `
                <div class="stat-grid">
                    <div class="stat-item highlight">
                        <span class="stat-label">Sum of Squares (SS)</span>
                        <span class="stat-value">${formatNumber(result.sumOfSquares)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Population Variance</span>
                        <span class="stat-value">${formatNumber(result.populationVariance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Sample Variance</span>
                        <span class="stat-value">${formatNumber(result.sampleVariance)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean Square</span>
                        <span class="stat-value">${formatNumber(result.meanSquare)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Root Mean Square</span>
                        <span class="stat-value">${formatNumber(result.rootMeanSquare)}</span>
                    </div>
                </div>
                <h4>Deviation Components${result.truncated ? ' (First 20)' : ''}</h4>
                <table class="data-table">
                    <tr><th>Value</th><th>Deviation (x-μ)</th><th>Squared</th></tr>
                    ${result.deviations.map(d =>
                        `<tr><td>${d.value}</td><td>${d.deviation}</td><td>${d.deviationSquared}</td></tr>`
                    ).join('')}
                </table>`;
            break;

        case 'betweenWithin':
            html += `
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Grand Mean</span>
                        <span class="stat-value">${formatNumber(result.grandMean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Total N</span>
                        <span class="stat-value">${result.totalN}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Groups</span>
                        <span class="stat-value">${result.groupCount}</span>
                    </div>
                    <div class="stat-item highlight">
                        <span class="stat-label">F Ratio</span>
                        <span class="stat-value">${formatNumber(result.F_ratio)}</span>
                    </div>
                </div>

                <h4>ANOVA Table</h4>
                <table class="data-table">
                    <tr><th>Source</th><th>SS</th><th>df</th><th>MS</th></tr>
                    <tr>
                        <td>Between Groups</td>
                        <td>${formatNumber(result.SS_between)}</td>
                        <td>${result.df_between}</td>
                        <td>${formatNumber(result.MS_between)}</td>
                    </tr>
                    <tr>
                        <td>Within Groups</td>
                        <td>${formatNumber(result.SS_within)}</td>
                        <td>${result.df_within}</td>
                        <td>${formatNumber(result.MS_within)}</td>
                    </tr>
                    <tr>
                        <td><strong>Total</strong></td>
                        <td><strong>${formatNumber(result.SS_total)}</strong></td>
                        <td><strong>${result.df_between + result.df_within}</strong></td>
                        <td>-</td>
                    </tr>
                </table>

                <div class="stat-grid" style="margin-top: 20px;">
                    <div class="stat-item">
                        <span class="stat-label">Variance Explained</span>
                        <span class="stat-value">${result.varianceExplained}%</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">ICC</span>
                        <span class="stat-value">${result.ICC}</span>
                    </div>
                </div>

                <h4>Group Statistics</h4>
                <table class="data-table">
                    <tr><th>Group</th><th>N</th><th>Mean</th></tr>
                    ${result.groupStats.map(g =>
                        `<tr><td>${g.group}</td><td>${g.n}</td><td>${g.mean}</td></tr>`
                    ).join('')}
                </table>`;
            break;

        case 'generate':
            html += `
                <div class="info-box">
                    <strong>Distribution:</strong> ${result.distribution}
                    ${result.params ? `<br><strong>Parameters:</strong> ${JSON.stringify(result.params)}` : ''}
                </div>
                <div class="comparison-grid">
                    <div class="comparison-item">
                        <h4>Population (σ²)</h4>
                        <div class="big-number">${formatNumber(result.population.variance)}</div>
                    </div>
                    <div class="comparison-item">
                        <h4>Sample (s²)</h4>
                        <div class="big-number">${result.sample ? formatNumber(result.sample.variance) : 'N/A'}</div>
                    </div>
                </div>
                ${result.theoreticalVariance !== null ? `
                    <div class="theoretical-box">
                        <strong>Theoretical Variance:</strong> ${formatNumber(result.theoreticalVariance)}
                        <br><strong>Difference:</strong> ${formatNumber(Math.abs(result.population.variance - result.theoreticalVariance))}
                    </div>
                ` : ''}
                <div class="stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Generated</span>
                        <span class="stat-value">${result.generated.toLocaleString()}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Mean</span>
                        <span class="stat-value">${formatNumber(result.mean)}</span>
                    </div>
                    <div class="stat-item">
                        <span class="stat-label">Range</span>
                        <span class="stat-value">${formatNumber(result.range)}</span>
                    </div>
                </div>
                <h4>Sample Data</h4>
                <div class="sample-data">${result.sample ? result.sample.join(', ') : ''}</div>`;
            break;
    }

    html += '</div>';
    resultsDiv.innerHTML = html;
}

function formatNumber(num) {
    if (typeof num === 'number') {
        if (Math.abs(num) >= 1000000) return num.toExponential(4);
        if (Math.abs(num) < 0.0001 && num !== 0) return num.toExponential(4);
        return Number.isInteger(num) ? num.toLocaleString() : num.toFixed(6);
    }
    return num;
}

function updateOptions() {
    const calcType = document.getElementById('calcType').value;
    document.getElementById('dataInputGroup').style.display =
        ['population', 'sample', 'both', 'components'].includes(calcType) ? 'block' : 'none';
    document.getElementById('generateOptions').style.display = calcType === 'generate' ? 'block' : 'none';
    document.getElementById('betweenWithinOptions').style.display = calcType === 'betweenWithin' ? 'block' : 'none';
}

function updateDistributionParams() {
    const distribution = document.getElementById('distribution').value;
    document.querySelectorAll('.dist-params').forEach(el => el.style.display = 'none');
    const paramDiv = document.getElementById(distribution + 'Params');
    if (paramDiv) paramDiv.style.display = 'block';
}

function loadSample() {
    document.getElementById('dataInput').value =
        '23, 27, 25, 31, 29, 26, 24, 28, 30, 25, 27, 26, 29, 25, 28';
}

// Initialize
updateOptions();
updateDistributionParams();
