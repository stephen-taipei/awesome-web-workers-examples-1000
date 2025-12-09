const plotBtn = document.getElementById('plotBtn');
const eqZInput = document.getElementById('eqZ');
const rangeInput = document.getElementById('range');
const resInput = document.getElementById('resolution');
const thresholdsInput = document.getElementById('thresholds');
const resDisplay = document.getElementById('resDisplay');

const lineCountEl = document.getElementById('lineCount');
const calcTimeEl = document.getElementById('calcTime');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('contourCanvas');
const ctx = canvas.getContext('2d');

let worker;

resInput.addEventListener('input', () => resDisplay.textContent = resInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            calcTimeEl.textContent = `${data.duration}ms`;
            
            let totalLines = 0;
            data.contours.forEach(c => totalLines += c.lines.length);
            lineCountEl.textContent = totalLines;
            
            drawContours(data.contours, data.minZ, data.maxZ);
            plotBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = '#d32f2f';
            plotBtn.disabled = false;
        }
    };
}

plotBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const eqZ = eqZInput.value;
    const range = parseFloat(rangeInput.value);
    const res = parseInt(resInput.value);
    const levels = parseInt(thresholdsInput.value);

    plotBtn.disabled = true;
    statusText.textContent = 'Calculating...';
    statusText.style.color = '#004d40';
    calcTimeEl.textContent = '-';
    lineCountEl.textContent = '-';

    worker.postMessage({
        command: 'compute',
        eqZ, range, resolution: res, levels
    });
});

function drawContours(contours, minZ, maxZ) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // Range of Z for color mapping
    const rangeZ = (maxZ - minZ) || 1;

    contours.forEach(c => {
        const level = c.level;
        // Normalize level to 0-1
        const t = (level - minZ) / rangeZ;
        
        // Color Map (Blue -> White -> Red or similar)
        // Simple: hue from 240 (blue) to 0 (red)
        const hue = 240 * (1 - t);
        ctx.strokeStyle = `hsl(${hue}, 80%, 40%)`;
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        for (let line of c.lines) {
            // line: [[x1, y1], [x2, y2]] (normalized 0-1 in worker or map here?)
            // Let's assume worker sends canvas coordinates? Or normalized?
            // Better normalized to decouple from canvas size in worker.
            
            // Map normalized coordinates 0..1 to canvas
            const x1 = line[0][0] * w;
            const y1 = line[0][1] * h;
            const x2 = line[1][0] * w;
            const y2 = line[1][1] * h;
            
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
        }
        ctx.stroke();
    });
}

initWorker();
plotBtn.click();
