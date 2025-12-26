const testHashBtn = document.getElementById('testHashBtn');
const testEncryptBtn = document.getElementById('testEncryptBtn');
const dataSizeSelect = document.getElementById('dataSize');
const processTimeDisplay = document.getElementById('processTime');
const speedDisplay = document.getElementById('speed');

let worker = null;

function runTest(type) {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    const size = parseInt(dataSizeSelect.value);

    testHashBtn.disabled = true;
    testEncryptBtn.disabled = true;
    processTimeDisplay.textContent = 'Running...';
    speedDisplay.textContent = '-';

    const buffer = new Uint8Array(size); // Zero-filled buffer

    // Transfer buffer to avoid copy cost affecting measurement (though minimal for 1MB)
    // Actually, creating buffer in main thread and transferring is best.

    worker.postMessage({
        type: type,
        data: buffer.buffer
    }, [buffer.buffer]);

    worker.onmessage = function(e) {
        const { duration, size } = e.data;
        processTimeDisplay.textContent = `${duration.toFixed(2)} ms`;

        const speed = (size / 1024 / 1024) / (duration / 1000);
        speedDisplay.textContent = `${speed.toFixed(2)} MB/s`;

        testHashBtn.disabled = false;
        testEncryptBtn.disabled = false;
    };
}

testHashBtn.addEventListener('click', () => runTest('hash'));
testEncryptBtn.addEventListener('click', () => runTest('encrypt'));
