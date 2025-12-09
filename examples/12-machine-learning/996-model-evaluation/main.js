const calculateBtn = document.getElementById('calculateBtn');
const sampleSizeSelect = document.getElementById('sampleSize');
const tprInput = document.getElementById('truePositiveRate');
const fprInput = document.getElementById('falsePositiveRate');
const prevalenceInput = document.getElementById('prevalence');

const tprDisplay = document.getElementById('tprDisplay');
const fprDisplay = document.getElementById('fprDisplay');
const prevDisplay = document.getElementById('prevDisplay');

const timeValue = document.getElementById('timeValue');
const statusText = document.getElementById('statusText');

const accuracyVal = document.getElementById('accuracyVal');
const precisionVal = document.getElementById('precisionVal');
const recallVal = document.getElementById('recallVal');
const f1Val = document.getElementById('f1Val');
const mccVal = document.getElementById('mccVal');

const tpCount = document.getElementById('tpCount');
const fnCount = document.getElementById('fnCount');
const fpCount = document.getElementById('fpCount');
const tnCount = document.getElementById('tnCount');

let worker;

// Update slider displays
tprInput.addEventListener('input', () => tprDisplay.textContent = `${tprInput.value}%`);
fprInput.addEventListener('input', () => fprDisplay.textContent = `${fprInput.value}%`);
prevalenceInput.addEventListener('input', () => prevDisplay.textContent = `${prevalenceInput.value}%`);

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'status') {
            statusText.textContent = data;
        } else if (type === 'result') {
            statusText.textContent = 'Completed';
            timeValue.textContent = `${data.duration}ms`;

            accuracyVal.textContent = data.accuracy.toFixed(4);
            precisionVal.textContent = data.precision.toFixed(4);
            recallVal.textContent = data.recall.toFixed(4);
            f1Val.textContent = data.f1Score.toFixed(4);
            mccVal.textContent = data.mcc.toFixed(4);

            tpCount.textContent = data.tp;
            fnCount.textContent = data.fn;
            fpCount.textContent = data.fp;
            tnCount.textContent = data.tn;

            calculateBtn.disabled = false;
        }
    };
}

calculateBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const sampleSize = parseInt(sampleSizeSelect.value);
    const tpr = parseInt(tprInput.value) / 100;
    const fpr = parseInt(fprInput.value) / 100;
    const prevalence = parseInt(prevalenceInput.value) / 100;

    calculateBtn.disabled = true;
    statusText.textContent = 'Initializing...';
    timeValue.textContent = '-';

    // Clear metrics
    accuracyVal.textContent = '-';
    precisionVal.textContent = '-';
    recallVal.textContent = '-';
    f1Val.textContent = '-';
    mccVal.textContent = '-';
    tpCount.textContent = '-';
    fnCount.textContent = '-';
    fpCount.textContent = '-';
    tnCount.textContent = '-';

    worker.postMessage({
        command: 'evaluate',
        sampleSize,
        tpr, // True Positive Rate (Sensitivity)
        fpr, // False Positive Rate (1 - Specificity)
        prevalence // Proportion of positive class in the population
    });
});

// Initial worker setup
initWorker();
