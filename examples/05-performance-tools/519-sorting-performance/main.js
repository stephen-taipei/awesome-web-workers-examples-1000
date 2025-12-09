const testNativeBtn = document.getElementById('testNativeBtn');
const testQuickBtn = document.getElementById('testQuickBtn');
const testBubbleBtn = document.getElementById('testBubbleBtn');
const arraySizeSelect = document.getElementById('arraySize');
const processTimeDisplay = document.getElementById('processTime');
const algoNameDisplay = document.getElementById('algoName');

let worker = null;

function runTest(algorithm) {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    const size = parseInt(arraySizeSelect.value);

    // Disable buttons
    testNativeBtn.disabled = true;
    testQuickBtn.disabled = true;
    testBubbleBtn.disabled = true;

    processTimeDisplay.textContent = 'Running...';
    algoNameDisplay.textContent = algorithm;

    // Generate random array in main thread or worker?
    // Generating in worker ensures we measure sort time properly without transfer overhead affecting it too much,
    // although transfer of Float32Array is fast.
    // Let's generate in worker to be pure.

    worker.postMessage({
        algorithm: algorithm,
        size: size
    });

    worker.onmessage = function(e) {
        const { duration, algorithm } = e.data;
        processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;

        testNativeBtn.disabled = false;
        testQuickBtn.disabled = false;
        testBubbleBtn.disabled = false;
    };
}

testNativeBtn.addEventListener('click', () => runTest('native'));
testQuickBtn.addEventListener('click', () => runTest('quick'));
testBubbleBtn.addEventListener('click', () => {
    // Warn for large arrays
    const size = parseInt(arraySizeSelect.value);
    if (size > 100000) {
        if (!confirm("泡沫排序對於大陣列非常慢 (O(n²))，可能會導致 Worker 長時間運行。確定要繼續嗎？")) {
            return;
        }
    }
    runTest('bubble');
});
