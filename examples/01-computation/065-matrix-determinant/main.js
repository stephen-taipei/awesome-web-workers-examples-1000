/**
 * Main script for Matrix Determinant
 */

let worker = null;

function initWorker() {
    if (worker) {
        worker.terminate();
    }
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, algorithm, result, executionTime, percentage, message } = e.data;

        if (type === 'progress') {
            updateProgress(percentage);
        } else if (type === 'result') {
            hideProgress();
            displayResults(algorithm, result, executionTime);
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

function toggleInputMode() {
    const mode = document.getElementById('inputMode').value;
    document.getElementById('manualInput').style.display = mode === 'manual' ? 'block' : 'none';
    document.getElementById('randomInput').style.display = mode === 'random' ? 'block' : 'none';
}

function loadSample(type) {
    document.getElementById('inputMode').value = 'manual';
    toggleInputMode();

    let matrix;

    switch (type) {
        case 'simple':
            matrix = '6, 1, 1\n4, -2, 5\n2, 8, 7';
            break;
        case 'identity':
            matrix = '1, 0, 0\n0, 1, 0\n0, 0, 1';
            break;
        case 'singular':
            matrix = '1, 2, 3\n4, 5, 6\n7, 8, 9';
            break;
        case 'upper':
            matrix = '2, 3, 1, 5\n0, 4, 2, 6\n0, 0, 3, 7\n0, 0, 0, 5';
            break;
        case 'symmetric':
            matrix = '4, 2, 1\n2, 5, 3\n1, 3, 6';
            break;
        case 'large':
            matrix = '2, 1, 3, 4, 5\n1, 3, 2, 1, 2\n4, 2, 5, 3, 1\n3, 1, 2, 4, 2\n1, 2, 1, 2, 3';
            break;
    }

    document.getElementById('matrixInput').value = matrix;
}

function parseMatrix(text) {
    const rows = text.trim().split('\n');
    const matrix = [];
    for (const row of rows) {
        const values = row.split(',').map(v => parseFloat(v.trim()));
        if (values.some(isNaN)) {
            throw new Error('Invalid matrix values');
        }
        matrix.push(values);
    }

    // Validate square matrix
    const n = matrix.length;
    for (let i = 0; i < n; i++) {
        if (matrix[i].length !== n) {
            throw new Error('Determinant requires a square matrix');
        }
    }

    return matrix;
}

function generateRandomMatrix(size, min, max, integerOnly) {
    const matrix = [];
    for (let i = 0; i < size; i++) {
        matrix[i] = [];
        for (let j = 0; j < size; j++) {
            if (integerOnly) {
                matrix[i][j] = Math.floor(Math.random() * (max - min + 1)) + min;
            } else {
                matrix[i][j] = Math.random() * (max - min) + min;
            }
        }
    }
    return matrix;
}

function calculate() {
    const algorithm = document.getElementById('algorithm').value;
    const inputMode = document.getElementById('inputMode').value;

    let matrix;

    try {
        if (inputMode === 'manual') {
            matrix = parseMatrix(document.getElementById('matrixInput').value);
        } else {
            const size = parseInt(document.getElementById('size').value);
            const minVal = parseInt(document.getElementById('minVal').value);
            const maxVal = parseInt(document.getElementById('maxVal').value);
            const integerOnly = document.getElementById('integerOnly').checked;

            matrix = generateRandomMatrix(size, minVal, maxVal, integerOnly);
        }
    } catch (error) {
        displayError(error.message);
        return;
    }

    // Warn about cofactor for large matrices
    if (algorithm === 'cofactor' && matrix.length > 10) {
        displayError('Cofactor expansion is too slow for matrices larger than 10×10. Please use LU Decomposition.');
        return;
    }

    document.getElementById('calculateBtn').disabled = true;
    showProgress();
    initWorker();

    worker.postMessage({ type: algorithm, data: { matrix } });
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

function displayResults(algorithm, result, executionTime) {
    const resultsDiv = document.getElementById('results');

    // Format determinant for display
    const det = result.determinant;
    let detDisplay;
    if (Number.isInteger(det) || Math.abs(det - Math.round(det)) < 1e-10) {
        detDisplay = Math.round(det).toLocaleString();
    } else {
        detDisplay = det.toExponential(10);
    }

    let html = `
        <div class="result-card">
            <h3>Determinant Result</h3>
            <p class="execution-time">Execution time: ${executionTime}ms</p>

            <div class="determinant-display ${result.isSingular ? 'singular' : ''}">
                <div class="det-label">det(A) =</div>
                <div class="det-value">${detDisplay}</div>
            </div>

            <div class="method-display">
                <div class="method-name">${result.algorithm}</div>
                <div class="method-info">${result.complexity}</div>
            </div>

            <div class="stat-grid">
                <div class="stat-item">
                    <span class="stat-label">Matrix Size</span>
                    <span class="stat-value">${result.matrixSize}×${result.matrixSize}</span>
                </div>
    `;

    if (result.swaps !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Row Swaps</span>
                    <span class="stat-value">${result.swaps}</span>
                </div>
        `;
    }

    if (result.operations !== undefined) {
        html += `
                <div class="stat-item">
                    <span class="stat-label">Operations</span>
                    <span class="stat-value">${result.operations.toLocaleString()}</span>
                </div>
        `;
    }

    if (result.isExact) {
        html += `
                <div class="stat-item highlight">
                    <span class="stat-label">Exact</span>
                    <span class="stat-value">Integer arithmetic</span>
                </div>
        `;
    }

    html += `
                <div class="stat-item ${result.isSingular ? 'warning' : ''}">
                    <span class="stat-label">Status</span>
                    <span class="stat-value">${result.isSingular ? 'Singular' : 'Invertible'}</span>
                </div>
            </div>
    `;

    // Display properties
    if (result.properties && result.properties.length > 0) {
        html += `<h4>Matrix Properties</h4><div class="properties-grid">`;
        for (const prop of result.properties) {
            html += `
                <div class="property-item ${prop.icon === '⚠' ? 'warning' : ''}">
                    <span class="property-icon">${prop.icon}</span>
                    <div class="property-text">
                        <span class="property-name">${prop.name}</span>
                        <span class="property-value">${prop.value}</span>
                    </div>
                </div>
            `;
        }
        html += `</div>`;
    }

    // Display comparison table if available
    if (result.comparison) {
        html += `
            <h4>Algorithm Comparison</h4>
            <div class="table-container">
                <table class="method-table">
                    <tr>
                        <th>Algorithm</th>
                        <th>Determinant</th>
                        <th>Time (ms)</th>
                        <th>Complexity</th>
                    </tr>
        `;
        for (const comp of result.comparison) {
            const compDet = Number.isInteger(comp.determinant) ?
                comp.determinant.toLocaleString() : comp.determinant.toExponential(6);
            html += `
                    <tr>
                        <td>${comp.algorithm}</td>
                        <td class="mono">${compDet}</td>
                        <td>${comp.time}</td>
                        <td>${comp.complexity}</td>
                    </tr>
            `;
        }
        html += `
                </table>
            </div>
            <p class="verification">${result.allMatch ? '✓ All results match' : '⚠ Results differ (numerical precision)'}</p>
        `;
    }

    html += `
            <p class="description-text">${result.description}</p>
        </div>
    `;

    resultsDiv.innerHTML = html;
}

function displayError(message) {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `<div class="error">Error: ${message}</div>`;
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSample('simple');
});
