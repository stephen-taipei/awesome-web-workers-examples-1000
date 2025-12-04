/**
 * Main script for Adaptive Integration
 */

let worker = null;

function initWorker() {
    if (worker) {
        worker.terminate();
    }
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, result, executionTime, percentage, message } = e.data;

        if (type === 'progress') {
            updateProgress(percentage);
        } else if (type === 'result') {
            hideProgress();
            displayResults(result, executionTime);
            document.getElementById('calculateBtn').disabled = false;
        } else if (type === 'error') {
            hideProgress();
            displayError(message);
            document.getElementById('calculateBtn').disabled = false;
        }
    };

    worker.onerror = function(error) {
        hideProgress();
        displayError('Worker error: ' + error.message);
        document.getElementById('calculateBtn').disabled = false;
    };
}

function updateFunction() {
    const select = document.getElementById('functionSelect');
    const customInput = document.getElementById('customInput');
    customInput.style.display = select.value === 'custom' ? 'block' : 'none';

    const defaults = {
        'smooth': { a: 0, b: Math.PI },
        'peak': { a: 0, b: 1 },
        'oscillatory': { a: 0, b: Math.PI },
        'discontinuous': { a: 0, b: 1 },
        'sqrt': { a: 0, b: 1 },
        'gaussian': { a: -1, b: 1 }
    };

    if (defaults[select.value]) {
        document.getElementById('a').value = defaults[select.value].a;
        document.getElementById('b').value = defaults[select.value].b;
    }
}

function loadSample(type) {
    document.getElementById('functionSelect').value = type;
    updateFunction();
}

function calculate() {
    const functionType = document.getElementById('functionSelect').value;
    const customFunction = document.getElementById('customFunction').value;
    const a = parseFloat(document.getElementById('a').value);
    const b = parseFloat(document.getElementById('b').value);
    const tolerance = parseFloat(document.getElementById('tolerance').value);
    const maxDepth = parseInt(document.getElementById('maxDepth').value);

    if (isNaN(a) || isNaN(b) || isNaN(tolerance) || isNaN(maxDepth)) {
        displayError('Please enter valid numeric values');
        return;
    }

    if (a >= b) {
        displayError('Lower bound must be less than upper bound');
        return;
    }

    if (functionType === 'custom' && !customFunction.trim()) {
        displayError('Please enter a custom function');
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({
        data: { functionType, customFunction, a, b, tolerance, maxDepth }
    });
}

function showProgress() {
    document.getElementById('progress').style.display = 'block';
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressText').textContent = 'Processing...';
}

function updateProgress(percentage) {
    document.getElementById('progressBar').style.width = percentage + '%';
    document.getElementById('progressText').textContent = `Processing... ${percentage}%`;
}

function hideProgress() {
    document.getElementById('progress').style.display = 'none';
}

function displayResults(result, executionTime) {
    const resultsDiv = document.getElementById('results');
    const { value, stats, exact, fixedResult, functionString, a, b, tolerance, maxDepth } = result;

    let html = `
        <div class="result-card">
            <h3>Adaptive Integration Results</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="method-display">
                <div class="method-name">∫ ${functionString} dx</div>
                <div class="method-info">from ${a} to ${b}</div>
            </div>

            <div class="main-result">
                <div class="result-label">Adaptive Simpson Result</div>
                <div class="result-value">${formatNumber(value, 14)}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item highlight">
                    <span class="stat-label">f(x) Evaluations</span>
                    <span class="stat-value">${stats.evaluations}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Subdivisions</span>
                    <span class="stat-value">${stats.subdivisions}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Max Depth</span>
                    <span class="stat-value">${stats.maxDepthReached} / ${maxDepth}</span>
                </div>
                <div class="stat-item">
                    <span class="stat-label">Tolerance</span>
                    <span class="stat-value">${tolerance.toExponential(0)}</span>
                </div>
            </div>
    `;

    // Comparison with fixed Simpson
    html += `
        <h4>Comparison with Fixed Simpson (n=${fixedResult.n})</h4>
        <div class="comparison-grid">
            <div class="comparison-item adaptive">
                <span class="comp-label">Adaptive</span>
                <span class="comp-value">${formatNumber(value, 12)}</span>
                <span class="comp-detail">${stats.evaluations} evaluations</span>
            </div>
            <div class="comparison-item fixed">
                <span class="comp-label">Fixed Simpson</span>
                <span class="comp-value">${formatNumber(fixedResult.value, 12)}</span>
                <span class="comp-detail">${fixedResult.evaluations} evaluations</span>
            </div>
    `;

    if (exact !== null) {
        const adaptiveError = Math.abs(value - exact);
        const fixedError = Math.abs(fixedResult.value - exact);

        html += `
            <div class="comparison-item exact">
                <span class="comp-label">Exact Value</span>
                <span class="comp-value">${formatNumber(exact, 12)}</span>
            </div>
        </div>

        <div class="error-comparison">
            <div class="error-item">
                <span class="error-label">Adaptive Error:</span>
                <span class="error-value ${adaptiveError < tolerance ? 'good' : 'warn'}">${adaptiveError.toExponential(3)}</span>
            </div>
            <div class="error-item">
                <span class="error-label">Fixed Error:</span>
                <span class="error-value">${fixedError.toExponential(3)}</span>
            </div>
            <div class="error-item">
                <span class="error-label">Adaptive wins by:</span>
                <span class="error-value">${(fixedError / adaptiveError).toFixed(1)}× better</span>
            </div>
        </div>
        `;
    } else {
        html += `</div>`;
    }

    // Interval subdivision visualization
    if (stats.intervals && stats.intervals.length > 0) {
        html += `
            <h4>Interval Subdivisions (${stats.intervals.length} final intervals)</h4>
            <div class="interval-viz">
        `;

        // Sort intervals by position
        const sortedIntervals = [...stats.intervals].sort((x, y) => x.a - y.a);

        // Show depth distribution
        const depthCounts = {};
        for (const int of sortedIntervals) {
            depthCounts[int.depth] = (depthCounts[int.depth] || 0) + 1;
        }

        html += `
            <div class="depth-distribution">
                <strong>Depth Distribution:</strong>
        `;

        for (let d = 0; d <= stats.maxDepthReached; d++) {
            if (depthCounts[d]) {
                html += `<span class="depth-badge depth-${Math.min(d, 10)}">${d}: ${depthCounts[d]}</span>`;
            }
        }

        html += `</div>`;

        // Visual bar showing subdivision density
        html += `<div class="subdivision-bar">`;
        const totalWidth = b - a;
        for (const int of sortedIntervals.slice(0, 50)) {
            const width = ((int.b - int.a) / totalWidth * 100).toFixed(2);
            const intensity = Math.min(int.depth * 15, 100);
            html += `<div class="sub-segment" style="width: ${width}%; background: hsl(200, 70%, ${100 - intensity}%)" title="[${int.a.toFixed(4)}, ${int.b.toFixed(4)}] depth=${int.depth}"></div>`;
        }
        html += `</div>
            <div class="viz-legend">
                <span>Lighter = less subdivision needed</span>
                <span>Darker = more subdivision needed</span>
            </div>
        </div>`;
    }

    html += `</div>`;
    resultsDiv.innerHTML = html;
}

function formatNumber(val, decimals = 8) {
    if (val === null || val === undefined) return '-';
    if (!isFinite(val)) return val.toString();
    if (Math.abs(val) < 1e-16) return '0';
    if (Math.abs(val) < 0.00001 || Math.abs(val) > 100000) {
        return val.toExponential(Math.min(decimals, 8));
    }
    return val.toFixed(decimals);
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('smooth');
});
