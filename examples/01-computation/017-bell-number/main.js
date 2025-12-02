/**
 * Main Thread: Bell Number Calculator
 *
 * Handles UI interactions and communicates with the Web Worker
 * to calculate Bell numbers using the Bell Triangle method.
 */

// DOM Elements
const calculationTypeSelect = document.getElementById('calculationType');
const nInput = document.getElementById('nInput');
const calculateBtn = document.getElementById('calculateBtn');
const cancelBtn = document.getElementById('cancelBtn');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const resultContainer = document.getElementById('resultContainer');
const resultContent = document.getElementById('resultContent');
const executionTime = document.getElementById('executionTime');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');

// Worker instance
let worker = null;

/**
 * Initialize the Web Worker
 */
function initWorker() {
    if (worker) {
        worker.terminate();
    }

    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const data = e.data;

        switch (data.type) {
            case 'progress':
                updateProgress(data.current, data.total, data.percentage);
                break;

            case 'result':
                displayResult(data);
                break;

            case 'error':
                displayError(data.message);
                break;
        }
    };

    worker.onerror = function(error) {
        displayError(`Worker error: ${error.message}`);
        resetUI();
    };
}

/**
 * Update progress bar
 */
function updateProgress(current, total, percentage) {
    progressBar.style.width = `${percentage}%`;
    progressText.textContent = `Processing: ${current} / ${total} (${percentage}%)`;
}

/**
 * Display calculation result
 */
function displayResult(data) {
    hideError();
    progressContainer.classList.add('hidden');
    resultContainer.classList.remove('hidden');

    executionTime.textContent = `${data.executionTime} ms`;

    let html = '';

    switch (data.calculationType) {
        case 'sequence':
            html = formatSequenceResult(data.result);
            break;

        case 'single':
            html = formatSingleResult(data.n, data.result);
            break;

        case 'triangle':
            html = formatTriangleResult(data.result);
            break;
    }

    resultContent.innerHTML = html;
    resetUI();
}

/**
 * Format Bell number sequence result
 */
function formatSequenceResult(results) {
    let html = '<div class="result-sequence">';
    html += '<h4>Bell Number Sequence</h4>';
    html += '<table class="result-table">';
    html += '<thead><tr><th>n</th><th>B(n)</th></tr></thead>';
    html += '<tbody>';

    results.forEach(item => {
        const displayValue = item.value.length > 50
            ? item.value.substring(0, 47) + '...'
            : item.value;
        html += `<tr>
            <td>${item.index}</td>
            <td class="number-value" title="${item.value}">${displayValue}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    html += `<p class="result-info">Total: ${results.length} Bell numbers</p>`;
    html += '</div>';

    return html;
}

/**
 * Format single Bell number result
 */
function formatSingleResult(n, result) {
    const digitCount = result.length;
    let html = '<div class="result-single">';
    html += `<h4>B(${n})</h4>`;
    html += `<div class="big-number">${result}</div>`;
    html += `<p class="result-info">Digits: ${digitCount}</p>`;
    html += '</div>';

    return html;
}

/**
 * Format Bell Triangle result
 */
function formatTriangleResult(triangle) {
    let html = '<div class="result-triangle">';
    html += '<h4>Bell Triangle (Aitken\'s Array)</h4>';
    html += '<div class="triangle-container">';

    triangle.forEach((row, rowIndex) => {
        html += `<div class="triangle-row">`;
        html += `<span class="row-label">Row ${rowIndex}:</span>`;
        row.forEach((value, colIndex) => {
            const displayValue = value.length > 15
                ? value.substring(0, 12) + '...'
                : value;
            const isFirst = colIndex === 0;
            html += `<span class="triangle-cell${isFirst ? ' bell-number' : ''}" title="${value}">${displayValue}</span>`;
        });
        html += '</div>';
    });

    html += '</div>';
    html += `<p class="result-info">The first element of each row (highlighted) is the Bell number B(row index)</p>`;
    html += '</div>';

    return html;
}

/**
 * Display error message
 */
function displayError(message) {
    progressContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    errorContainer.classList.remove('hidden');
    errorMessage.textContent = message;
    resetUI();
}

/**
 * Hide error message
 */
function hideError() {
    errorContainer.classList.add('hidden');
}

/**
 * Reset UI state
 */
function resetUI() {
    calculateBtn.disabled = false;
    cancelBtn.classList.add('hidden');
    nInput.disabled = false;
    calculationTypeSelect.disabled = false;
}

/**
 * Set UI to calculating state
 */
function setCalculatingUI() {
    calculateBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    nInput.disabled = true;
    calculationTypeSelect.disabled = true;
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    hideError();
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting calculation...';
}

/**
 * Start calculation
 */
function startCalculation() {
    const calculationType = calculationTypeSelect.value;
    const n = parseInt(nInput.value, 10);

    // Validate input
    if (isNaN(n) || n < 0) {
        displayError('Please enter a valid non-negative integer.');
        return;
    }

    // Set reasonable limits based on calculation type
    const limits = {
        sequence: 500,
        single: 1000,
        triangle: 100
    };

    if (n > limits[calculationType]) {
        displayError(`For ${calculationType} calculation, n should be <= ${limits[calculationType]} to avoid memory issues.`);
        return;
    }

    setCalculatingUI();
    initWorker();

    worker.postMessage({
        type: calculationType,
        n: n
    });
}

/**
 * Cancel calculation
 */
function cancelCalculation() {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    resetUI();
    progressContainer.classList.add('hidden');
    progressText.textContent = 'Calculation cancelled.';
}

// Event Listeners
calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);

nInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        startCalculation();
    }
});

// Update input placeholder based on calculation type
calculationTypeSelect.addEventListener('change', function() {
    const type = this.value;
    const placeholders = {
        sequence: 'e.g., 50 (calculates B(0) to B(50))',
        single: 'e.g., 100 (calculates B(100))',
        triangle: 'e.g., 20 (shows first 21 rows)'
    };
    nInput.placeholder = placeholders[type];
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    calculationTypeSelect.dispatchEvent(new Event('change'));
});
