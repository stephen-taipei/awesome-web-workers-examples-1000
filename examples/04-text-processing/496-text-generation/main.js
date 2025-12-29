const inputArea = document.getElementById('inputArea');
const orderInput = document.getElementById('orderInput');
const lengthInput = document.getElementById('lengthInput');
const tempInput = document.getElementById('tempInput');
const tempValue = document.getElementById('tempValue');
const seedInput = document.getElementById('seedInput');
const presetSeeds = document.getElementById('presetSeeds');
const trainBtn = document.getElementById('trainBtn');
const generateBtn = document.getElementById('generateBtn');
const sampleBtn = document.getElementById('sampleBtn');
const clearBtn = document.getElementById('clearBtn');
const outputSection = document.getElementById('outputSection');
const generatedText = document.getElementById('generatedText');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const stateCount = document.getElementById('stateCount');
const transitionCount = document.getElementById('transitionCount');
const timeTaken = document.getElementById('timeTaken');

const sampleText = `Once upon a time in a land far away, there lived a wise old king. The king ruled his kingdom with justice and kindness. His people loved him dearly.

One day, a young traveler came to the kingdom seeking adventure. The traveler had heard tales of the wise king and wanted to learn from him. The king welcomed the traveler with open arms.

The king shared many stories with the young traveler. He spoke of battles won and lost, of friendships made and broken. The traveler listened carefully to every word.

As the days passed, the traveler learned much from the wise king. He learned about courage, honor, and the importance of treating others with respect. These lessons would stay with him forever.

When it was time to leave, the traveler thanked the king for his wisdom. The king smiled and said, "Go forth and share what you have learned with others." And so the traveler continued his journey, carrying the king's wisdom in his heart.`;

let worker;
let modelTrained = false;

tempInput.addEventListener('input', () => {
    tempValue.textContent = parseFloat(tempInput.value).toFixed(1);
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data.progress * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
        } else if (type === 'trained') {
            modelTrained = true;
            generateBtn.disabled = false;

            stateCount.textContent = data.stateCount.toLocaleString();
            transitionCount.textContent = data.transitionCount.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            // Show preset seeds
            displayPresetSeeds(data.sampleStates);

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            trainBtn.disabled = false;
        } else if (type === 'generated') {
            displayGeneratedText(data.text, data.seedUsed);
            generateBtn.disabled = false;
        }
    };
}

function displayPresetSeeds(states) {
    presetSeeds.innerHTML = '';
    states.slice(0, 8).forEach(state => {
        const btn = document.createElement('button');
        btn.className = 'seed-btn';
        btn.textContent = state;
        btn.onclick = () => {
            seedInput.value = state;
        };
        presetSeeds.appendChild(btn);
    });
}

function displayGeneratedText(text, seed) {
    outputSection.classList.remove('hidden');

    const words = text.split(' ');
    const seedWords = seed ? seed.split(' ').length : 0;

    let html = '';
    words.forEach((word, i) => {
        if (i < seedWords) {
            html += `<span class="seed-word">${word}</span> `;
        } else {
            html += `<span class="generated-word">${word}</span> `;
        }
    });

    generatedText.innerHTML = html;
}

trainBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    const order = parseInt(orderInput.value) || 2;

    trainBtn.disabled = true;
    generateBtn.disabled = true;
    modelTrained = false;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    outputSection.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'train',
        text: text,
        order: order
    });
});

generateBtn.addEventListener('click', () => {
    if (!modelTrained) return;

    const length = parseInt(lengthInput.value) || 50;
    const temperature = parseFloat(tempInput.value) || 1.0;
    const seed = seedInput.value.trim();

    generateBtn.disabled = true;

    worker.postMessage({
        type: 'generate',
        length: length,
        temperature: temperature,
        seed: seed
    });
});

sampleBtn.addEventListener('click', () => {
    inputArea.value = sampleText;
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    seedInput.value = '';
    presetSeeds.innerHTML = '';
    outputSection.classList.add('hidden');
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
    generateBtn.disabled = true;
    modelTrained = false;
});

initWorker();
