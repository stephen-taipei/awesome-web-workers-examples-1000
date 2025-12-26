const startBtn = document.getElementById('startBtn');
const messageSizeSelect = document.getElementById('messageSize');
const iterationsSelect = document.getElementById('iterations');
const avgRTTDisplay = document.getElementById('avgRTT');
const totalTimeDisplay = document.getElementById('totalTime');
const throughputDisplay = document.getElementById('throughput');

let worker = null;

startBtn.addEventListener('click', () => {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    const size = parseInt(messageSizeSelect.value);
    const iterations = parseInt(iterationsSelect.value);
    const payload = new Uint8Array(size); // Dummy data

    startBtn.disabled = true;
    avgRTTDisplay.textContent = 'Testing...';
    totalTimeDisplay.textContent = '-';
    throughputDisplay.textContent = '-';

    let startTime = performance.now();
    let completed = 0;

    worker.onmessage = function() {
        completed++;
        if (completed < iterations) {
            worker.postMessage(payload);
        } else {
            const endTime = performance.now();
            const totalDuration = endTime - startTime;
            const avgRTT = totalDuration / iterations;
            const totalBytes = size * iterations * 2; // Round trip
            const throughput = (totalBytes / 1024 / 1024) / (totalDuration / 1000); // MB/s

            avgRTTDisplay.textContent = `${avgRTT.toFixed(3)} ms`;
            totalTimeDisplay.textContent = `${totalDuration.toFixed(2)} ms`;
            throughputDisplay.textContent = `${throughput.toFixed(2)} MB/s`;

            startBtn.disabled = false;
            worker.terminate();
            worker = null;
        }
    };

    // Start Ping-Pong
    startTime = performance.now();
    worker.postMessage(payload);
});
