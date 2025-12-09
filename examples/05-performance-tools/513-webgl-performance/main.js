const startBtn = document.getElementById('startWorkerBtn');
const stopBtn = document.getElementById('stopBtn');
const triangleCountSelect = document.getElementById('triangleCount');
const fpsDisplay = document.getElementById('fpsDisplay');
const canvas = document.getElementById('glCanvas');

let worker = null;

startBtn.addEventListener('click', () => {
    // Only one transfer allowed. If re-running, need to handle carefully or refresh.
    // For simplicity, we assume one run or page refresh.
    try {
        const offscreen = canvas.transferControlToOffscreen();
        worker = new Worker('worker.js');
        worker.postMessage({
            canvas: offscreen,
            count: parseInt(triangleCountSelect.value),
            width: canvas.width,
            height: canvas.height
        }, [offscreen]);

        startBtn.disabled = true;
        stopBtn.disabled = false;

        worker.onmessage = function(e) {
            if (e.data.type === 'fps') {
                fpsDisplay.textContent = e.data.value;
            }
        };
    } catch (e) {
        alert("Canvas control already transferred. Please refresh the page.");
    }
});

stopBtn.addEventListener('click', () => {
    if (worker) {
        worker.terminate();
        worker = null;
    }
    startBtn.disabled = false; // Note: Cannot restart on same canvas
    stopBtn.disabled = true;
    fpsDisplay.textContent = '-';
});
