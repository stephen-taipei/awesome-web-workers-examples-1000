/**
 * #627 Map-Reduce Pattern
 */
const sampleText = "The quick brown fox jumps over the lazy dog. The dog was not amused. The fox ran away quickly. Dogs and foxes are animals. Animals live in nature.";
let workers = [], mapResults = [];

document.getElementById('sample-btn').addEventListener('click', () => {
    document.getElementById('text').value = sampleText.repeat(100);
});

document.getElementById('start-btn').addEventListener('click', start);

function start() {
    const text = document.getElementById('text').value || sampleText;
    const words = text.split(/\s+/);
    const workerCount = 4;
    const chunkSize = Math.ceil(words.length / workerCount);

    workers.forEach(w => w.terminate());
    workers = [];
    mapResults = [];

    const startTime = performance.now();
    document.getElementById('results').innerHTML = '<p>Processing...</p>';

    for (let i = 0; i < workerCount; i++) {
        const chunk = words.slice(i * chunkSize, (i + 1) * chunkSize);
        const worker = new Worker('worker.js');
        worker.onmessage = (e) => {
            mapResults.push(e.data);
            if (mapResults.length === workerCount) {
                const reduced = reduce(mapResults);
                const duration = performance.now() - startTime;
                showResults(reduced, duration, words.length);
            }
        };
        worker.postMessage({ words: chunk });
        workers.push(worker);
    }
}

function reduce(maps) {
    const final = {};
    maps.forEach(map => {
        Object.entries(map).forEach(([word, count]) => {
            final[word] = (final[word] || 0) + count;
        });
    });
    return final;
}

function showResults(wordCounts, duration, totalWords) {
    const sorted = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 20);
    document.getElementById('results').innerHTML = `
        <div class="result-stats">
            <div class="stat-item"><span class="stat-label">Total Words:</span><span class="stat-value">${totalWords}</span></div>
            <div class="stat-item"><span class="stat-label">Unique Words:</span><span class="stat-value">${Object.keys(wordCounts).length}</span></div>
            <div class="stat-item"><span class="stat-label">Time:</span><span class="stat-value">${duration.toFixed(2)} ms</span></div>
        </div>
        <h4 style="margin-top:15px;color:var(--primary-color);">Top 20 Words:</h4>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;">
            ${sorted.map(([word, count]) => `<span style="background:var(--bg-secondary);padding:5px 10px;border-radius:4px;">${word}: ${count}</span>`).join('')}
        </div>
    `;
}
