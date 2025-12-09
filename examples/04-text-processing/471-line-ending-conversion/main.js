const inputText = document.getElementById('inputText');
const processBtn = document.getElementById('processBtn');
const outputText = document.getElementById('outputText');
const timingStats = document.getElementById('timing');
const statsInfo = document.getElementById('statsInfo');
const formatSelect = document.getElementById('format');

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { result, time, stats, debugView } = e.data;
    outputText.textContent = debugView; // Show debug view where \r is visible or replaced
    timingStats.textContent = `Time: ${time.toFixed(2)}ms`;
    statsInfo.textContent = `LF: ${stats.lf} | CRLF: ${stats.crlf} | CR: ${stats.cr}`;
    processBtn.disabled = false;
    processBtn.textContent = 'Convert Line Endings';

    // Also update the actual text value if we were using a textarea for output,
    // but here we use pre for visualization.
};

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    if (!text) return;

    processBtn.disabled = true;
    processBtn.textContent = 'Processing...';

    worker.postMessage({
        text,
        format: formatSelect.value
    });
});
