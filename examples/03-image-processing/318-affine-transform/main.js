// Affine Transform - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const applyBtn = document.getElementById('applyBtn');
const resetBtn = document.getElementById('resetBtn');
const processingTimeEl = document.getElementById('processingTime');

const sourceCanvas = document.getElementById('sourceCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');

// Controls
const controls = {
    sx: document.getElementById('sx'),
    sy: document.getElementById('sy'),
    rot: document.getElementById('rot'),
    shx: document.getElementById('shx'),
    shy: document.getElementById('shy')
};

const displays = {
    sx: document.getElementById('valSx'),
    sy: document.getElementById('valSy'),
    rot: document.getElementById('valRot'),
    shx: document.getElementById('valShx'),
    shy: document.getElementById('valShy')
};

let originalImageData = null;
let worker = null;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        if (e.data.type === 'result') {
            const { imageData, width, height, executionTime } = e.data;
            resultCanvas.width = width;
            resultCanvas.height = height;
            resultCtx.putImageData(new ImageData(new Uint8ClampedArray(imageData), width, height), 0, 0);
            processingTimeEl.textContent = `Time: ${executionTime.toFixed(2)}ms`;
            applyBtn.disabled = false;
        }
    };
}

function handleImageLoad(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            // Resize for display purposes if massive
            const maxD = 800;
            let w = img.width;
            let h = img.height;
            if (w > maxD || h > maxD) {
                const r = Math.min(maxD/w, maxD/h);
                w = Math.round(w*r);
                h = Math.round(h*r);
            }

            sourceCanvas.width = w;
            sourceCanvas.height = h;
            sourceCtx.drawImage(img, 0, 0, w, h);
            originalImageData = sourceCtx.getImageData(0, 0, w, h);

            resultCanvas.width = w;
            resultCanvas.height = h;
            resultCtx.clearRect(0,0,w,h);

            applyBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Update displays
Object.keys(controls).forEach(key => {
    controls[key].addEventListener('input', () => {
        displays[key].textContent = controls[key].value;
    });
});

applyBtn.addEventListener('click', () => {
    if (!originalImageData) return;

    applyBtn.disabled = true;
    processingTimeEl.textContent = 'Processing...';

    const params = {
        sx: parseFloat(controls.sx.value),
        sy: parseFloat(controls.sy.value),
        rot: parseFloat(controls.rot.value) * Math.PI / 180,
        shx: parseFloat(controls.shx.value),
        shy: parseFloat(controls.shy.value)
    };

    worker.postMessage({
        type: 'transform',
        imageData: originalImageData,
        params
    });
});

resetBtn.addEventListener('click', () => {
    controls.sx.value = 1; displays.sx.textContent = '1.0';
    controls.sy.value = 1; displays.sy.textContent = '1.0';
    controls.rot.value = 0; displays.rot.textContent = '0';
    controls.shx.value = 0; displays.shx.textContent = '0';
    controls.shy.value = 0; displays.shy.textContent = '0';

    if (originalImageData) {
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    }
});

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageLoad(e.target.files[0]);
});

initWorker();
