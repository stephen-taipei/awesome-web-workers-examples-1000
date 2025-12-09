const sourceText = document.getElementById('sourceText');
const processBtn = document.getElementById('processBtn');
const loadSampleBtn = document.getElementById('loadSampleBtn');
const processTimeDisplay = document.getElementById('processTime');
const origSizeDisplay = document.getElementById('origSize');
const compSizeDisplay = document.getElementById('compSize');
const ratioDisplay = document.getElementById('ratio');
const resultText = document.getElementById('resultText');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data, executionTime } = e.data;

        if (type === 'result') {
            processTimeDisplay.textContent = `${executionTime}ms`;

            origSizeDisplay.textContent = `${data.originalSize} B`;
            compSizeDisplay.textContent = `${data.compressedSize} B`; // Size of base64 string ~ roughly
            ratioDisplay.textContent = `${data.ratio}%`;

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
    origSizeDisplay.textContent = '...';
    compSizeDisplay.textContent = '...';
    ratioDisplay.textContent = '...';
    resultText.value = 'Compressing...';

    worker.postMessage({
        text: sourceText.value
    });
});

loadSampleBtn.addEventListener('click', () => {
    // Generate repetitive text which compresses well
    let text = "";
    const phrase = "This is a repetitive phrase that compresses very well. ";
    for(let i=0; i<500; i++) {
        text += phrase;
        if (i % 10 === 0) text += "\n";
    }
    sourceText.value = text;
});

// Init
initWorker();
