const resetBtn = document.getElementById('resetBtn');
const maxIterInput = document.getElementById('maxIter');
const colorSchemeSelect = document.getElementById('colorScheme');
const iterDisplay = document.getElementById('iterDisplay');
const centerXEl = document.getElementById('centerX');
const centerYEl = document.getElementById('centerY');
const zoomLevelEl = document.getElementById('zoomLevel');
const renderTimeEl = document.getElementById('renderTime');
const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

let worker;
let view = {
    x: -0.5,
    y: 0,
    scale: 3.0, // width in complex plane
};

// Canvas size
const width = canvas.width;
const height = canvas.height;
const aspectRatio = width / height;

maxIterInput.addEventListener('input', () => {
    iterDisplay.textContent = maxIterInput.value;
    render();
});

colorSchemeSelect.addEventListener('change', render);

resetBtn.addEventListener('click', () => {
    view = { x: -0.5, y: 0, scale: 3.0 };
    maxIterInput.value = 100;
    iterDisplay.textContent = 100;
    render();
});

// Zoom Interaction
let isDragging = false;
let startPos = { x: 0, y: 0 };

canvas.addEventListener('mousedown', e => {
    isDragging = true;
    startPos = getMousePos(e);
});

canvas.addEventListener('mousemove', e => {
    if (isDragging) {
        // Maybe draw selection box?
    }
});

canvas.addEventListener('mouseup', e => {
    if (!isDragging) return;
    isDragging = false;
    const endPos = getMousePos(e);
    
    // If click (small movement), zoom in at point
    const dist = Math.sqrt((endPos.x - startPos.x)**2 + (endPos.y - startPos.y)**2);
    
    if (dist < 5) {
        // Click zoom
        const cx = (startPos.x / width) * view.scale + (view.x - view.scale/2);
        const cy = (startPos.y / height) * (view.scale/aspectRatio) + (view.y - (view.scale/aspectRatio)/2);
        
        view.x = cx;
        view.y = cy;
        view.scale /= 2;
    } else {
        // Drag zoom (Box)
        // Not implemented for simplicity, just re-center and zoom based on distance
    }
    render();
});

function getMousePos(evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const imageData = new ImageData(new Uint8ClampedArray(data.buffer), width, height);
            ctx.putImageData(imageData, 0, 0);
            renderTimeEl.textContent = `${data.duration}ms`;
            
            // Update Stats
            centerXEl.textContent = view.x.toFixed(6);
            centerYEl.textContent = view.y.toFixed(6);
            zoomLevelEl.textContent = (3.0 / view.scale).toFixed(1) + 'x';
        }
    };
}

function render() {
    if (!worker) initWorker();
    
    const maxIter = parseInt(maxIterInput.value);
    const scheme = colorSchemeSelect.value;

    worker.postMessage({
        command: 'render',
        width,
        height,
        centerX: view.x,
        centerY: view.y,
        scale: view.scale,
        maxIter,
        scheme
    });
}

initWorker();
render();
