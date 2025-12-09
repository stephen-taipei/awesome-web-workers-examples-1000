// Wave Deformation - Main Thread

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const applyBtn = document.getElementById('applyBtn');
const animateBtn = document.getElementById('animateBtn');
const resetBtn = document.getElementById('resetBtn');
const processingTimeEl = document.getElementById('processingTime');

const sourceCanvas = document.getElementById('sourceCanvas');
const sourceCtx = sourceCanvas.getContext('2d');
const resultCanvas = document.getElementById('resultCanvas');
const resultCtx = resultCanvas.getContext('2d');

const controls = {
    amplitude: document.getElementById('amplitude'),
    frequency: document.getElementById('frequency'),
    phase: document.getElementById('phase'),
    direction: document.getElementById('direction')
};

const displays = {
    amplitude: document.getElementById('valAmp'),
    frequency: document.getElementById('valFreq'),
    phase: document.getElementById('valPhase')
};

let originalImageData = null;
let worker = null;
let isAnimating = false;
let animationFrameId;

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

            if (isAnimating) {
                requestAnimationFrame(animateLoop);
            }
        }
    };
}

function handleImageLoad(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const maxD = 600;
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
            resultCtx.clearRect(0, 0, w, h);
            applyBtn.disabled = false;
            animateBtn.disabled = false;

            applyEffect();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

Object.keys(displays).forEach(key => {
    controls[key].addEventListener('input', () => {
        displays[key].textContent = controls[key].value;
        if (!isAnimating) {
             // Optional: Real-time update if fast enough
        }
    });
});

function applyEffect() {
    if (!originalImageData) return;

    if (!isAnimating) {
        applyBtn.disabled = true;
        processingTimeEl.textContent = 'Processing...';
    }

    worker.postMessage({
        type: 'wave',
        imageData: originalImageData,
        params: {
            amplitude: parseFloat(controls.amplitude.value),
            frequency: parseFloat(controls.frequency.value),
            phase: parseFloat(controls.phase.value),
            direction: controls.direction.value
        }
    });
}

function animateLoop() {
    if (!isAnimating) return;

    // Increment phase
    let p = parseFloat(controls.phase.value);
    p += 0.2;
    if (p > Math.PI * 2) p -= Math.PI * 2;

    controls.phase.value = p;
    displays.phase.textContent = p.toFixed(2);

    applyEffect();
}

applyBtn.addEventListener('click', () => {
    stopAnimation();
    applyEffect();
});

animateBtn.addEventListener('click', () => {
    if (isAnimating) {
        stopAnimation();
    } else {
        startAnimation();
    }
});

function startAnimation() {
    if (!originalImageData) return;
    isAnimating = true;
    animateBtn.textContent = 'Stop Animation';
    animateLoop();
}

function stopAnimation() {
    isAnimating = false;
    animateBtn.textContent = 'Animate';
    applyBtn.disabled = false;
}

resetBtn.addEventListener('click', () => {
    stopAnimation();
    controls.amplitude.value = 20; displays.amplitude.textContent = '20';
    controls.frequency.value = 0.02; displays.frequency.textContent = '0.02';
    controls.phase.value = 0; displays.phase.textContent = '0';

    if (originalImageData) {
        resultCtx.clearRect(0, 0, resultCanvas.width, resultCanvas.height);
    }
});

uploadArea.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleImageLoad(e.target.files[0]);
});

initWorker();
