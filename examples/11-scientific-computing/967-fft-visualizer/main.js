const analyzeBtn = document.getElementById('analyzeBtn');
const f1Input = document.getElementById('f1');
const f2Input = document.getElementById('f2');
const noiseInput = document.getElementById('noise');
const windowSelect = document.getElementById('windowSize');

const f1Display = document.getElementById('f1Display');
const f2Display = document.getElementById('f2Display');
const statusText = document.getElementById('statusText');
const calcTime = document.getElementById('calcTime');

const timeCanvas = document.getElementById('timeCanvas');
const freqCanvas = document.getElementById('freqCanvas');
const timeCtx = timeCanvas.getContext('2d');
const freqCtx = freqCanvas.getContext('2d');

let worker;

f1Input.addEventListener('input', () => f1Display.textContent = f1Input.value);
f2Input.addEventListener('input', () => f2Display.textContent = f2Input.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Done';
            calcTime.textContent = `${data.duration}ms`;
            
            drawWaveform(timeCtx, data.signal, '#03dac6');
            drawSpectrum(freqCtx, data.spectrum, '#bb86fc');
            
            analyzeBtn.disabled = false;
        }
    };
}

analyzeBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const f1 = parseInt(f1Input.value);
    const f2 = parseInt(f2Input.value);
    const noise = parseFloat(noiseInput.value);
    const size = parseInt(windowSelect.value);

    analyzeBtn.disabled = true;
    statusText.textContent = 'Computing FFT...';
    calcTime.textContent = '-';

    worker.postMessage({
        command: 'analyze',
        f1,
        f2,
        noise,
        size
    });
});

function drawWaveform(ctx, data, color) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    
    const step = w / data.length;
    const mid = h / 2;
    // Normalize roughly to fit
    // Signal is usually -1 to 1 or a bit more with noise. Scale by 50.
    
    for (let i = 0; i < data.length; i++) {
        const x = i * step;
        const y = mid - data[i] * (h / 4); // Scale
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(w, mid);
    ctx.stroke();
}

function drawSpectrum(ctx, data, color) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // data is magnitudes (half size of window)
    // Skip DC component (index 0) usually huge
    const barWidth = w / (data.length - 1);
    
    // Find max for scaling
    let maxVal = 0;
    for(let i=1; i<data.length; i++) if(data[i] > maxVal) maxVal = data[i];
    
    ctx.fillStyle = color;
    for (let i = 1; i < data.length; i++) {
        const height = (data[i] / maxVal) * (h * 0.9);
        const x = (i - 1) * barWidth;
        ctx.fillRect(x, h - height, barWidth, height);
    }
}

initWorker();
analyzeBtn.click();
