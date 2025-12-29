const inputArea = document.getElementById('inputArea');
const analyzeBtn = document.getElementById('analyzeBtn');
const sampleBtn = document.getElementById('sampleBtn');
const clearBtn = document.getElementById('clearBtn');
const singleResult = document.getElementById('singleResult');
const sentimentEmoji = document.getElementById('sentimentEmoji');
const sentimentLabel = document.getElementById('sentimentLabel');
const sentimentScore = document.getElementById('sentimentScore');
const sentimentMarker = document.getElementById('sentimentMarker');
const wordAnalysis = document.getElementById('wordAnalysis');
const batchResults = document.getElementById('batchResults');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const analyzedCount = document.getElementById('analyzedCount');
const avgSentiment = document.getElementById('avgSentiment');
const timeTaken = document.getElementById('timeTaken');

const samples = [
    "I absolutely love this product! It exceeded all my expectations.",
    "This is the worst experience I've ever had. Terrible service.",
    "The movie was okay, nothing special but not bad either.",
    "Amazing quality and fast shipping! Highly recommend!",
    "I'm so disappointed. The product broke after one day.",
    "Pretty good overall, though there's room for improvement.",
    "Fantastic! Best purchase I've made this year!",
    "Never buying from here again. Complete waste of money.",
    "It works as expected. Does what it's supposed to do.",
    "Incredible experience! The staff was so helpful and friendly."
];

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
            displayResults(data.results);
            analyzedCount.textContent = data.count.toLocaleString();
            avgSentiment.textContent = data.avgScore.toFixed(3);
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            analyzeBtn.disabled = false;
        }
    };
}

function displayResults(results) {
    if (results.length === 1) {
        displaySingleResult(results[0]);
    } else {
        displayBatchResults(results);
    }
}

function displaySingleResult(result) {
    singleResult.classList.remove('hidden');
    batchResults.classList.add('hidden');

    const score = result.score;
    let emoji, label, color;

    if (score >= 0.5) {
        emoji = '😄'; label = 'Very Positive'; color = 'var(--success-color)';
    } else if (score >= 0.1) {
        emoji = '🙂'; label = 'Positive'; color = 'var(--success-color)';
    } else if (score <= -0.5) {
        emoji = '😠'; label = 'Very Negative'; color = 'var(--danger-color)';
    } else if (score <= -0.1) {
        emoji = '😕'; label = 'Negative'; color = 'var(--danger-color)';
    } else {
        emoji = '😐'; label = 'Neutral'; color = 'var(--warning-color)';
    }

    sentimentEmoji.textContent = emoji;
    sentimentLabel.textContent = label;
    sentimentLabel.style.color = color;
    sentimentScore.textContent = `Score: ${score.toFixed(3)}`;

    const markerPos = ((score + 1) / 2) * 100;
    sentimentMarker.style.left = `${markerPos}%`;

    wordAnalysis.innerHTML = '';
    result.words.forEach(w => {
        const tag = document.createElement('span');
        tag.className = `word-tag word-${w.type}`;
        tag.textContent = `${w.word} (${w.score > 0 ? '+' : ''}${w.score.toFixed(2)})`;
        wordAnalysis.appendChild(tag);
    });
}

function displayBatchResults(results) {
    singleResult.classList.add('hidden');
    batchResults.classList.remove('hidden');
    batchResults.innerHTML = '';

    results.forEach((result, index) => {
        const score = result.score;
        let emoji, color;

        if (score >= 0.3) { emoji = '😄'; color = 'var(--success-color)'; }
        else if (score >= 0.1) { emoji = '🙂'; color = 'var(--success-color)'; }
        else if (score <= -0.3) { emoji = '😠'; color = 'var(--danger-color)'; }
        else if (score <= -0.1) { emoji = '😕'; color = 'var(--danger-color)'; }
        else { emoji = '😐'; color = 'var(--warning-color)'; }

        const item = document.createElement('div');
        item.className = 'batch-item';
        item.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="flex: 1;">${result.text.substring(0, 100)}${result.text.length > 100 ? '...' : ''}</span>
                <span style="font-size: 1.5rem; margin: 0 15px;">${emoji}</span>
                <span style="font-family: var(--font-mono); color: ${color}; min-width: 80px; text-align: right;">
                    ${score.toFixed(3)}
                </span>
            </div>
        `;
        batchResults.appendChild(item);
    });
}

analyzeBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    const lines = text.split('\n').filter(l => l.trim());

    analyzeBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    singleResult.classList.add('hidden');
    batchResults.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'analyze',
        texts: lines
    });
});

sampleBtn.addEventListener('click', () => {
    inputArea.value = samples.join('\n');
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    singleResult.classList.add('hidden');
    batchResults.classList.add('hidden');
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
