const sourceText = document.getElementById('sourceText');
const processBtn = document.getElementById('processBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const processTimeDisplay = document.getElementById('processTime');
const charCountDisplay = document.getElementById('charCount');
const resultText = document.getElementById('resultText');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime } = e.data;

        if (type === 'result') {
            processTimeDisplay.textContent = `${executionTime}ms`;
            charCountDisplay.textContent = data.result.length;
            resultText.value = data.result;
            processBtn.disabled = false;
        } else if (type === 'error') {
            alert(`Error: ${data}`);
            processBtn.disabled = false;
        }
    };
}

processBtn.addEventListener('click', () => {
    initWorker();

    processBtn.disabled = true;
    processTimeDisplay.textContent = '...';
    charCountDisplay.textContent = '...';
    resultText.value = 'Converting...';

    worker.postMessage({
        rtf: sourceText.value
    });
});

loadSampleBtn.addEventListener('click', () => {
    sourceText.value = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;\\red255\\green0\\blue0;}
\\pard\\cf1\\b Hello World!\\b0\\par
This is a \\i simple \\i0 RTF document.\\par
\\cf2 Red Text.\\par
}`;
});

// Init
initWorker();
