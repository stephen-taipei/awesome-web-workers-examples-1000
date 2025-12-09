const testGzipBtn = document.getElementById('testGzipBtn');
const dataSizeSelect = document.getElementById('dataSize');
const processTimeDisplay = document.getElementById('processTime');
const origSizeDisplay = document.getElementById('origSize');
const compressedSizeDisplay = document.getElementById('compressedSize');

let worker = null;

function runTest() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    const size = parseInt(dataSizeSelect.value);

    testGzipBtn.disabled = true;
    processTimeDisplay.textContent = 'Running...';
    origSizeDisplay.textContent = `${(size / 1024 / 1024).toFixed(2)} MB`;
    compressedSizeDisplay.textContent = '-';

    // Generate compressible data (repetitive)
    const buffer = new Uint8Array(size);
    for (let i = 0; i < size; i++) {
        buffer[i] = i % 255;
    }

    worker.postMessage({
        data: buffer.buffer
    }, [buffer.buffer]);

    worker.onmessage = function(e) {
        const { duration, size } = e.data;
        processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
        compressedSizeDisplay.textContent = `${(size / 1024 / 1024).toFixed(2)} MB`;

        testGzipBtn.disabled = false;
    };
}

testGzipBtn.addEventListener('click', runTest);
