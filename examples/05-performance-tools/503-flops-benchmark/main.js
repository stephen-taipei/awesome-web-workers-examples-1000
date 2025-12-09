const runBtn = document.getElementById('runBtn');
const iterationsSelect = document.getElementById('iterations');
const precisionSelect = document.getElementById('precision');
const outputText = document.getElementById('outputText');
const gflopsDisplay = document.getElementById('gflops');
const timeDisplay = document.getElementById('timeStats');

const worker = new Worker('worker.js');

runBtn.addEventListener('click', () => {
    const iterations = parseInt(iterationsSelect.value) * 1000000;
    const precision = precisionSelect.value;

    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    outputText.textContent = `Running ${iterations.toLocaleString()} FP ops (${precision}-bit)...`;
    gflopsDisplay.textContent = '-';
    timeDisplay.textContent = '-';

    worker.postMessage({
        iterations,
        precision
    });
});

worker.onmessage = (e) => {
    const { gflops, duration, result } = e.data;

    outputText.textContent = `Done!\nResult: ${result}\nDuration: ${duration.toFixed(2)}ms`;
    gflopsDisplay.textContent = `${gflops.toFixed(2)} GFLOPS`;
    timeDisplay.textContent = `${duration.toFixed(2)}ms`;

    runBtn.disabled = false;
    runBtn.textContent = 'Run Benchmark';
};
