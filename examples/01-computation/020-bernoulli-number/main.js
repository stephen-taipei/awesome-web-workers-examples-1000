/**
 * Main Thread: Bernoulli Number Calculator
 *
 * Handles UI interactions and communicates with the Web Worker
 * to calculate Bernoulli numbers using exact rational arithmetic.
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
        case 'nonzero':
            html = formatSequenceResult(data);
            break;

        case 'single':
            html = formatSingleResult(data);
            break;

        case 'sumofpowers':
            html = formatSumOfPowersResult(data);
            break;
    }

    resultContent.innerHTML = html;
    resetUI();
}

/**
 * Format sequence result
 */
function formatSequenceResult(data) {
    const title = data.calculationType === 'nonzero'
        ? 'Non-Zero Bernoulli Numbers'
        : 'Bernoulli Numbers B(n)';

    let html = '<div class="result-sequence">';
    html += `<h4>${title}</h4>`;
    html += '<table class="result-table">';
    html += '<thead><tr><th>n</th><th>Fraction</th><th>Decimal</th></tr></thead>';
    html += '<tbody>';

    data.result.forEach(item => {
        const fractionDisplay = item.fraction.length > 40
            ? item.fraction.substring(0, 37) + '...'
            : item.fraction;
        html += `<tr>
            <td>B(${item.index})</td>
            <td class="fraction-value" title="${item.fraction}">${fractionDisplay}</td>
            <td class="decimal-value">${item.decimal}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    html += `<p class="result-info">Total: ${data.result.length} numbers</p>`;
    html += '</div>';

    return html;
}

/**
 * Format single result
 */
function formatSingleResult(data) {
    let html = '<div class="result-single">';
    html += `<h4>B(${data.n})</h4>`;

    html += '<div class="value-box">';
    html += '<p class="value-label">Exact Fraction:</p>';
    html += `<div class="big-number">${data.result.fraction}</div>`;
    html += '</div>';

    html += '<div class="value-box">';
    html += '<p class="value-label">Decimal Approximation:</p>';
    html += `<div class="decimal-number">${data.result.decimal}</div>`;
    html += '</div>';

    html += '</div>';

    return html;
}

/**
 * Format sum of powers coefficients result
 */
function formatSumOfPowersResult(data) {
    let html = '<div class="result-sumofpowers">';
    html += `<h4>Sum of Powers Formula for p = ${data.n}</h4>`;
    html += `<p class="formula-desc">Formula: &sum;<sub>k=1</sub><sup>n</sup> k<sup>${data.n}</sup> = </p>`;

    html += '<table class="result-table">';
    html += '<thead><tr><th>Term</th><th>Coefficient</th><th>Power of n</th></tr></thead>';
    html += '<tbody>';

    data.result.forEach((item, idx) => {
        if (item.coefficient !== '0') {
            html += `<tr>
                <td>C(${data.n + 1}, ${item.k}) &middot; B(${item.k})</td>
                <td class="fraction-value">${item.coefficient}</td>
                <td>n<sup>${item.power}</sup></td>
            </tr>`;
        }
    });

    html += '</tbody></table>';

    html += `<p class="result-info">Multiply by 1/${data.n + 1} for final coefficients</p>`;
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
 * Update placeholder based on calculation type
 */
function updatePlaceholder() {
    const type = calculationTypeSelect.value;
    const placeholders = {
        sequence: 'e.g., 30 (calculates B(0) to B(30))',
        nonzero: 'e.g., 25 (calculates non-zero up to B(50))',
        single: 'e.g., 20 (calculates B(20))',
        sumofpowers: 'e.g., 5 (formula for sum of 5th powers)'
    };
    nInput.placeholder = placeholders[type];
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

    // Set limits
    const limits = {
        sequence: 100,
        nonzero: 100,
        single: 200,
        sumofpowers: 50
    };

    if (n > limits[calculationType]) {
        displayError(`For ${calculationType} calculation, n should be <= ${limits[calculationType]}.`);
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
}

// Event Listeners
calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);
calculationTypeSelect.addEventListener('change', updatePlaceholder);

nInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        startCalculation();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updatePlaceholder();
});
