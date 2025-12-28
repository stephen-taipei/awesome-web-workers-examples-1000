const inputArea = document.getElementById('inputArea');
const analyzeBtn = document.getElementById('analyzeBtn');
const sampleEasyBtn = document.getElementById('sampleEasyBtn');
const sampleHardBtn = document.getElementById('sampleHardBtn');
const clearBtn = document.getElementById('clearBtn');
const resultsSection = document.getElementById('resultsSection');
const scoreValue = document.getElementById('scoreValue');
const gradeLevel = document.getElementById('gradeLevel');
const difficultyFill = document.getElementById('difficultyFill');
const wordCount = document.getElementById('wordCount');
const sentenceCount = document.getElementById('sentenceCount');
const syllableCount = document.getElementById('syllableCount');
const avgWordsPerSentence = document.getElementById('avgWordsPerSentence');
const avgSyllablesPerWord = document.getElementById('avgSyllablesPerWord');
const complexWords = document.getElementById('complexWords');
const scoresTable = document.getElementById('scoresTable');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');

const easySample = `The cat sat on the mat. It was a big, fat cat. The cat liked to nap. The sun was warm. The cat was happy. It purred and purred. The mat was soft. The cat loved its mat. Every day, the cat would sit and nap. It was a good life for a cat.`;

const hardSample = `The epistemological implications of quantum mechanical phenomena necessitate a fundamental reconsideration of classical deterministic paradigms. The superposition principle, which postulates that particles simultaneously exist in multiple states until observation collapses the wave function, challenges conventional ontological assumptions regarding the nature of physical reality. Furthermore, the phenomenon of quantum entanglement demonstrates non-local correlations that transcend spatiotemporal constraints, thereby undermining traditional conceptions of causality and locality within theoretical physics.`;

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
            progressContainer.classList.add('hidden');
            analyzeBtn.disabled = false;
        }
    };
}

function displayResults(data) {
    resultsSection.classList.remove('hidden');

    // Main score
    const flesch = data.scores.fleschReadingEase;
    scoreValue.textContent = flesch.toFixed(1);

    // Color based on score
    let color, levelText;
    if (flesch >= 90) { color = '#28a745'; levelText = 'Very Easy - 5th Grade'; }
    else if (flesch >= 80) { color = '#28a745'; levelText = 'Easy - 6th Grade'; }
    else if (flesch >= 70) { color = '#20c997'; levelText = 'Fairly Easy - 7th Grade'; }
    else if (flesch >= 60) { color = '#17a2b8'; levelText = 'Standard - 8th-9th Grade'; }
    else if (flesch >= 50) { color = '#ffc107'; levelText = 'Fairly Difficult - 10th-12th Grade'; }
    else if (flesch >= 30) { color = '#fd7e14'; levelText = 'Difficult - College'; }
    else { color = '#dc3545'; levelText = 'Very Difficult - College Graduate'; }

    scoreValue.style.color = color;
    gradeLevel.textContent = levelText;
    gradeLevel.style.color = color;

    // Difficulty bar
    difficultyFill.style.width = `${Math.max(0, Math.min(100, flesch))}%`;
    difficultyFill.style.background = `linear-gradient(90deg, #dc3545, #ffc107, #28a745)`;

    // Metrics
    wordCount.textContent = data.metrics.words.toLocaleString();
    sentenceCount.textContent = data.metrics.sentences.toLocaleString();
    syllableCount.textContent = data.metrics.syllables.toLocaleString();
    avgWordsPerSentence.textContent = data.metrics.avgWordsPerSentence.toFixed(1);
    avgSyllablesPerWord.textContent = data.metrics.avgSyllablesPerWord.toFixed(2);
    complexWords.textContent = data.metrics.complexWords.toLocaleString();

    // Scores table
    const scores = [
        { name: 'Flesch Reading Ease', value: data.scores.fleschReadingEase.toFixed(1), interpret: getFleschInterpret(data.scores.fleschReadingEase) },
        { name: 'Flesch-Kincaid Grade', value: data.scores.fleschKincaidGrade.toFixed(1), interpret: `Grade ${Math.round(data.scores.fleschKincaidGrade)}` },
        { name: 'Gunning Fog Index', value: data.scores.gunningFog.toFixed(1), interpret: `Grade ${Math.round(data.scores.gunningFog)}` },
        { name: 'SMOG Index', value: data.scores.smog.toFixed(1), interpret: `Grade ${Math.round(data.scores.smog)}` },
        { name: 'Coleman-Liau Index', value: data.scores.colemanLiau.toFixed(1), interpret: `Grade ${Math.round(data.scores.colemanLiau)}` },
        { name: 'Automated Readability Index', value: data.scores.ari.toFixed(1), interpret: `Grade ${Math.round(data.scores.ari)}` }
    ];

    scoresTable.innerHTML = scores.map(s => `
        <tr>
            <td>${s.name}</td>
            <td style="font-family: var(--font-mono); color: var(--primary-color);">${s.value}</td>
            <td>${s.interpret}</td>
        </tr>
    `).join('');
}

function getFleschInterpret(score) {
    if (score >= 90) return 'Very Easy';
    if (score >= 80) return 'Easy';
    if (score >= 70) return 'Fairly Easy';
    if (score >= 60) return 'Standard';
    if (score >= 50) return 'Fairly Difficult';
    if (score >= 30) return 'Difficult';
    return 'Very Difficult';
}

analyzeBtn.addEventListener('click', () => {
    const text = inputArea.value.trim();
    if (!text) return;

    analyzeBtn.disabled = true;
    progressContainer.classList.remove('hidden');
    resultsSection.classList.add('hidden');
    progressBar.style.width = '0%';
    progressBar.textContent = '0%';

    initWorker();

    worker.postMessage({
        type: 'analyze',
        text: text
    });
});

sampleEasyBtn.addEventListener('click', () => {
    inputArea.value = easySample;
});

sampleHardBtn.addEventListener('click', () => {
    inputArea.value = hardSample;
});

clearBtn.addEventListener('click', () => {
    inputArea.value = '';
    resultsSection.classList.add('hidden');
    progressContainer.classList.add('hidden');
});

initWorker();
