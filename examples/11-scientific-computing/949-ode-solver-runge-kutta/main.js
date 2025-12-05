const solveBtn = document.getElementById('solveBtn');
const systemSelect = document.getElementById('systemSelect');
const paramControls = document.getElementById('paramControls');
const durationInput = document.getElementById('duration');
const stepInput = document.getElementById('stepSize');

const pointCountEl = document.getElementById('pointCount');
const calcTimeEl = document.getElementById('calcTime');
const statusText = document.getElementById('statusText');

const timeCanvas = document.getElementById('timeChart');
const phaseCanvas = document.getElementById('phaseChart');
const timeCtx = timeCanvas.getContext('2d');
const phaseCtx = phaseCanvas.getContext('2d');

let worker;

const systems = {
    lotka: {
        params: { alpha: 0.66, beta: 1.33, delta: 1, gamma: 1 },
        labels: ['Prey (x)', 'Predator (y)'],
        init: [10, 10]
    },
    harmonic: {
        params: { k: 1, c: 0.5, m: 1 }, // k=spring, c=damping, m=mass
        labels: ['Position (x)', 'Velocity (v)'],
        init: [2, 0]
    },
    vanDerPol: {
        params: { mu: 1.0 },
        labels: ['x', 'y'],
        init: [0.5, 0]
    }
};

function renderParams() {
    const sys = systems[systemSelect.value];
    paramControls.innerHTML = '';
    
    for (let key in sys.params) {
        const div = document.createElement('div');
        div.className = 'form-group';
        
        const label = document.createElement('label');
        label.textContent = `${key}:`;
        
        const input = document.createElement('input');
        input.type = 'number';
        input.id = `param_${key}`;
        input.value = sys.params[key];
        input.step = 0.1;
        
        div.appendChild(label);
        div.appendChild(input);
        paramControls.appendChild(div);
    }
}

systemSelect.addEventListener('change', renderParams);

function getParams() {
    const sys = systems[systemSelect.value];
    const params = {};
    for (let key in sys.params) {
        params[key] = parseFloat(document.getElementById(`param_${key}`).value);
    }
    return params;
}

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            calcTimeEl.textContent = `${data.duration}ms`;
            pointCountEl.textContent = data.points.length;
            
            drawCharts(data.points, systemSelect.value);
            solveBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = 'red';
            solveBtn.disabled = false;
        }
    };
}

solveBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const sysKey = systemSelect.value;
    const params = getParams();
    const duration = parseFloat(durationInput.value);
    const dt = parseFloat(stepInput.value);
    const initVal = systems[sysKey].init;

    solveBtn.disabled = true;
    statusText.textContent = 'Solving...';
    calcTimeEl.textContent = '-';
    pointCountEl.textContent = '-';

    worker.postMessage({
        command: 'solve',
        system: sysKey,
        params,
        init: initVal,
        duration,
        dt
    });
});

function drawCharts(data, sysKey) {
    const labels = systems[sysKey].labels;
    
    // Time Chart (t vs x, t vs y)
    drawTimeChart(data, labels);
    
    // Phase Chart (x vs y)
    drawPhaseChart(data, labels);
}

function drawTimeChart(data, labels) {
    const w = timeCanvas.width;
    const h = timeCanvas.height;
    timeCtx.clearRect(0, 0, w, h);
    
    // Find scales
    let maxVal = -Infinity, minVal = Infinity;
    let maxT = data[data.length-1].t;
    
    for (let p of data) {
        maxVal = Math.max(maxVal, p.y[0], p.y[1]);
        minVal = Math.min(minVal, p.y[0], p.y[1]);
    }
    
    const rangeY = maxVal - minVal || 1;
    const padding = 20;
    
    const mapX = t => padding + (t / maxT) * (w - 2*padding);
    const mapY = v => h - padding - ((v - minVal) / rangeY) * (h - 2*padding);
    
    // Grid
    timeCtx.strokeStyle = '#eee';
    timeCtx.beginPath();
    timeCtx.moveTo(padding, mapY(0)); timeCtx.lineTo(w-padding, mapY(0)); // Zero line
    timeCtx.stroke();
    
    // Draw Variable 1 (Blue)
    timeCtx.strokeStyle = '#1976d2';
    timeCtx.lineWidth = 2;
    timeCtx.beginPath();
    for (let i=0; i<data.length; i++) {
        const x = mapX(data[i].t);
        const y = mapY(data[i].y[0]);
        if(i===0) timeCtx.moveTo(x,y); else timeCtx.lineTo(x,y);
    }
    timeCtx.stroke();
    
    // Draw Variable 2 (Orange)
    timeCtx.strokeStyle = '#ef6c00';
    timeCtx.beginPath();
    for (let i=0; i<data.length; i++) {
        const x = mapX(data[i].t);
        const y = mapY(data[i].y[1]);
        if(i===0) timeCtx.moveTo(x,y); else timeCtx.lineTo(x,y);
    }
    timeCtx.stroke();
    
    // Legend
    timeCtx.font = '12px Arial';
    timeCtx.fillStyle = '#1976d2';
    timeCtx.fillText(labels[0], 10, 15);
    timeCtx.fillStyle = '#ef6c00';
    timeCtx.fillText(labels[1], 100, 15);
}

function drawPhaseChart(data, labels) {
    const w = phaseCanvas.width;
    const h = phaseCanvas.height;
    phaseCtx.clearRect(0, 0, w, h);
    
    // X vs Y
    let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
    for(let p of data) {
        minX = Math.min(minX, p.y[0]); maxX = Math.max(maxX, p.y[0]);
        minY = Math.min(minY, p.y[1]); maxY = Math.max(maxY, p.y[1]);
    }
    
    const padding = 20;
    const mapX = v => padding + ((v - minX) / (maxX - minX)) * (w - 2*padding);
    const mapY = v => h - padding - ((v - minY) / (maxY - minY)) * (h - 2*padding);
    
    phaseCtx.strokeStyle = '#7cb342';
    phaseCtx.lineWidth = 1.5;
    phaseCtx.beginPath();
    for(let i=0; i<data.length; i++) {
        const x = mapX(data[i].y[0]);
        const y = mapY(data[i].y[1]);
        if(i===0) phaseCtx.moveTo(x,y); else phaseCtx.lineTo(x,y);
    }
    phaseCtx.stroke();
    
    // Title
    phaseCtx.fillStyle = '#333';
    phaseCtx.font = '12px Arial';
    phaseCtx.fillText(`Phase Portrait: ${labels[1]} vs ${labels[0]}`, 10, 15);
}

renderParams();
initWorker();
