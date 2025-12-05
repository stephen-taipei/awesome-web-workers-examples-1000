const runBtn = document.getElementById('runBtn');
const sampleSizeSelect = document.getElementById('sampleSize');
const kValueInput = document.getElementById('kValue');
const noiseInput = document.getElementById('noiseLevel');
const kDisplay = document.getElementById('kDisplay');
const noiseDisplay = document.getElementById('noiseDisplay');
const statusText = document.getElementById('statusText');
const avgMSE = document.getElementById('avgMSE');
const avgR2 = document.getElementById('avgR2');
const foldGrid = document.getElementById('foldGrid');
const canvas = document.getElementById('visCanvas');
const ctx = canvas.getContext('2d');

let worker;

kValueInput.addEventListener('input', () => kDisplay.textContent = kValueInput.value);
noiseInput.addEventListener('input', () => noiseDisplay.textContent = noiseInput.value);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'foldStart') {
            const card = document.getElementById(`fold-${data.foldIndex}`);
            if (card) {
                card.classList.add('active');
                card.innerHTML = `<h4>Fold ${data.foldIndex + 1}</h4>Training...`;
            }
            drawVisualization(data.trainPoints, data.testPoints);
        } else if (type === 'foldResult') {
            const card = document.getElementById(`fold-${data.foldIndex}`);
            if (card) {
                card.classList.remove('active');
                card.innerHTML = `
                    <h4>Fold ${data.foldIndex + 1}</h4>
                    <div class="fold-metric">MSE: ${data.mse.toFixed(4)}</div>
                    <div class="fold-metric">R²: ${data.r2.toFixed(4)}</div>
                `;
            }
        } else if (type === 'finalResult') {
            statusText.textContent = 'Completed';
            avgMSE.textContent = data.avgMSE.toFixed(4);
            avgR2.textContent = data.avgR2.toFixed(4);
            runBtn.disabled = false;
        } else if (type === 'status') {
            statusText.textContent = data;
        }
    };
}

runBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const n = parseInt(sampleSizeSelect.value);
    const k = parseInt(kValueInput.value);
    const noise = parseInt(noiseInput.value);

    runBtn.disabled = true;
    statusText.textContent = 'Starting...';
    avgMSE.textContent = '-';
    avgR2.textContent = '-';
    
    // Create fold cards
    foldGrid.innerHTML = '';
    for (let i = 0; i < k; i++) {
        const div = document.createElement('div');
        div.className = 'fold-card';
        div.id = `fold-${i}`;
        div.innerHTML = `<h4>Fold ${i + 1}</h4>Pending`;
        foldGrid.appendChild(div);
    }

    worker.postMessage({
        command: 'run',
        n,
        k,
        noise
    });
});

function drawVisualization(trainPoints, testPoints) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Just visualize a subset to not kill the canvas
    const subsetSize = 200;
    const scaleX = w / 100; // Assuming X 0-100
    const scaleY = h / 100; // Assuming Y 0-100 roughly

    // Find bounds roughly if needed, but we generated 0-100
    
    // Draw Train (Blue)
    ctx.fillStyle = 'rgba(37, 99, 235, 0.2)';
    for (let i = 0; i < Math.min(trainPoints.length, subsetSize); i++) {
        const x = trainPoints[i].x * scaleX;
        const y = h - trainPoints[i].y * scaleY * 0.5; // Scale Y to fit
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
    }

    // Draw Test (Red)
    ctx.fillStyle = 'rgba(220, 38, 38, 0.8)';
    for (let i = 0; i < Math.min(testPoints.length, subsetSize/2); i++) {
        const x = testPoints[i].x * scaleX;
        const y = h - testPoints[i].y * scaleY * 0.5;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}

initWorker();
