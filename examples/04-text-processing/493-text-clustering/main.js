const inputArea = document.getElementById('inputArea');
const kInput = document.getElementById('kInput');
const iterInput = document.getElementById('iterInput');
const clusterBtn = document.getElementById('clusterBtn');
const sampleBtn = document.getElementById('sampleBtn');
const clearBtn = document.getElementById('clearBtn');
const clusterContainer = document.getElementById('clusterContainer');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const statsContainer = document.getElementById('statsContainer');
const docCount = document.getElementById('docCount');
const clusterCount = document.getElementById('clusterCount');
const iterations = document.getElementById('iterations');
const timeTaken = document.getElementById('timeTaken');

const clusterColors = [
    '#4a9eff', '#28a745', '#dc3545', '#ffc107', '#17a2b8',
    '#e83e8c', '#6f42c1', '#fd7e14', '#20c997', '#6c757d'
];

const samples = [
    // Technology cluster
    "The new smartphone features an advanced processor and improved camera system.",
    "Software developers are adopting AI tools to improve code quality.",
    "Cloud computing services continue to grow in enterprise adoption.",
    "The latest laptop offers exceptional battery life and performance.",
    "Cybersecurity threats are becoming increasingly sophisticated.",
    // Sports cluster
    "The basketball team won the championship after an exciting overtime game.",
    "The tennis player secured her third Grand Slam title this year.",
    "Football fans filled the stadium for the derby match.",
    "The Olympic athlete broke the world record in the 100m sprint.",
    "The soccer team signed a new striker for the upcoming season.",
    // Food cluster
    "The restaurant serves authentic Italian pasta with fresh ingredients.",
    "Home cooking has become popular with new recipe sharing apps.",
    "The bakery offers artisan bread made with organic flour.",
    "Coffee lovers appreciate the smooth flavor of arabica beans.",
    "The food market features local produce and specialty items."
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
            progressText.textContent = data.message || 'Clustering...';
        } else if (type === 'result') {
            displayClusters(data.clusters);
            docCount.textContent = data.docCount.toLocaleString();
            clusterCount.textContent = data.k.toLocaleString();
            iterations.textContent = data.iterations.toLocaleString();
            timeTaken.textContent = `${data.time.toFixed(2)} ms`;

            progressContainer.classList.add('hidden');
            statsContainer.classList.remove('hidden');
            clusterBtn.disabled = false;
        }
    };
}

function displayClusters(clusters) {
    clusterContainer.innerHTML = '';

    clusters.forEach((cluster, index) => {
        const color = clusterColors[index % clusterColors.length];

        const card = document.createElement('div');
        card.className = 'cluster-card';
        card.style.borderLeftColor = color;

        let keywordsHtml = '';
        cluster.keywords.forEach(kw => {
            keywordsHtml += `<span class="keyword-tag">${kw}</span>`;
        });

        let itemsHtml = '';
        cluster.documents.forEach(doc => {
            const truncated = doc.length > 80 ? doc.substring(0, 80) + '...' : doc;
            itemsHtml += `<div class="cluster-item">${truncated}</div>`;
        });

        card.innerHTML = `
            <div class="cluster-header">
                <span class="cluster-title" style="color: ${color}">Cluster ${index + 1}</span>
                <span class="cluster-count">${cluster.documents.length} docs</span>
            </div>
            <div class="cluster-keywords">
                <strong style="font-size: 0.85rem; color: var(--text-muted);">Top Keywords:</strong><br>
                ${keywordsHtml}
            </div>
            <div class="cluster-items">${itemsHtml}</div>
        `;

        clusterContainer.appendChild(card);
    });
}

clusterBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    const lines = text.split('\n').filter(l => l.trim());
    const k = parseInt(kInput.value) || 3;
    const maxIter = parseInt(iterInput.value) || 50;

    if (lines.length < k) {
        alert(`Need at least ${k} documents for ${k} clusters`);
        return;
    }

    clusterBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    statsContainer.classList.add('hidden');
    clusterContainer.innerHTML = '';
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'cluster',
        texts: lines,
        k: k,
        maxIterations: maxIter
    });
});

sampleBtn.addEventListener('click', () => {
    inputArea.value = samples.join('\n');
    kInput.value = 3;
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    clusterContainer.innerHTML = '';
    statsContainer.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
