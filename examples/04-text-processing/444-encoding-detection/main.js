const fileInput = document.getElementById('fileInput');
const dropZone = document.getElementById('dropZone');
const resultEncodingEl = document.getElementById('resultEncoding');
const confidenceEl = document.getElementById('confidence');
const previewEl = document.getElementById('preview');
const timeTaken = document.getElementById('timeTaken');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = function(e) {
        const { type, encoding, confidence, time } = e.data;
        if (type === 'result') {
            resultEncodingEl.textContent = encoding;
            confidenceEl.textContent = confidence ? `Confidence: ${confidence}` : '';
            timeTaken.textContent = `(耗時: ${time.toFixed(2)}ms)`;

            // Try to decode preview
            decodePreview(currentFile, encoding);
        }
    };
}

let currentFile = null;

function processFile(file) {
    if (!file) return;
    currentFile = file;

    // Read first 64KB is enough usually
    const CHUNK_SIZE = 64 * 1024;
    const blob = file.slice(0, Math.min(file.size, CHUNK_SIZE));

    const reader = new FileReader();
    reader.onload = (e) => {
        const buffer = e.target.result;

        if (!worker) initWorker();
        worker.postMessage({ buffer }, [buffer]); // Zero copy
    };
    reader.readAsArrayBuffer(blob);

    resultEncodingEl.textContent = '檢測中...';
    previewEl.textContent = '';
    confidenceEl.textContent = '';
}

function decodePreview(file, encoding) {
    if (!file || encoding === 'Unknown' || encoding === 'Binary') {
        previewEl.textContent = '(無法預覽)';
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        previewEl.textContent = e.target.result.substring(0, 500) + (e.target.result.length > 500 ? '...' : '');
    };

    try {
        reader.readAsText(file.slice(0, 2048), encoding);
    } catch (err) {
        console.error(err);
        // Fallback to UTF-8
        reader.readAsText(file.slice(0, 2048), 'UTF-8');
    }
}

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => processFile(e.target.files[0]));
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    processFile(e.dataTransfer.files[0]);
});

initWorker();
