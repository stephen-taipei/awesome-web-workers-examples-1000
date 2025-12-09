const trainBtn = document.getElementById('trainBtn');
const usersCountSelect = document.getElementById('usersCount');
const itemsCountInput = document.getElementById('itemsCount');
const sparsityInput = document.getElementById('sparsity');
const sparsityDisplay = document.getElementById('sparsityDisplay');
const targetItemSelect = document.getElementById('targetItem');
const similarItemsList = document.getElementById('similarItemsList');

const matrixSizeEl = document.getElementById('matrixSize');
const timeValueEl = document.getElementById('timeValue');
const statusTextEl = document.getElementById('statusText');

let worker;
let similarityMatrix = null;
let itemNames = [];

sparsityInput.addEventListener('input', () => {
    sparsityDisplay.textContent = `${sparsityInput.value}%`;
});

function initWorker() {
    if (worker) worker.terminate();
    worker = new Worker('worker.js');

    worker.onmessage = function(e) {
        const { type, data } = e.data;

        if (type === 'status') {
            statusTextEl.textContent = data;
        } else if (type === 'result') {
            statusTextEl.textContent = 'Training Completed';
            timeValueEl.textContent = `${data.duration}ms`;
            matrixSizeEl.textContent = `${data.users} Users x ${data.items} Items`;
            
            similarityMatrix = data.matrix;
            itemNames = data.itemNames;

            // Populate select dropdown
            targetItemSelect.innerHTML = '';
            itemNames.forEach((name, idx) => {
                const option = document.createElement('option');
                option.value = idx;
                option.textContent = name;
                targetItemSelect.appendChild(option);
            });
            targetItemSelect.disabled = false;
            targetItemSelect.value = 0;
            updateRecommendations(0);

            trainBtn.disabled = false;
        }
    };
}

trainBtn.addEventListener('click', () => {
    if (!worker) initWorker();

    const users = parseInt(usersCountSelect.value);
    const items = parseInt(itemsCountInput.value);
    const sparsity = parseInt(sparsityInput.value) / 100;

    trainBtn.disabled = true;
    targetItemSelect.disabled = true;
    statusTextEl.textContent = 'Initializing...';
    timeValueEl.textContent = '-';
    matrixSizeEl.textContent = '-';
    similarItemsList.innerHTML = '<li>Training model...</li>';

    worker.postMessage({
        command: 'train',
        users,
        items,
        sparsity
    });
});

targetItemSelect.addEventListener('change', (e) => {
    const itemIdx = parseInt(e.target.value);
    updateRecommendations(itemIdx);
});

function updateRecommendations(itemIdx) {
    if (!similarityMatrix) return;

    // The matrix is flattened: row * items + col
    // But wait, similarity matrix is Items x Items.
    // Dimensions: items * items.
    // Let's get the row for this itemIdx.
    
    const itemsCount = itemNames.length;
    const scores = [];

    for (let i = 0; i < itemsCount; i++) {
        if (i === itemIdx) continue; // Skip self
        const score = similarityMatrix[itemIdx * itemsCount + i];
        scores.push({ idx: i, score: score });
    }

    // Sort by score descending
    scores.sort((a, b) => b.score - a.score);

    // Top 5
    const top5 = scores.slice(0, 5);

    similarItemsList.innerHTML = '';
    top5.forEach(item => {
        const li = document.createElement('li');
        li.textContent = `${itemNames[item.idx]} (Similarity: ${item.score.toFixed(4)})`;
        similarItemsList.appendChild(li);
    });

    if (top5.length === 0) {
         similarItemsList.innerHTML = '<li>No similar items found (too sparse?).</li>';
    }
}

initWorker();
