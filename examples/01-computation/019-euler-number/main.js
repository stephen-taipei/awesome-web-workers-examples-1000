/**
 * Main Thread: Euler Number Calculator
 *
 * Handles UI interactions and communicates with the Web Worker
 * to calculate Euler numbers, zigzag numbers, and tangent numbers.
 */

// DOM Elements
const numberTypeSelect = document.getElementById('numberType');
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

    if (data.calculationType === 'single') {
        html = formatSingleResult(data);
    } else {
        html = formatSequenceResult(data);
    }

    resultContent.innerHTML = html;
    resetUI();
}

/**
 * Format single result
 */
function formatSingleResult(data) {
    const digitCount = data.result.length;

    let html = '<div class="result-single">';
    html += `<h4>|E(${2 * data.n})|</h4>`;
    html += `<div class="big-number">${data.result}</div>`;
    html += `<p class="result-info">Digits: ${digitCount}</p>`;
    html += '</div>';

    return html;
}

/**
 * Format sequence result
 */
function formatSequenceResult(data) {
    const typeNames = {
        euler: 'Euler Numbers |E(2n)|',
        zigzag: 'Zigzag Numbers A(n)',
        tangent: 'Tangent Numbers T(n)'
    };

    const indexLabels = {
        euler: (item) => `E(${item.index})`,
        zigzag: (item) => `A(${item.index})`,
        tangent: (item) => `T(${item.index})`
    };

    let html = '<div class="result-sequence">';
    html += `<h4>${typeNames[data.numberType]}</h4>`;
    html += '<table class="result-table">';
    html += '<thead><tr><th>Index</th><th>Value</th></tr></thead>';
    html += '<tbody>';

    data.result.forEach(item => {
        const displayValue = item.value.length > 50
            ? item.value.substring(0, 47) + '...'
            : item.value;
        html += `<tr>
            <td>${indexLabels[data.numberType](item)}</td>
            <td class="number-value" title="${item.value}">${displayValue}</td>
        </tr>`;
    });

    html += '</tbody></table>';
    html += `<p class="result-info">Total: ${data.result.length} numbers</p>`;
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
    numberTypeSelect.disabled = false;
    calculationTypeSelect.disabled = false;
}

/**
 * Set UI to calculating state
 */
function setCalculatingUI() {
    calculateBtn.disabled = true;
    cancelBtn.classList.remove('hidden');
    nInput.disabled = true;
    numberTypeSelect.disabled = true;
    calculationTypeSelect.disabled = true;
    progressContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    hideError();
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting calculation...';
}

/**
 * Update UI based on number type selection
 */
function updateUIForNumberType() {
    const numberType = numberTypeSelect.value;
    const calculationType = calculationTypeSelect.value;

    // Update placeholder
    const placeholders = {
        euler: 'e.g., 25 (calculates E(0) to E(50))',
        zigzag: 'e.g., 50 (calculates A(0) to A(50))',
        tangent: 'e.g., 25 (calculates T(0) to T(25))'
    };

    if (calculationType === 'single') {
        nInput.placeholder = 'e.g., 10 (calculates |E(20)|)';
    } else {
        nInput.placeholder = placeholders[numberType];
    }

    // Show/hide single option for non-euler types
    const singleOption = calculationTypeSelect.querySelector('option[value="single"]');
    if (numberType !== 'euler') {
        singleOption.disabled = true;
        if (calculationTypeSelect.value === 'single') {
            calculationTypeSelect.value = 'sequence';
        }
    } else {
        singleOption.disabled = false;
    }
}

/**
 * Start calculation
 */
function startCalculation() {
    const numberType = numberTypeSelect.value;
    const calculationType = calculationTypeSelect.value;
    const n = parseInt(nInput.value, 10);

    // Validate input
    if (isNaN(n) || n < 0) {
        displayError('Please enter a valid non-negative integer.');
        return;
    }

    // Set limits
    const limits = {
        sequence: 200,
        single: 500
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
        numberType: numberType
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
numberTypeSelect.addEventListener('change', updateUIForNumberType);
calculationTypeSelect.addEventListener('change', updateUIForNumberType);

nInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        startCalculation();
    }
});

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    updateUIForNumberType();
});
