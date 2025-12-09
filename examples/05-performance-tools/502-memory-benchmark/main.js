const runBtn = document.getElementById('runBtn');
const sizeSelect = document.getElementById('size');
const opsSelect = document.getElementById('ops');
const outputText = document.getElementById('outputText');
const speedDisplay = document.getElementById('speed');
const timeDisplay = document.getElementById('timeStats');

const worker = new Worker('worker.js');

runBtn.addEventListener('click', () => {
    const sizeMB = parseInt(sizeSelect.value);
    const type = opsSelect.value;

    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    outputText.textContent = `Allocating ${sizeMB}MB and performing ${type}...`;
    speedDisplay.textContent = '-';
    timeDisplay.textContent = '-';

    worker.postMessage({
        sizeMB,
        type
    });
});

worker.onmessage = (e) => {
    const { speedMBps, duration, sum, error } = e.data;

    if (error) {
        outputText.textContent = `Error: ${error}`;
    } else {
        outputText.textContent = `Done!\nDuration: ${duration.toFixed(2)}ms\nChecksum: ${sum} (prevent optimization)`;
        speedDisplay.textContent = `${speedMBps.toFixed(2)} MB/s`;
        timeDisplay.textContent = `${duration.toFixed(2)}ms`;
    }

    runBtn.disabled = false;
    runBtn.textContent = 'Run Benchmark';
};
