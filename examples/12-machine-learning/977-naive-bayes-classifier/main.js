const trainBtn = document.getElementById('trainBtn');
const predictBtn = document.getElementById('predictBtn');
const trainingSizeSelect = document.getElementById('trainingSize');
const testInput = document.getElementById('testInput');
const trainTime = document.getElementById('trainTime');
const vocabSize = document.getElementById('vocabSize');
const predictionResult = document.getElementById('predictionResult');
const confidenceVal = document.getElementById('confidenceVal');
const spamWords = document.getElementById('spamWords');
const hamWords = document.getElementById('hamWords');

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'trained') {
            trainTime.textContent = `${data.duration}ms`;
            vocabSize.textContent = data.vocabSize;
            
            displayTopWords(data.topSpam, spamWords, 'spam');
            displayTopWords(data.topHam, hamWords, 'ham');
            
            predictBtn.disabled = false;
            trainBtn.disabled = false;
            trainBtn.textContent = 'Retrain';
        } else if (type === 'prediction') {
            predictionResult.textContent = data.label.toUpperCase();
            predictionResult.style.color = data.label === 'spam' ? '#d32f2f' : '#388e3c';
            confidenceVal.textContent = (data.probability * 100).toFixed(2) + '%';
        }
    };
}

function displayTopWords(words, container, type) {
    container.innerHTML = '';
    words.forEach(w => {
        const span = document.createElement('span');
        span.className = `tag ${type}`;
        span.textContent = `${w.word} (${w.score.toFixed(2)})`;
        container.appendChild(span);
    });
}

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();
    
    const size = parseInt(trainingSizeSelect.value);
    trainBtn.disabled = true;
    trainBtn.textContent = 'Training...';
    predictBtn.disabled = true;
    
    worker.postMessage({
        command: 'train',
        size
    });
});

predictBtn.addEventListener('click', () => {
    const text = testInput.value.trim();
    if (!text) return;
    
    worker.postMessage({
        command: 'predict',
        text
    });
});

initWorker();
