const inputArea = document.getElementById('inputArea');
const dimInput = document.getElementById('dimInput');
const windowInput = document.getElementById('windowInput');
const minCountInput = document.getElementById('minCountInput');
const trainBtn = document.getElementById('trainBtn');
const sampleBtn = document.getElementById('sampleBtn');
const clearBtn = document.getElementById('clearBtn');
const searchSection = document.getElementById('searchSection');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const similarWords = document.getElementById('similarWords');
const vectorDisplay = document.getElementById('vectorDisplay');
const vocabSection = document.getElementById('vocabSection');
const vocabList = document.getElementById('vocabList');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const statsContainer = document.getElementById('statsContainer');
const vocabSize = document.getElementById('vocabSize');
const dimensions = document.getElementById('dimensions');
const timeTaken = document.getElementById('timeTaken');

const sampleText = `The king rules the kingdom with wisdom and power.
The queen sits beside the king on the royal throne.
A prince is the son of the king and queen.
The princess is the daughter of the royal family.
The man works hard to provide for his family.
The woman cares for her children with love.
A boy grows up to become a man someday.
The girl dreams of becoming a princess.
Dogs are loyal companions to humans.
Cats are independent but loving pets.
A puppy is a young dog full of energy.
Kittens are playful young cats.
The sun rises in the east every morning.
The moon shines bright at night.
Stars twinkle in the dark sky.
Rain falls from clouds in the sky.
Trees grow tall in the forest.
Flowers bloom in the spring garden.
Birds sing beautiful songs at dawn.
Fish swim in rivers and oceans.`;

let worker;
let wordVectors = null;
let vocabulary = [];

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data.progress * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
            if (data.message) progressText.textContent = data.message;
        } else if (type === 'trained') {
            wordVectors = data.vectors;
            vocabulary = data.vocabulary;

            displayVocabulary(vocabulary);
            vocabSize.textContent = vocabulary.length.toLocaleString();
            dimensions.textContent = data.dimensions.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            searchSection.classList.remove('hidden');
            vocabSection.classList.remove('hidden');
            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            trainBtn.disabled = false;
        } else if (type === 'similar') {
            displaySimilarWords(data.results, data.word, data.vector);
        }
    };
}

function displayVocabulary(vocab) {
    vocabList.innerHTML = '';
    vocab.forEach(word => {
        const span = document.createElement('span');
        span.className = 'vocab-word';
        span.textContent = word;
        span.onclick = () => {
            searchInput.value = word;
            searchBtn.click();
        };
        vocabList.appendChild(span);
    });
}

function displaySimilarWords(results, word, vector) {
    similarWords.innerHTML = '';

    if (results.length === 0) {
        similarWords.innerHTML = '<p style="color: var(--text-muted);">Word not found in vocabulary</p>';
        vectorDisplay.classList.add('hidden');
        return;
    }

    results.forEach(result => {
        const div = document.createElement('div');
        div.className = 'similar-word';
        div.innerHTML = `
            <span class="similar-word-text">${result.word}</span>
            <span class="similar-word-score">${(result.similarity * 100).toFixed(1)}%</span>
        `;
        div.onclick = () => {
            searchInput.value = result.word;
            searchBtn.click();
        };
        similarWords.appendChild(div);
    });

    // Display vector
    vectorDisplay.classList.remove('hidden');
    const vectorStr = vector.slice(0, 10).map(v => v.toFixed(4)).join(', ');
    vectorDisplay.innerHTML = `<strong>${word}</strong> vector: [${vectorStr}, ...]`;
}

trainBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    const dim = parseInt(dimInput.value) || 50;
    const windowSize = parseInt(windowInput.value) || 3;
    const minCount = parseInt(minCountInput.value) || 2;

    trainBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    searchSection.classList.add('hidden');
    vocabSection.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'train',
        text: text,
        dimensions: dim,
        windowSize: windowSize,
        minCount: minCount
    });
});

searchBtn.addEventListener('click', () => {
    const word = searchInput.value.trim().toLowerCase();
    if (!word || !worker) return;

    worker.postMessage({
        type: 'findSimilar',
        word: word,
        topK: 10
    });
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchBtn.click();
});

sampleBtn.addEventListener('click', () => {
    inputArea.value = sampleText;
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    searchSection.classList.add('hidden');
    vocabSection.classList.add('hidden');
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
    wordVectors = null;
    vocabulary = [];
});

initWorker();
