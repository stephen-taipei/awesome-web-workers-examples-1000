const genBtn = document.getElementById('genBtn');
const presetSelect = document.getElementById('preset');
const iterInput = document.getElementById('iterations');
const iterDisplay = document.getElementById('iterDisplay');
const customRulesDiv = document.getElementById('customRules');

const axiomInput = document.getElementById('axiom');
const rulesInput = document.getElementById('rules');
const angleInput = document.getElementById('angle');

const strLengthEl = document.getElementById('strLength');
const genTimeEl = document.getElementById('genTime');
const statusText = document.getElementById('statusText');
const canvas = document.getElementById('fractalCanvas');
const ctx = canvas.getContext('2d');

let worker;

const presets = {
    plant: {
        axiom: "X",
        rules: {"X": "F+[[X]-X]-F[-FX]+X", "F": "FF"},
        angle: 25,
        iters: 5
    },
    dragon: {
        axiom: "FX",
        rules: {"X": "X+YF+", "Y": "-FX-Y"},
        angle: 90,
        iters: 10
    },
    sierpinski: {
        axiom: "F-G-G",
        rules: {"F": "F-G+F+G-F", "G": "GG"},
        angle: 120,
        iters: 6
    }
};

iterInput.addEventListener('input', () => iterDisplay.textContent = iterInput.value);

presetSelect.addEventListener('change', () => {
    if (presetSelect.value === 'custom') {
        customRulesDiv.classList.remove('hidden');
    } else {
        customRulesDiv.classList.add('hidden');
        const p = presets[presetSelect.value];
        iterInput.value = p.iters;
        iterDisplay.textContent = p.iters;
    }
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Drawing...';
            strLengthEl.textContent = data.resultString.length.toLocaleString();
            genTimeEl.textContent = `${data.duration}ms`;
            
            drawLSystem(data.resultString, data.angle);
            statusText.textContent = 'Completed';
            genBtn.disabled = false;
        } else if (type === 'error') {
            statusText.textContent = 'Error';
            genBtn.disabled = false;
        }
    };
}

genBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    let axiom, rules, angle;
    
    if (presetSelect.value === 'custom') {
        axiom = axiomInput.value;
        try {
            rules = JSON.parse(rulesInput.value);
        } catch (e) {
            alert("Invalid JSON Rules");
            return;
        }
        angle = parseFloat(angleInput.value);
    } else {
        const p = presets[presetSelect.value];
        axiom = p.axiom;
        rules = p.rules;
        angle = p.angle;
    }
    
    const iterations = parseInt(iterInput.value);

    genBtn.disabled = true;
    statusText.textContent = 'Generating String...';
    strLengthEl.textContent = '-';
    genTimeEl.textContent = '-';
    
    worker.postMessage({
        command: 'generate',
        axiom,
        rules,
        iterations,
        angle
    });
});

function drawLSystem(lString, angleDeg) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const angle = angleDeg * Math.PI / 180;
    
    // Compute bounds first to center/scale?
    // Or start simple with fixed length and center.
    // Auto-fitting L-Systems is hard without pre-calculating bounds.
    // Let's use a fixed step and center, or try to fit.
    
    // Very simple auto-fit logic:
    // Run once to find min/max X/Y
    let minX=0, maxX=0, minY=0, maxY=0;
    let x=0, y=0, dir= -Math.PI/2; // Up
    const stack = [];
    
    // Pre-scan for bounds (can be done in worker, but fast enough here for drawing step?)
    // String length can be HUGE. Drawing in main thread might block if string > 100k chars.
    // Worker returns string.
    
    const step = 10; // Base step
    
    // Just draw
    // Heuristic scale based on string length is unreliable.
    // Let's assume user will drag/zoom or just center it best effort.
    // For this demo, we just draw from bottom center with small step.
    
    // Better: Worker computes bounds? Yes.
    // Let's assume we implement bounds calc in worker in next iteration if needed.
    // For now, basic draw.
    
    ctx.beginPath();
    ctx.strokeStyle = '#558b2f';
    ctx.lineWidth = 1;
    
    // Reset turtle
    x = w / 2;
    y = h; 
    dir = -Math.PI / 2;
    
    // Adjust step based on iter to fit screen roughly
    let drawStep = 20 / Math.pow(1.5, parseInt(iterInput.value) - 1);
    if (presetSelect.value === 'dragon') drawStep = 100 / Math.pow(1.4, parseInt(iterInput.value));
    
    // Center start somewhat
    if (presetSelect.value === 'dragon') { x = w/2; y = h/2; }
    if (presetSelect.value === 'sierpinski') { x = 10; y = h-10; }

    ctx.moveTo(x, y);

    for (let i = 0; i < lString.length; i++) {
        const c = lString[i];
        if (c === 'F' || c === 'G') {
            x += Math.cos(dir) * drawStep;
            y += Math.sin(dir) * drawStep;
            ctx.lineTo(x, y);
        } else if (c === '+') {
            dir += angle;
        } else if (c === '-') {
            dir -= angle;
        } else if (c === '[') {
            stack.push({x, y, dir});
        } else if (c === ']') {
            const state = stack.pop();
            x = state.x;
            y = state.y;
            dir = state.dir;
            ctx.moveTo(x, y);
        }
    }
    ctx.stroke();
}

initWorker();
genBtn.click(); // Initial
