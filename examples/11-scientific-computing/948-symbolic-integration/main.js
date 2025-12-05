const integrateBtn = document.getElementById('integrateBtn');
const evalBtn = document.getElementById('evalBtn');
const expressionInput = document.getElementById('expression');
const limitA = document.getElementById('limitA');
const limitB = document.getElementById('limitB');

const antiderivativeEl = document.getElementById('antiderivative');
const definiteValEl = document.getElementById('definiteVal');
const evalOutput = document.getElementById('evalOutput');
const statusText = document.getElementById('statusText');
const calcTime = document.getElementById('calcTime');

let worker;
let currentResult = null; // Store parsed function for eval

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'result') {
            statusText.textContent = 'Completed';
            calcTime.textContent = `${data.duration}ms`;
            antiderivativeEl.textContent = data.integral + ' + C';
            currentResult = data.jsFunction; // The JS code of the integral
            evalBtn.disabled = false;
            evalOutput.classList.add('hidden');
        } else if (type === 'evalResult') {
            statusText.textContent = 'Evaluated';
            definiteValEl.textContent = data.value.toFixed(6);
            evalOutput.classList.remove('hidden');
        } else if (type === 'error') {
            statusText.textContent = `Error: ${data}`;
            statusText.style.color = 'red';
        }
    };
}

integrateBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const expr = expressionInput.value;
    
    integrateBtn.disabled = true;
    evalBtn.disabled = true;
    statusText.textContent = 'Integrating...';
    statusText.style.color = '#4a148c';
    calcTime.textContent = '-';
    antiderivativeEl.textContent = '...';
    
    worker.postMessage({
        command: 'integrate',
        expression: expr
    });
    
    setTimeout(() => integrateBtn.disabled = false, 500);
});

evalBtn.addEventListener('click', () => {
    if (!worker || !currentResult) return;
    
    const a = parseFloat(limitA.value);
    const b = parseFloat(limitB.value);
    
    worker.postMessage({
        command: 'evaluate',
        funcBody: currentResult,
        a, b
    });
});

initWorker();
