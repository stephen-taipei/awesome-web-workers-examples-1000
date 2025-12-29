const pointsDisplay = document.getElementById('points');
const skillsDisplay = document.getElementById('skills');
const unlockedDisplay = document.getElementById('unlocked');
const resetBtn = document.getElementById('resetBtn');
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { skills, points } = e.data;
    pointsDisplay.textContent = points;
    skillsDisplay.innerHTML = skills.map(s => {
        const canUnlock = !s.unlocked && s.prereqMet && points > 0;
        return `<div class="stat-item" style="opacity:${s.prereqMet || s.unlocked ? 1 : 0.4}">
            <span class="stat-label">${s.unlocked ? '✓' : '○'} ${s.name} ${s.prereq ? `(需: ${s.prereq})` : ''}</span>
            <button class="btn btn-primary" style="padding:0.25rem 0.5rem" ${canUnlock ? '' : 'disabled'} onclick="unlock('${s.id}')">學習</button>
        </div>`;
    }).join('');
    unlockedDisplay.innerHTML = skills.filter(s => s.unlocked).map(s =>
        `<div class="stat-item"><span class="stat-label">✓ ${s.name}</span><span class="stat-value">${s.description}</span></div>`
    ).join('') || '<p>No skills unlocked</p>';
};

window.unlock = function(id) { worker.postMessage({ action: 'unlock', id }); };
resetBtn.onclick = function() { worker.postMessage({ action: 'reset' }); };
worker.postMessage({ action: 'init' });
