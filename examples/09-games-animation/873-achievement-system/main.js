const killBtn = document.getElementById('killBtn');
const collectBtn = document.getElementById('collectBtn');
const levelBtn = document.getElementById('levelBtn');
const killsDisplay = document.getElementById('kills');
const coinsDisplay = document.getElementById('coins');
const levelDisplay = document.getElementById('level');
const achievementsDisplay = document.getElementById('achievements');
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { stats, achievements, unlocked } = e.data;
    killsDisplay.textContent = stats.kills;
    coinsDisplay.textContent = stats.coins;
    levelDisplay.textContent = stats.level;
    achievementsDisplay.innerHTML = achievements.map(a =>
        `<div class="stat-item" style="opacity:${a.unlocked ? 1 : 0.5}"><span class="stat-label">${a.unlocked ? '✓' : '○'} ${a.name}</span><span class="stat-value">${a.description}</span></div>`
    ).join('');
    if (unlocked) alert(`Achievement Unlocked: ${unlocked.name}!`);
};

killBtn.onclick = () => worker.postMessage({ action: 'kill' });
collectBtn.onclick = () => worker.postMessage({ action: 'collect' });
levelBtn.onclick = () => worker.postMessage({ action: 'levelup' });

worker.postMessage({ action: 'init' });
