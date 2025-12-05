// Bell Number Calculator - Main Thread

const calculationType = document.getElementById('calculationType');
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

let worker = null;

function initWorker() {
    if (worker) {
        worker.terminate();
    }

    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const data = e.data;

        switch (data.type) {
            case 'progress':
                updateProgress(data.percent, `Calculating B(${data.current})...`);
                break;

            case 'result':
                hideProgress();
                showResult(data);
                resetButtons();
                break;

            case 'error':
                hideProgress();
                showError(data.message);
                resetButtons();
                break;
        }
    };

    worker.onerror = function(e) {
        hideProgress();
        showError('Worker error: ' + e.message);
        resetButtons();
    };
}

function updateProgress(percent, text) {
    progressContainer.classList.remove('hidden');
    progressBar.style.width = percent + '%';
    progressText.textContent = text;
}

function hideProgress() {
    progressContainer.classList.add('hidden');
    progressBar.style.width = '0%';
}

function showResult(data) {
    resultContainer.classList.remove('hidden');
    errorContainer.classList.add('hidden');

    let html = '';

    switch (data.resultType) {
        case 'single':
            html = `<div class="bell-value">
                <span class="bell-index">B(${data.n})</span> = ${data.value}
            </div>
            <div style="margin-top: 0.5rem; color: #a2a2a2;">
                (${data.digits} digits)
            </div>`;
            break;

        case 'sequence':
            html = '<div class="bell-sequence">';
            data.values.forEach((value, index) => {
                const truncated = value.length > 50 ? value.substring(0, 50) + '...' : value;
                html += `<span class="bell-index">B(${index})</span> = ${truncated}\n`;
            });
            html += '</div>';
            break;

        case 'triangle':
            html = '<div class="bell-triangle">';
            data.triangle.forEach((row, rowIndex) => {
                html += `<div style="margin-bottom: 0.3rem;">`;
                html += `<span class="bell-index">Row ${rowIndex}:</span> `;
                const rowStr = row.map(v => {
                    return v.length > 15 ? v.substring(0, 12) + '...' : v;
                }).join('  ');
                html += `<span style="color: #4ecca3;">${rowStr}</span>`;
                html += `</div>`;
            });
            html += '</div>';
            break;
    }

    resultContent.innerHTML = html;
    executionTime.textContent = data.time.toFixed(2) + ' ms';
}

function showError(message) {
    errorContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    errorMessage.textContent = message;
}

function resetButtons() {
    calculateBtn.classList.remove('hidden');
    cancelBtn.classList.add('hidden');
}

function startCalculation() {
    const type = calculationType.value;
    const n = parseInt(nInput.value, 10);

    if (isNaN(n) || n < 0) {
        showError('Please enter a valid non-negative integer for n');
        return;
    }

    if (n > 500) {
        showError('Maximum value for n is 500 to prevent browser slowdown');
        return;
    }

    // Clear previous results
    resultContainer.classList.add('hidden');
    errorContainer.classList.add('hidden');

    // Show progress and swap buttons
    updateProgress(0, 'Initializing...');
    calculateBtn.classList.add('hidden');
    cancelBtn.classList.remove('hidden');

    // Initialize and start worker
    initWorker();
    worker.postMessage({ type, n });
}

function cancelCalculation() {
    if (worker) {
        worker.terminate();
        worker = null;
    }

    hideProgress();
    resetButtons();
    showError('Calculation cancelled by user');
}

// Event listeners
calculateBtn.addEventListener('click', startCalculation);
cancelBtn.addEventListener('click', cancelCalculation);

nInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        startCalculation();
    }
});

// Initialize worker on page load
initWorker();
