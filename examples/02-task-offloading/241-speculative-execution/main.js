// Speculative Execution - Main Thread

// DOM Elements
const problemTypeSelect = document.getElementById('problemType');
const dataSizeInput = document.getElementById('dataSize');
const dataSizeValue = document.getElementById('dataSizeValue');
const algo1Check = document.getElementById('algo1');
const algo2Check = document.getElementById('algo2');
const algo3Check = document.getElementById('algo3');

const runSpeculativeBtn = document.getElementById('runSpeculativeBtn');
const runSingleBtn = document.getElementById('runSingleBtn');
const resetBtn = document.getElementById('resetBtn');

const raceContainer = document.getElementById('raceContainer');
const winnerAnnouncement = document.getElementById('winnerAnnouncement');
const resultContainer = document.getElementById('resultContainer');
const algoResultsContainer = document.getElementById('algoResults');
const raceHistoryContainer = document.getElementById('raceHistory');

const analysisCanvas = document.getElementById('analysisCanvas');
const ctx = analysisCanvas.getContext('2d');

// State
let workers = [];
let results = {};
let raceHistory = [];
let winnerFound = false;
let raceStartTime = 0;

// Algorithm configurations
const algorithmConfigs = {
    sort: {
        algorithms: ['quicksort', 'mergesort', 'heapsort'],
        names: ['Quick Sort', 'Merge Sort', 'Heap Sort'],
        descriptions: ['Divide & conquer, O(n log n) avg', 'Stable, O(n log n) guaranteed', 'In-place, O(n log n) guaranteed'],
        colors: ['#f59e0b', '#3b82f6', '#8b5cf6']
    },
    search: {
        algorithms: ['naive', 'kmp', 'boyermoore'],
        names: ['Naive Search', 'KMP Algorithm', 'Boyer-Moore'],
        descriptions: ['O(nm) worst case', 'O(n+m) with preprocessing', 'O(n/m) best case'],
        colors: ['#f59e0b', '#3b82f6', '#8b5cf6']
    },
    path: {
        algorithms: ['dijkstra', 'astar', 'bfs'],
        names: ['Dijkstra', 'A* Search', 'BFS'],
        descriptions: ['Optimal, explores all directions', 'Heuristic-guided, faster', 'Simple, unweighted optimal'],
        colors: ['#f59e0b', '#3b82f6', '#8b5cf6']
    }
};

// Initialize
function init() {
    problemTypeSelect.addEventListener('change', updateAlgorithmDisplay);
    dataSizeInput.addEventListener('input', () => {
        dataSizeValue.textContent = parseInt(dataSizeInput.value).toLocaleString();
    });

    runSpeculativeBtn.addEventListener('click', runSpeculative);
    runSingleBtn.addEventListener('click', runSingleBest);
    resetBtn.addEventListener('click', reset);

    updateAlgorithmDisplay();
    drawEmptyChart();
}

function updateAlgorithmDisplay() {
    const config = algorithmConfigs[problemTypeSelect.value];

    for (let i = 0; i < 3; i++) {
        document.getElementById(`algoName${i + 1}`).textContent = config.names[i];
        document.getElementById(`algoDesc${i + 1}`).textContent = config.descriptions[i];
    }

    // Update racer names
    document.querySelectorAll('.racer-name').forEach((el, i) => {
        el.textContent = config.names[i];
    });
}

function generateTestData() {
    const problemType = problemTypeSelect.value;
    const size = parseInt(dataSizeInput.value);

    switch (problemType) {
        case 'sort':
            // Generate random array
            const array = [];
            for (let i = 0; i < size; i++) {
                array.push(Math.floor(Math.random() * size));
            }
            return { array };

        case 'search':
            // Generate text and pattern
            const chars = 'abcdefghij';
            let text = '';
            for (let i = 0; i < size; i++) {
                text += chars[Math.floor(Math.random() * chars.length)];
            }
            const pattern = 'abcde';
            return { text, pattern };

        case 'path':
            // Generate grid maze
            const gridSize = Math.floor(Math.sqrt(size));
            const grid = [];
            for (let i = 0; i < gridSize; i++) {
                grid[i] = [];
                for (let j = 0; j < gridSize; j++) {
                    // 20% walls
                    grid[i][j] = Math.random() < 0.2 ? 1 : 0;
                }
            }
            // Ensure start and end are clear
            grid[0][0] = 0;
            grid[gridSize - 1][gridSize - 1] = 0;
            return {
                grid,
                start: [0, 0],
                end: [gridSize - 1, gridSize - 1]
            };
    }
}

function getSelectedAlgorithms() {
    const config = algorithmConfigs[problemTypeSelect.value];
    const selected = [];

    if (algo1Check.checked) selected.push(config.algorithms[0]);
    if (algo2Check.checked) selected.push(config.algorithms[1]);
    if (algo3Check.checked) selected.push(config.algorithms[2]);

    return selected;
}

async function runSpeculative() {
    const algorithms = getSelectedAlgorithms();
    if (algorithms.length === 0) {
        alert('Please select at least one algorithm');
        return;
    }

    resetRace();
    raceContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');
    winnerAnnouncement.classList.add('hidden');

    const problemType = problemTypeSelect.value;
    const data = generateTestData();
    const config = algorithmConfigs[problemType];

    raceStartTime = performance.now();
    winnerFound = false;
    results = {};

    // Start all workers simultaneously
    const promises = algorithms.map((algorithm, index) => {
        return new Promise((resolve) => {
            const worker = new Worker('worker.js');
            workers.push(worker);

            const algoIndex = config.algorithms.indexOf(algorithm);
            updateRacerStatus(algoIndex + 1, 'Running...', 'running');

            worker.onmessage = (e) => {
                const msg = e.data;

                if (msg.type === 'progress') {
                    const idx = config.algorithms.indexOf(msg.algorithm) + 1;
                    updateRacerProgress(idx, msg.percent);
                } else if (msg.type === 'result') {
                    const idx = config.algorithms.indexOf(msg.algorithm) + 1;

                    results[msg.algorithm] = {
                        time: msg.executionTime,
                        ...msg
                    };

                    if (!winnerFound) {
                        // First to finish wins!
                        winnerFound = true;
                        declareWinner(msg.algorithm, msg.executionTime);

                        // Cancel other workers
                        workers.forEach(w => w.postMessage({ action: 'stop' }));
                    }

                    updateRacerProgress(idx, 100);
                    if (msg.algorithm === Object.keys(results)[0]) {
                        updateRacerStatus(idx, 'Winner!', 'winner');
                        document.getElementById(`racer${idx}`).classList.add('winner');
                    } else {
                        updateRacerStatus(idx, 'Cancelled', 'cancelled');
                        document.getElementById(`racer${idx}`).classList.add('cancelled');
                    }

                    resolve();
                } else if (msg.type === 'cancelled') {
                    const idx = config.algorithms.indexOf(msg.algorithm) + 1;
                    updateRacerStatus(idx, 'Cancelled', 'cancelled');
                    document.getElementById(`racer${idx}`).classList.add('cancelled');
                    resolve();
                }
            };

            worker.postMessage({ problemType, algorithm, data });
        });
    });

    // Wait for winner
    await Promise.race(promises);

    // Brief delay then show results
    setTimeout(() => {
        displayResults(algorithms);
        drawAnalysisChart();
    }, 500);

    // Cleanup workers
    setTimeout(() => {
        workers.forEach(w => w.terminate());
        workers = [];
    }, 1000);
}

async function runSingleBest() {
    const algorithms = getSelectedAlgorithms();
    if (algorithms.length === 0) {
        alert('Please select at least one algorithm');
        return;
    }

    resetRace();
    raceContainer.classList.remove('hidden');
    resultContainer.classList.add('hidden');

    const problemType = problemTypeSelect.value;
    const data = generateTestData();
    const config = algorithmConfigs[problemType];

    // Run only the first selected algorithm
    const algorithm = algorithms[0];
    const algoIndex = config.algorithms.indexOf(algorithm);

    raceStartTime = performance.now();
    results = {};

    return new Promise((resolve) => {
        const worker = new Worker('worker.js');
        workers.push(worker);

        updateRacerStatus(algoIndex + 1, 'Running...', 'running');

        worker.onmessage = (e) => {
            const msg = e.data;

            if (msg.type === 'progress') {
                updateRacerProgress(algoIndex + 1, msg.percent);
            } else if (msg.type === 'result') {
                results[msg.algorithm] = {
                    time: msg.executionTime,
                    ...msg
                };

                updateRacerProgress(algoIndex + 1, 100);
                updateRacerStatus(algoIndex + 1, 'Complete', 'winner');
                document.getElementById(`racer${algoIndex + 1}`).classList.add('winner');

                setTimeout(() => {
                    displayResults([algorithm]);
                    drawAnalysisChart();
                    worker.terminate();
                    workers = [];
                }, 300);

                resolve();
            }
        };

        worker.postMessage({ problemType, algorithm, data });
    });
}

function declareWinner(algorithm, time) {
    const config = algorithmConfigs[problemTypeSelect.value];
    const algoIndex = config.algorithms.indexOf(algorithm);
    const name = config.names[algoIndex];

    winnerAnnouncement.textContent = `🏆 ${name} wins in ${time.toFixed(1)}ms!`;
    winnerAnnouncement.classList.remove('hidden');

    // Add to history
    raceHistory.unshift({
        winner: name,
        time: time.toFixed(1),
        algorithms: getSelectedAlgorithms().length
    });

    if (raceHistory.length > 10) raceHistory.pop();
}

function updateRacerProgress(index, percent) {
    document.getElementById(`racerBar${index}`).style.width = `${percent}%`;
}

function updateRacerStatus(index, text, className) {
    const statusEl = document.getElementById(`racerStatus${index}`);
    statusEl.textContent = text;
    statusEl.className = `racer-status ${className}`;
}

function resetRace() {
    for (let i = 1; i <= 3; i++) {
        document.getElementById(`racerBar${i}`).style.width = '0%';
        document.getElementById(`racerStatus${i}`).textContent = 'Ready';
        document.getElementById(`racerStatus${i}`).className = 'racer-status';
        document.getElementById(`racer${i}`).className = 'racer';
    }
    winnerAnnouncement.classList.add('hidden');
}

function displayResults(algorithms) {
    resultContainer.classList.remove('hidden');

    const config = algorithmConfigs[problemTypeSelect.value];
    const winner = Object.keys(results)[0];
    const winnerIndex = config.algorithms.indexOf(winner);

    document.getElementById('winnerAlgo').textContent = config.names[winnerIndex];
    document.getElementById('winningTime').textContent = `${results[winner].time.toFixed(1)} ms`;

    // Calculate metrics
    const times = Object.values(results).map(r => r.time);
    const maxTime = Math.max(...times);
    const minTime = Math.min(...times);
    const latencySaved = algorithms.length > 1 ? maxTime - minTime : 0;
    const resourceCost = times.reduce((a, b) => a + b, 0);

    document.getElementById('latencySaved').textContent = `${latencySaved.toFixed(1)} ms`;
    document.getElementById('resourceCost').textContent = `${resourceCost.toFixed(0)} ms total`;

    // Algorithm details
    algoResultsContainer.innerHTML = '';
    algorithms.forEach(algo => {
        const result = results[algo];
        const index = config.algorithms.indexOf(algo);
        const isWinner = algo === winner;

        const div = document.createElement('div');
        div.className = `algo-result ${isWinner ? 'winner' : ''} ${result ? '' : 'cancelled'}`;
        div.innerHTML = `
            <h4>${config.names[index]} ${isWinner ? '🏆' : ''}</h4>
            <p>Time: ${result ? result.time.toFixed(1) + ' ms' : 'Cancelled'}</p>
            ${result && result.checksum ? `<p>Checksum: ${result.checksum}</p>` : ''}
            ${result && result.matches !== undefined ? `<p>Matches: ${result.matches}</p>` : ''}
            ${result && result.pathLength ? `<p>Path: ${result.pathLength} steps</p>` : ''}
        `;
        algoResultsContainer.appendChild(div);
    });

    // Update history display
    raceHistoryContainer.innerHTML = raceHistory.map((h, i) => `
        <div class="history-item">
            <span class="race-num">#${raceHistory.length - i}</span>
            <span class="race-winner">${h.winner}</span>
            <span class="race-time">${h.time}ms (${h.algorithms} algos)</span>
        </div>
    `).join('');
}

function drawEmptyChart() {
    const w = analysisCanvas.width;
    const h = analysisCanvas.height;

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#4a7a5a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Run a race to see performance analysis', w / 2, h / 2);
}

function drawAnalysisChart() {
    const w = analysisCanvas.width;
    const h = analysisCanvas.height;
    const padding = { top: 60, right: 30, bottom: 60, left: 100 };

    ctx.fillStyle = '#080f08';
    ctx.fillRect(0, 0, w, h);

    const config = algorithmConfigs[problemTypeSelect.value];
    const algorithms = Object.keys(results);

    if (algorithms.length === 0) return;

    const chartWidth = w - padding.left - padding.right;
    const chartHeight = h - padding.top - padding.bottom;
    const barHeight = Math.min(50, chartHeight / algorithms.length - 20);

    // Title
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Algorithm Execution Time Comparison', w / 2, 25);

    // Find max time for scale
    const maxTime = Math.max(...algorithms.map(a => results[a].time));

    // Draw bars
    algorithms.forEach((algo, i) => {
        const result = results[algo];
        const algoIndex = config.algorithms.indexOf(algo);
        const y = padding.top + i * (chartHeight / algorithms.length) + (chartHeight / algorithms.length - barHeight) / 2;

        // Algorithm name
        ctx.fillStyle = '#a7f3d0';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(config.names[algoIndex], padding.left - 10, y + barHeight / 2 + 4);

        // Bar background
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(padding.left, y, chartWidth, barHeight);

        // Bar
        const barWidth = (result.time / maxTime) * chartWidth;
        ctx.fillStyle = config.colors[algoIndex];
        ctx.fillRect(padding.left, y, barWidth, barHeight);

        // Winner indicator
        if (i === 0) {
            ctx.fillStyle = '#10b981';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText('WINNER', padding.left + barWidth + 10, y + barHeight / 2 - 6);
        }

        // Time label
        ctx.fillStyle = '#fff';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`${result.time.toFixed(1)} ms`, padding.left + barWidth + 10, y + barHeight / 2 + 10);
    });

    // Time axis
    ctx.strokeStyle = '#2a5a3a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding.left, h - padding.bottom);
    ctx.lineTo(w - padding.right, h - padding.bottom);
    ctx.stroke();

    // Time ticks
    ctx.fillStyle = '#4a7a5a';
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    for (let i = 0; i <= 5; i++) {
        const x = padding.left + (i / 5) * chartWidth;
        const time = (i / 5 * maxTime).toFixed(0);

        ctx.beginPath();
        ctx.moveTo(x, h - padding.bottom);
        ctx.lineTo(x, h - padding.bottom + 5);
        ctx.stroke();

        ctx.fillText(`${time}ms`, x, h - padding.bottom + 18);
    }

    // Latency savings visualization
    if (algorithms.length > 1) {
        const times = algorithms.map(a => results[a].time);
        const savings = Math.max(...times) - Math.min(...times);
        const savingsPercent = ((savings / Math.max(...times)) * 100).toFixed(0);

        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Speculative execution saved ${savings.toFixed(0)}ms (${savingsPercent}% latency reduction)`, w / 2, h - 15);
    }
}

function reset() {
    workers.forEach(w => w.terminate());
    workers = [];
    results = {};
    winnerFound = false;

    raceContainer.classList.add('hidden');
    resultContainer.classList.add('hidden');
    resetRace();
    drawEmptyChart();
}

// Initialize on load
init();
