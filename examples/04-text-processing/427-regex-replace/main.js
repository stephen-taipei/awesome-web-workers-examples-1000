const sourceText = document.getElementById('sourceText');
const regexPattern = document.getElementById('regexPattern');
const replacement = document.getElementById('replacement');
const flags = document.getElementById('flags');
const processBtn = document.getElementById('processBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const processTimeDisplay = document.getElementById('processTime');
const matchCountDisplay = document.getElementById('matchCount');
const resultText = document.getElementById('resultText');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime } = e.data;

        if (type === 'result') {
            processTimeDisplay.textContent = `${executionTime}ms`;
            matchCountDisplay.textContent = data.count;
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
    matchCountDisplay.textContent = '...';
    resultText.value = 'Processing...';

    worker.postMessage({
        text: sourceText.value,
        pattern: regexPattern.value,
        replacement: replacement.value,
        flags: flags.value
    });
});

loadSampleBtn.addEventListener('click', () => {
    // Generate a larger sample text
    let text = "Email list:\n";
    for(let i=0; i<100; i++) {
        text += `User${i}: user${i}@example.com, Phone: 555-01${String(i).padStart(2, '0')}\n`;
    }
    sourceText.value = text;
    regexPattern.value = "([a-zA-Z0-9._-]+)@([a-zA-Z0-9._-]+\\.[a-zA-Z0-9_-]+)";
    replacement.value = "<$1 AT $2>";
    flags.value = "g";
});

// Init
initWorker();
