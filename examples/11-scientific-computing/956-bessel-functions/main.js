const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const mInput = document.getElementById('modeM');
const nInput = document.getElementById('modeN');
const speedInput = document.getElementById('speed');

const mDisplay = document.getElementById('mDisplay');
const nDisplay = document.getElementById('nDisplay');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('drumCanvas');
const ctx = canvas.getContext('2d');

let worker;
let imageData;

mInput.addEventListener('input', () => {
    mDisplay.textContent = mInput.value;
    updateParams();
});

nInput.addEventListener('input', () => {
    nDisplay.textContent = nInput.value;
    updateParams();
});

speedInput.addEventListener('input', updateParams);

function updateParams() {
    if (worker) {
        worker.postMessage({
            command: 'params',
            m: parseInt(mInput.value),
            n: parseInt(nInput.value),
            speed: parseInt(speedInput.value)
        });
    }
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'frame') {
            render(data.buffer);
            // Recycle
            worker.postMessage({ command: 'next', buffer: data.buffer }, [data.buffer]);
        }
    };
}

startBtn.addEventListener('click', () => {
    if (!worker) {
        initWorker();
        
        // Init buffer
        const w = canvas.width;
        const h = canvas.height;
        imageData = ctx.createImageData(w, h);
        
        worker.postMessage({
            command: 'start',
            width: w,
            height: h,
            m: parseInt(mInput.value),
            n: parseInt(nInput.value),
            speed: parseInt(speedInput.value)
        });
        
        startBtn.textContent = 'Pause';
        statusText.textContent = 'Running';
        stopBtn.disabled = false;
    } else {
        worker.terminate();
        worker = null;
        startBtn.textContent = 'Resume';
        statusText.textContent = 'Paused';
        stopBtn.disabled = true;
    }
});

stopBtn.addEventListener('click', () => {
    if (worker) worker.terminate();
    worker = null;
    statusText.textContent = 'Stopped';
    startBtn.textContent = 'Start Simulation';
    stopBtn.disabled = true;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
});

function render(buffer) {
    // buffer is Uint8ClampedArray
    imageData.data.set(new Uint8ClampedArray(buffer));
    ctx.putImageData(imageData, 0, 0);
}

initWorker();
