const diffBtn = document.getElementById('diffBtn');
const evalBtn = document.getElementById('evalBtn');
const expressionInput = document.getElementById('expression');
const evalXInput = document.getElementById('evalX');

const derivativeEl = document.getElementById('derivative');
const numericValEl = document.getElementById('numericVal');
const valOutput = document.getElementById('valOutput');
const xValDisplay = document.getElementById('xValDisplay');
const statusText = document.getElementById('statusText');
const calcTime = document.getElementById('calcTime');

let worker;
let currentDerivativeFunc = null; // JS body

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            calcTime.textContent = `${data.duration}ms`;
            derivativeEl.textContent = data.derivative;
            currentDerivativeFunc = data.jsFunction;
            evalBtn.disabled = false;
            valOutput.classList.add('hidden');
        } else if (type === 'evalResult') {
            statusText.textContent = 'Evaluated';
            numericValEl.textContent = data.value.toFixed(6);
            xValDisplay.textContent = evalXInput.value;
            valOutput.classList.remove('hidden');
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = 'red';
        }
    };
}

diffBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const expr = expressionInput.value;
    
    diffBtn.disabled = true;
    evalBtn.disabled = true;
    statusText.textContent = 'Differentiating...';
    statusText.style.color = '#0d47a1';
    calcTime.textContent = '-';
    derivativeEl.textContent = '...';
    
    worker.postMessage({
        command: 'differentiate',
        expression: expr
    });
    
    setTimeout(() => diffBtn.disabled = false, 500);
});

evalBtn.addEventListener('click', () => {
    if (!worker || !currentDerivativeFunc) return;
    
    const x = parseFloat(evalXInput.value);
    
    worker.postMessage({
        command: 'evaluate',
        funcBody: currentDerivativeFunc,
        x
    });
});

initWorker();
