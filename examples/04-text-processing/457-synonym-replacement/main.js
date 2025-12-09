const synonymsMapInput = document.getElementById('synonymsMap');
const inputText = document.getElementById('inputText');
const caseSensitiveInput = document.getElementById('caseSensitive');
const outputText = document.getElementById('outputText');
const processBtn = document.getElementById('processBtn');
const resetBtn = document.getElementById('resetBtn');
const resultContainer = document.getElementById('resultContainer');
const processingTimeDisplay = document.getElementById('processingTime');
const replacementCountDisplay = document.getElementById('replacementCount');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, processedText, count, time, error } = e.data;

        if (type === 'result') {
            outputText.value = processedText;
            processingTimeDisplay.textContent = `${time.toFixed(2)}ms`;
            replacementCountDisplay.textContent = count;
            resultContainer.classList.remove('hidden');
            processBtn.disabled = false;
        } else if (type === 'error') {
            alert('Error: ' + error);
            processBtn.disabled = false;
        }
    };
}

initWorker();

processBtn.addEventListener('click', () => {
    const text = inputText.value;
    let synonyms = {};

    try {
        synonyms = JSON.parse(synonymsMapInput.value);
    } catch (e) {
        alert('Invalid JSON in Synonym Map');
        return;
    }

    if (!text) return;

    processBtn.disabled = true;

    worker.postMessage({
        text: text,
        synonyms: synonyms,
        caseSensitive: caseSensitiveInput.checked
    });
});

resetBtn.addEventListener('click', () => {
    inputText.value = '';
    outputText.value = '';
    resultContainer.classList.add('hidden');
});
