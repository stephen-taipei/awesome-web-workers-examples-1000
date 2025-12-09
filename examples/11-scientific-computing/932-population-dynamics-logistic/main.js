const renderBtn = document.getElementById('renderBtn');
const rMinInput = document.getElementById('rMin');
const rMaxInput = document.getElementById('rMax');
const resSelect = document.getElementById('resolution');

const timeVal = document.getElementById('timeVal');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('bifurcationCanvas');
const ctx = canvas.getContext('2d');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            timeVal.textContent = `${data.duration}ms`;
            
            // data.buffer is ImageData or array?
            // Worker returns ArrayBuffer of pixels
            const imageData = new ImageData(new Uint8ClampedArray(data.buffer), data.width, data.height);
            canvas.width = data.width;
            canvas.height = data.height;
            ctx.putImageData(imageData, 0, 0);
            
            renderBtn.disabled = false;
        }
    };
}

renderBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const rMin = parseFloat(rMinInput.value);
    const rMax = parseFloat(rMaxInput.value);
    const width = parseInt(resSelect.value);
    const height = Math.floor(width / 2);

    renderBtn.disabled = true;
    statusText.textContent = 'Computing...';
    timeVal.textContent = '-';
    
    worker.postMessage({
        command: 'render',
        rMin, rMax, width, height
    });
});

initWorker();
renderBtn.click();
