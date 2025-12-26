const sourceText = document.getElementById('sourceText');
const processBtn = document.getElementById('processBtn');
const processTimeDisplay = document.getElementById('processTime');
const origSizeDisplay = document.getElementById('origSize');
const resultText = document.getElementById('resultText');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime } = e.data;

        if (type === 'result') {
            processTimeDisplay.textContent = `${executionTime}ms`;
            origSizeDisplay.textContent = `${data.size} B`;
            resultText.value = data.result;
            processBtn.disabled = false;
        } else if (type === 'error') {
            alert(`Error: ${data}`);
            processBtn.disabled = false;
        }
    };
}

processBtn.addEventListener('click', () => {
    initWorker();

    processBtn.disabled = true;
    processTimeDisplay.textContent = '...';
    origSizeDisplay.textContent = '...';
    resultText.value = 'Decompressing...';

    worker.postMessage({
        compressed: sourceText.value
    });
});

// Init
initWorker();
