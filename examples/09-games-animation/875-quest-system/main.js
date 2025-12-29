const killBtn = document.getElementById('killBtn');
const collectBtn = document.getElementById('collectBtn');
const talkBtn = document.getElementById('talkBtn');
const questsDisplay = document.getElementById('quests');
const completedDisplay = document.getElementById('completed');
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { active, completed, justCompleted } = e.data;
    questsDisplay.innerHTML = active.map(q =>
        `<div class="stat-item"><span class="stat-label">${q.name}</span><span class="stat-value">${q.progress}/${q.target}</span></div>`
    ).join('') || '<p>No active quests</p>';
    completedDisplay.innerHTML = completed.map(q =>
        `<div class="stat-item"><span class="stat-label">✓ ${q.name}</span><span class="stat-value">${q.reward}</span></div>`
    ).join('') || '<p>No completed quests</p>';
    if (justCompleted) alert(`Quest Complete: ${justCompleted.name}! Reward: ${justCompleted.reward}`);
};

killBtn.onclick = () => worker.postMessage({ action: 'kill_goblin' });
collectBtn.onclick = () => worker.postMessage({ action: 'collect_herb' });
talkBtn.onclick = () => worker.postMessage({ action: 'talk_npc' });

worker.postMessage({ action: 'init' });
