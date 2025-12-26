const testCloneBtn = document.getElementById('testCloneBtn');
const testTransferBtn = document.getElementById('testTransferBtn');
const dataSizeSelect = document.getElementById('dataSize');
const cloneTimeDisplay = document.getElementById('cloneTime');
const transferTimeDisplay = document.getElementById('transferTime');

function runTest(transfer) {
    const size = parseInt(dataSizeSelect.value);
    const buffer = new Uint8Array(size).buffer; // Create ArrayBuffer
    const worker = new Worker('worker.js');

    const startTime = performance.now();

    if (transfer) {
        worker.postMessage(buffer, [buffer]);
    } else {
        worker.postMessage(buffer);
    }

    worker.onmessage = function() {
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (transfer) {
            transferTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
        } else {
            cloneTimeDisplay.textContent = `${duration.toFixed(2)} ms`;
        }

        worker.terminate();
        testCloneBtn.disabled = false;
        testTransferBtn.disabled = false;
    };
}

testCloneBtn.addEventListener('click', () => {
    testCloneBtn.disabled = true;
    testTransferBtn.disabled = true;
    cloneTimeDisplay.textContent = 'Running...';
    // Small timeout to allow UI update
    setTimeout(() => runTest(false), 50);
});

testTransferBtn.addEventListener('click', () => {
    testCloneBtn.disabled = true;
    testTransferBtn.disabled = true;
    transferTimeDisplay.textContent = 'Running...';
    setTimeout(() => runTest(true), 50);
});
