const processBtn = document.getElementById('processBtn');
const sampleSizeSelect = document.getElementById('sampleSize');
const featureCountInput = document.getElementById('featureCount');
const normalizeCheck = document.getElementById('normalize');
const logTransformCheck = document.getElementById('logTransform');
const polyFeaturesCheck = document.getElementById('polyFeatures');
const standardizeCheck = document.getElementById('standardize');

const timeValue = document.getElementById('timeValue');
const statusText = document.getElementById('statusText');
const inputSizeVal = document.getElementById('inputSizeVal');
const outputSizeVal = document.getElementById('outputSizeVal');

const tableHeader = document.getElementById('tableHeader');
const tableBody = document.getElementById('tableBody');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'result') {
            statusText.textContent = 'Completed';
            timeValue.textContent = `${data.duration}ms`;
            inputSizeVal.textContent = `${data.inputRows} x ${data.inputCols}`;
            outputSizeVal.textContent = `${data.outputRows} x ${data.outputCols}`;
            
            updateTable(data.preview, data.headers);
            processBtn.disabled = false;
        }
    };
}

processBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const sampleSize = parseInt(sampleSizeSelect.value);
    const featureCount = parseInt(featureCountInput.value);
    const config = {
        normalize: normalizeCheck.checked,
        logTransform: logTransformCheck.checked,
        polyFeatures: polyFeaturesCheck.checked,
        standardize: standardizeCheck.checked
    };

    processBtn.disabled = true;
    statusText.textContent = 'Initializing...';
    timeValue.textContent = '-';
    inputSizeVal.textContent = '-';
    outputSizeVal.textContent = '-';
    
    // Clear table
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '<tr><td colspan="5" class="empty">Processing...</td></tr>';

    worker.postMessage({
        command: 'process',
        sampleSize,
        featureCount,
        config
    });
});

function updateTable(previewData, headers) {
    // Header
    tableHeader.innerHTML = '';
    headers.forEach(h => {
        const th = document.createElement('th');
        th.textContent = h;
        tableHeader.appendChild(th);
    });

    // Body
    tableBody.innerHTML = '';
    previewData.forEach(row => {
        const tr = document.createElement('tr');
        row.forEach(cell => {
            const td = document.createElement('td');
            td.textContent = typeof cell === 'number' ? cell.toFixed(4) : cell;
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
}

initWorker();
