const runBtn = document.getElementById('runBtn');
const countInput = document.getElementById('objectCount');
const fpsDisplay = document.getElementById('fps');
const canvas = document.getElementById('displayCanvas');

// Transfer control to OffscreenCanvas
const offscreen = canvas.transferControlToOffscreen();

const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { type, fps } = e.data;
    if (type === 'fps') {
        fpsDisplay.textContent = `FPS: ${fps}`;
    }
};

runBtn.addEventListener('click', () => {
    if (runBtn.textContent === 'Start Benchmark') {
        const count = parseInt(countInput.value, 10);

        // Only need to transfer once, but we can't transfer again.
        // Logic needs to handle multiple runs if needed, or reload page.
        // For simplicity, we send canvas in the first message if not sent already.

        try {
            worker.postMessage({ command: 'start', canvas: offscreen, count }, [offscreen]);
        } catch (err) {
            // Already transferred
            worker.postMessage({ command: 'start', count });
        }

        runBtn.textContent = 'Stop';
    } else {
        worker.postMessage({ command: 'stop' });
        runBtn.textContent = 'Start Benchmark';
    }
});
