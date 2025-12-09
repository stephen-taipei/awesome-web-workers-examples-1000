const inputText = document.getElementById('inputText');
const analyzeBtn = document.getElementById('analyzeBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsDiv = document.getElementById('results');
const sentCount = document.getElementById('sentCount');
const wordCount = document.getElementById('wordCount');
const syllCount = document.getElementById('syllCount');
const timeStats = document.getElementById('timeStats');

const worker = new Worker('worker.js');

analyzeBtn.addEventListener('click', () => {
    const text = inputText.value.trim();
    if (!text) return;

    analyzeBtn.disabled = true;
    analyzeBtn.textContent = 'Analyzing...';

    const start = performance.now();

    worker.postMessage({ text });

    worker.onmessage = (e) => {
        const end = performance.now();
        const { scores, counts } = e.data;

        renderScores(scores);

        sentCount.textContent = counts.sentences;
        wordCount.textContent = counts.words;
        syllCount.textContent = counts.syllables;
        timeStats.textContent = `${(end - start).toFixed(2)}ms`;

        analyzeBtn.disabled = false;
        analyzeBtn.textContent = 'Calculate Scores';
    };
});

clearBtn.addEventListener('click', () => {
    inputText.value = '';
    resultsDiv.innerHTML = '<div style="text-align:center; color: #64748b; grid-column: 1/-1;">Click Calculate to see results</div>';
    sentCount.textContent = '-';
    wordCount.textContent = '-';
    syllCount.textContent = '-';
    timeStats.textContent = '-';
});

function renderScores(scores) {
    let html = '';

    // Helper for coloring grade levels
    const getColor = (grade) => {
        if (grade <= 6) return '#4ade80'; // Green (Easy)
        if (grade <= 12) return '#facc15'; // Yellow (Standard)
        return '#f87171'; // Red (Difficult)
    };

    scores.forEach(item => {
        html += `
            <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid rgba(56, 189, 248, 0.2); padding: 1rem; border-radius: 8px;">
                <h3 style="color: #94a3b8; font-size: 0.9rem; margin-bottom: 0.5rem; text-transform: uppercase;">${item.name}</h3>
                <div style="font-size: 1.8rem; font-weight: bold; color: ${getColor(item.value)};">
                    ${item.value.toFixed(1)}
                </div>
                <div style="font-size: 0.85rem; color: #64748b; margin-top: 0.2rem;">${item.description}</div>
            </div>
        `;
    });

    // Add grid styling dynamically if not in css
    resultsDiv.style.display = 'grid';
    resultsDiv.style.gridTemplateColumns = 'repeat(auto-fit, minmax(200px, 1fr))';
    resultsDiv.style.gap = '1rem';

    resultsDiv.innerHTML = html;
}

inputText.value = `The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet. Readability formulas attempt to quantify how difficult a text is to read.`;
