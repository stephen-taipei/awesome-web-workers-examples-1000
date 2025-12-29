const inputArea = document.getElementById('inputArea');
const windowInput = document.getElementById('windowInput');
const minFreqInput = document.getElementById('minFreqInput');
const topWordsInput = document.getElementById('topWordsInput');
const analyzeBtn = document.getElementById('analyzeBtn');
const sampleBtn = document.getElementById('sampleBtn');
const clearBtn = document.getElementById('clearBtn');
const topPairsContainer = document.getElementById('topPairsContainer');
const topPairs = document.getElementById('topPairs');
const matrixContainer = document.getElementById('matrixContainer');
const matrixTable = document.getElementById('matrixTable');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const wordCount = document.getElementById('wordCount');
const pairCount = document.getElementById('pairCount');
const timeTaken = document.getElementById('timeTaken');

const sampleText = `Machine learning is a subset of artificial intelligence that enables computers to learn from data.
Deep learning is a type of machine learning that uses neural networks with many layers.
Neural networks are inspired by the human brain and can recognize patterns in data.
Artificial intelligence and machine learning are transforming many industries today.
Data science combines statistics, programming, and domain knowledge to extract insights from data.
Machine learning algorithms can learn from training data and make predictions on new data.
Deep learning has achieved remarkable success in computer vision and natural language processing.
Natural language processing enables computers to understand and generate human language.
Computer vision allows machines to interpret and analyze visual information from images.
The field of artificial intelligence continues to advance with new research and applications.`;

let worker;

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = (e) => {
        const { type, data } = e.data;

        if (type === 'progress') {
            const percent = Math.round(data.progress * 100);
            progressBar.style.width = `${percent}%`;
            progressBar.textContent = `${percent}%`;
        } else if (type === 'result') {
            displayResults(data);
            wordCount.textContent = data.uniqueWords.toLocaleString();
            pairCount.textContent = data.totalPairs.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            analyzeBtn.disabled = false;
        }
    };
}

function displayResults(data) {
    // Display top pairs
    topPairsContainer.classList.remove('hidden');
    topPairs.innerHTML = '';

    data.topPairs.slice(0, 20).forEach(pair => {
        const item = document.createElement('div');
        item.className = 'pair-item';
        item.innerHTML = `
            <span class="pair-words">${pair.word1} + ${pair.word2}</span>
            <span class="pair-count">${pair.count}</span>
        `;
        topPairs.appendChild(item);
    });

    // Display matrix
    matrixContainer.classList.remove('hidden');
    const words = data.words;
    const matrix = data.matrix;
    const maxCount = data.maxCount || 1;

    let tableHtml = '<thead><tr><th></th>';
    words.forEach(word => {
        tableHtml += `<th>${word}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';

    words.forEach((word1, i) => {
        tableHtml += `<tr><td>${word1}</td>`;
        words.forEach((word2, j) => {
            const count = matrix[i][j];
            const intensity = count / maxCount;
            const bgColor = count > 0
                ? `rgba(74, 158, 255, ${0.2 + intensity * 0.8})`
                : 'transparent';

            tableHtml += `<td style="background: ${bgColor}">
                <span class="cell-value">${count > 0 ? count : '-'}</span>
            </td>`;
        });
        tableHtml += '</tr>';
    });

    tableHtml += '</tbody>';
    matrixTable.innerHTML = tableHtml;
}

analyzeBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    const windowSize = parseInt(windowInput.value) || 5;
    const minFreq = parseInt(minFreqInput.value) || 2;
    const topWords = parseInt(topWordsInput.value) || 15;

    analyzeBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    topPairsContainer.classList.add('hidden');
    matrixContainer.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'analyze',
        text: text,
        windowSize: windowSize,
        minFreq: minFreq,
        topWords: topWords
    });
});

sampleBtn.addEventListener('click', () => {
    inputArea.value = sampleText;
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    topPairsContainer.classList.add('hidden');
    matrixContainer.classList.add('hidden');
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
