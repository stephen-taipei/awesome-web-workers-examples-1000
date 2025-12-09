const urlInput = document.getElementById('urlInput');
const previewOutput = document.getElementById('previewOutput');
const processTime = document.getElementById('processTime');

let worker;
let lastInput = '';

function initWorker() {
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { result, time, error } = e.data;

        if (error) {
            previewOutput.textContent = `Error: ${error}`;
            previewOutput.style.color = '#f87171';
        } else {
            previewOutput.textContent = JSON.stringify(result, null, 2);
            previewOutput.style.color = '#a7f3d0';
        }

        processTime.textContent = `${time.toFixed(2)}ms`;
    };
}

function updatePreview() {
    const text = urlInput.value;
    if (text === lastInput) return;
    lastInput = text;

    if (!worker) initWorker();
    worker.postMessage({ urls: text });
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}

urlInput.addEventListener('input', debounce(updatePreview, 300));

initWorker();
updatePreview();
