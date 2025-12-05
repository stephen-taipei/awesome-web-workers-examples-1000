const rInput = document.getElementById('realC');
const iInput = document.getElementById('imagC');
const iterInput = document.getElementById('maxIter');
const schemeSelect = document.getElementById('colorScheme');
const trackMouse = document.getElementById('trackMouse');

const rDisplay = document.getElementById('rDisplay');
const iDisplay = document.getElementById('iDisplay');
const iterDisplay = document.getElementById('iterDisplay');
const renderTimeEl = document.getElementById('renderTime');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

let worker;
let pendingRequest = null;
let isBusy = false;

// Params update
[rInput, iInput, iterInput].forEach(el => el.addEventListener('input', updateParams));
schemeSelect.addEventListener('change', requestRender);

function updateParams() {
    rDisplay.textContent = rInput.value;
    iDisplay.textContent = iInput.value;
    iterDisplay.textContent = iterInput.value;
    requestRender();
}

// Mouse interaction
canvas.addEventListener('mousemove', e => {
    if (!trackMouse.checked) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // Map canvas [0, w] -> [-2, 2]
    const real = (x / canvas.width) * 4 - 2;
    const imag = (y / canvas.height) * 4 - 2;
    
    rInput.value = real;
    iInput.value = imag;
    updateParams();
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            const imageData = new ImageData(new Uint8ClampedArray(data.buffer), canvas.width, canvas.height);
            ctx.putImageData(imageData, 0, 0);
            renderTimeEl.textContent = `${data.duration}ms`;
            statusText.textContent = 'Idle';
            isBusy = false;
            
            // Process next queued request
            if (pendingRequest) {
                const req = pendingRequest;
                pendingRequest = null;
                sendRequest(req);
            }
        }
    };
}

function requestRender() {
    const params = {
        width: canvas.width,
        height: canvas.height,
        cRe: parseFloat(rInput.value),
        cIm: parseFloat(iInput.value),
        maxIter: parseInt(iterInput.value),
        scheme: schemeSelect.value
    };
    
    if (isBusy) {
        pendingRequest = params;
    } else {
        sendRequest(params);
    }
}

function sendRequest(params) {
    if (!worker) initWorker();
    isBusy = true;
    statusText.textContent = 'Rendering...';
    worker.postMessage({
        command: 'render',
        ...params
    });
}

initWorker();
requestRender();
