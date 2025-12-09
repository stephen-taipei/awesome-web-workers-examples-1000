const simBtn = document.getElementById('simBtn');
const solarInput = document.getElementById('solar');
const albedoInput = document.getElementById('albedo');
const emissivityInput = document.getElementById('emissivity');
const yearsInput = document.getElementById('years');

const sDisplay = document.getElementById('sDisplay');
const aDisplay = document.getElementById('aDisplay');
const eDisplay = document.getElementById('eDisplay');
const finalTempEl = document.getElementById('finalTemp');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('tempCanvas');
const ctx = canvas.getContext('2d');

let worker;

[solarInput, albedoInput, emissivityInput].forEach(el => {
    el.addEventListener('input', updateDisplays);
});

function updateDisplays() {
    sDisplay.textContent = solarInput.value;
    aDisplay.textContent = albedoInput.value;
    eDisplay.textContent = emissivityInput.value;
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            finalTempEl.textContent = data.finalTemp.toFixed(2);
            drawChart(data.time, data.temp);
            simBtn.disabled = false;
        }
    };
}

simBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const S = parseFloat(solarInput.value);
    const alpha = parseFloat(albedoInput.value);
    const epsilon = parseFloat(emissivityInput.value);
    const years = parseInt(yearsInput.value);

    simBtn.disabled = true;
    statusText.textContent = 'Simulating...';
    
    worker.postMessage({
        command: 'simulate',
        S, alpha, epsilon, years
    });
});

function drawChart(timeArr, tempArr) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    // Scales
    const maxT = timeArr[timeArr.length - 1];
    let minTemp = Math.min(...tempArr);
    let maxTemp = Math.max(...tempArr);
    
    // Add padding
    const tempRange = (maxTemp - minTemp) || 1;
    minTemp -= tempRange * 0.1;
    maxTemp += tempRange * 0.1;
    
    const mapX = t => (t / maxT) * (w - 40) + 20;
    const mapY = val => h - 20 - ((val - minTemp) / (maxTemp - minTemp)) * (h - 40);
    
    // Draw Axes
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, h-20); ctx.lineTo(w-20, h-20);
    ctx.moveTo(20, h-20); ctx.lineTo(20, 20);
    ctx.stroke();
    
    // Draw Curve
    ctx.strokeStyle = '#ff7043';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < timeArr.length; i++) {
        const x = mapX(timeArr[i]);
        const y = mapY(tempArr[i]);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    
    // Labels
    ctx.fillStyle = '#004d40';
    ctx.font = '12px Arial';
    ctx.fillText(`${maxTemp.toFixed(1)}°C`, 25, mapY(maxTemp) + 10);
    ctx.fillText(`${minTemp.toFixed(1)}°C`, 25, mapY(minTemp) - 5);
}

initWorker();
simBtn.click();
