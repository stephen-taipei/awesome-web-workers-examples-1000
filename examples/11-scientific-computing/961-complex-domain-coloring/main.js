const renderBtn = document.getElementById('renderBtn');
const funcSelect = document.getElementById('functionSelect');
const zoomInput = document.getElementById('zoom');
const resSelect = document.getElementById('resolution');
const zoomDisplay = document.getElementById('zoomDisplay');
const renderTime = document.getElementById('renderTime');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('complexCanvas');
const ctx = canvas.getContext('2d');

let worker;

zoomInput.addEventListener('input', () => zoomDisplay.textContent = zoomInput.value + 'x');

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            renderTime.textContent = `${data.duration}ms`;
            
            // Put image data
            const imageData = new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height);
            
            // Scale if resolution != canvas size?
            // For simplicity, resize canvas to match resolution
            canvas.width = data.width;
            canvas.height = data.height;
            
            ctx.putImageData(imageData, 0, 0);
            renderBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = 'Error';
            renderBtn.disabled = false;
        }
    };
}

renderBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const funcType = funcSelect.value;
    const zoom = parseFloat(zoomInput.value);
    const size = parseInt(resSelect.value);

    renderBtn.disabled = true;
    statusText.textContent = 'Rendering...';
    renderTime.textContent = '-';

    worker.postMessage({
        command: 'render',
        funcType,
        zoom,
        width: size,
        height: size
    });
});

initWorker();
renderBtn.click();
