const playerNameInput = document.getElementById('playerName');
const scoreInput = document.getElementById('score');
const addBtn = document.getElementById('addBtn');
const leaderboardDisplay = document.getElementById('leaderboard');
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { leaderboard } = e.data;
    leaderboardDisplay.innerHTML = leaderboard.map((entry, i) =>
        `<div class="stat-item"><span class="stat-label">#${i + 1} ${entry.name}</span><span class="stat-value">${entry.score.toLocaleString()}</span></div>`
    ).join('') || '<p>No scores yet</p>';
};

addBtn.onclick = function() {
    const name = playerNameInput.value.trim() || 'Anonymous';
    const score = parseInt(scoreInput.value) || 0;
    worker.postMessage({ action: 'add', name, score });
    playerNameInput.value = '';
};

worker.postMessage({ action: 'get' });
