/**
 * Main Thread: Stirling Number Calculator
 *
 * Handles UI interactions and communicates with the Web Worker
 * to calculate Stirling numbers of the first and second kind.
 */

// DOM Elements
const kindSelect = document.getElementById('kindSelect');
const calculationTypeSelect = document.getElementById('calculationType');
const nInput = document.getElementById('nInput');
const kInputGroup = document.getElementById('kInputGroup');
const kInput = document.getElementById('kInput');
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

    const kindName = data.kind === 'first' ? 'First Kind |s(n,k)|' : 'Second Kind S(n,k)';
    let html = `<p class="result-kind">Stirling Numbers of the ${kindName}</p>`;

    switch (data.calculationType) {
        case 'single':
            html += formatSingleResult(data);
            break;

        case 'row':
            html += formatRowResult(data);
            break;

        case 'triangle':
            html += formatTriangleResult(data);
            break;
    }

    resultContent.innerHTML = html;
    resetUI();
}

/**
 * Format single Stirling number result
 */
function formatSingleResult(data) {
    const notation = data.kind === 'first' ? `|s(${data.n}, ${data.k})|` : `S(${data.n}, ${data.k})`;
    const digitCount = data.result.length;

    let html = '<div class="result-single">';
    html += `<h4>${notation}</h4>`;
    html += `<div class="big-number">${data.result}</div>`;
    html += `<p class="result-info">Digits: ${digitCount}</p>`;
    html += '</div>';

    return html;
}

/**
 * Format row result
 */
function formatRowResult(data) {
    const notation = data.kind === 'first' ? '|s|' : 'S';

    let html = '<div class="result-row">';
    html += `<h4>Row n = ${data.n}</h4>`;
    html += '<table class="result-table">';
    html += `<thead><tr><th>k</th><th>${notation}(${data.n}, k)</th></tr></thead>`;
    html += '<tbody>';

    data.result.forEach(item => {
        const displayValue = item.value.length > 50
            ? item.value.substring(0, 47) + '...'
            : item.value;
        html += `<tr>
            <td>${item.k}</td>
            <td class="number-value" title="${item.value}">${displayValue}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    html += '</div>';

    return html;
}

/**
 * Format triangle result
 */
function formatTriangleResult(data) {
    const notation = data.kind === 'first' ? '|s|' : 'S';

    let html = '<div class="result-triangle">';
    html += `<h4>Stirling Triangle (${notation})</h4>`;
    html += '<div class="triangle-container">';

    data.result.forEach((row, rowIndex) => {
        html += `<div class="triangle-row">`;
        html += `<span class="row-label">n=${rowIndex}:</span>`;
        row.forEach((value, colIndex) => {
            const displayValue = value.length > 10
                ? value.substring(0, 7) + '...'
                : value;
            html += `<span class="triangle-cell" title="${notation}(${rowIndex},${colIndex}) = ${value}">${displayValue}</span>`;
        });
        html += '</div>';
    });

    html += '</div>';
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
    kInput.disabled = false;
    kindSelect.disabled = false;
    calculationTypeSelect.disabled = false;
}

/**
 * Set UI to calculating state
 */
function setCalculatingUI() {
    calculateBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    nInput.disabled = true;
    kInput.disabled = true;
    kindSelect.disabled = true;
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
    const kind = kindSelect.value;
    const calculationType = calculationTypeSelect.value;
    const n = parseInt(nInput.value, 10);
    const k = parseInt(kInput.value, 10);

    // Validate n
    if (isNaN(n) || n < 0) {
        displayError('Please enter a valid non-negative integer for n.');
        return;
    }

    // Validate k for single calculation
    if (calculationType === 'single') {
        if (isNaN(k) || k < 0) {
            displayError('Please enter a valid non-negative integer for k.');
            return;
        }
        if (k > n) {
            displayError('k cannot be greater than n.');
            return;
        }
    }

    // Set limits
    const limits = {
        single: 1000,
        row: 500,
        triangle: 50
    };

    if (n > limits[calculationType]) {
        displayError(`For ${calculationType} calculation, n should be <= ${limits[calculationType]}.`);
        return;
    }

    setCalculatingUI();
    initWorker();

    worker.postMessage({
        type: calculationType,
        n: n,
        k: k,
        kind: kind
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

/**
 * Toggle k input visibility based on calculation type
 */
function updateKInputVisibility() {
    const calculationType = calculationTypeSelect.value;
    if (calculationType === 'single') {
        kInputGroup.classList.remove('hidden');
    } else {
        kInputGroup.classList.add('hidden');
    }
}

// Event Listeners
calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);
calculationTypeSelect.addEventListener('change', updateKInputVisibility);

nInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        startCalculation();
    }
});

kInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        startCalculation();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateKInputVisibility();
});
