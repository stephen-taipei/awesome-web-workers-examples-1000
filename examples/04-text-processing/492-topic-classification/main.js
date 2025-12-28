const inputArea = document.getElementById('inputArea');
const classifyBtn = document.getElementById('classifyBtn');
const sampleBtn = document.getElementById('sampleBtn');
const clearBtn = document.getElementById('clearBtn');
const singleResult = document.getElementById('singleResult');
const batchResults = document.getElementById('batchResults');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const statsContainer = document.getElementById('statsContainer');
const classifiedCount = document.getElementById('classifiedCount');
const timeTaken = document.getElementById('timeTaken');

const topicColors = {
    'Technology': '#4a9eff',
    'Sports': '#28a745',
    'Politics': '#dc3545',
    'Entertainment': '#ffc107',
    'Science': '#17a2b8',
    'Business': '#6c757d',
    'Health': '#e83e8c'
};

const samples = [
    "Apple announced its new iPhone with advanced AI capabilities and improved camera technology.",
    "The Lakers defeated the Celtics in an overtime thriller, with LeBron scoring 40 points.",
    "The Senate passed a new bill aimed at reducing carbon emissions and promoting renewable energy.",
    "Marvel's new superhero movie broke box office records in its opening weekend.",
    "Scientists discovered a new exoplanet that could potentially support life.",
    "Stock markets reached all-time highs as tech companies reported strong earnings.",
    "New research suggests that regular exercise can significantly reduce the risk of heart disease."
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
            classifiedCount.textContent = data.count.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            classifyBtn.disabled = false;
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

    let html = '<div class="topic-result">';

    // Sort topics by score
    const sortedTopics = Object.entries(result.scores)
        .sort((a, b) => b[1] - a[1]);

    sortedTopics.forEach(([topic, score]) => {
        const color = topicColors[topic] || '#6c757d';
        const percent = Math.round(score * 100);
        const keywords = result.matchedKeywords[topic] || [];

        html += `
            <div class="topic-bar">
                <span class="topic-name" style="color: ${color}">${topic}</span>
                <div class="topic-bar-wrapper">
                    <div class="topic-bar-fill" style="width: ${percent}%; background: ${color}"></div>
                </div>
                <span class="topic-score">${percent}%</span>
            </div>
        `;

        if (keywords.length > 0) {
            html += `<div class="topic-keywords">`;
            keywords.forEach(kw => {
                html += `<span class="keyword-tag" style="border-left: 3px solid ${color}">${kw}</span>`;
            });
            html += `</div>`;
        }
    });

    html += '</div>';
    singleResult.innerHTML = html;
}

function displayBatchResults(results) {
    singleResult.classList.add('hidden');
    batchResults.classList.remove('hidden');
    batchResults.innerHTML = '';

    results.forEach((result, index) => {
        const item = document.createElement('div');
        item.className = 'batch-item';

        const sortedTopics = Object.entries(result.scores)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3);

        let topicsHtml = '';
        sortedTopics.forEach(([topic, score]) => {
            const color = topicColors[topic] || '#6c757d';
            const percent = Math.round(score * 100);
            topicsHtml += `
                <span class="batch-topic-tag" style="background: ${color}; color: white;">
                    ${topic}: ${percent}%
                </span>
            `;
        });

        item.innerHTML = `
            <div class="batch-text">${result.text.substring(0, 150)}${result.text.length > 150 ? '...' : ''}</div>
            <div class="batch-topics">${topicsHtml}</div>
        `;

        batchResults.appendChild(item);
    });
}

classifyBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    const lines = text.split('\n').filter(l => l.trim());

    classifyBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    singleResult.classList.add('hidden');
    batchResults.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'classify',
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
