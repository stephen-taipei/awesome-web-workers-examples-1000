const playerAtk = document.getElementById('playerAtk');
const playerDef = document.getElementById('playerDef');
const playerHp = document.getElementById('playerHp');
const enemyAtk = document.getElementById('enemyAtk');
const enemyDef = document.getElementById('enemyDef');
const enemyHp = document.getElementById('enemyHp');
const simulateBtn = document.getElementById('simulateBtn');
const logDisplay = document.getElementById('log');
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { log, winner } = e.data;
    logDisplay.innerHTML = log.map(l => `<div class="stat-item"><span>${l}</span></div>`).join('') +
        `<div class="stat-item" style="font-weight:bold"><span>Winner: ${winner}</span></div>`;
};

simulateBtn.onclick = function() {
    worker.postMessage({
        player: { atk: +playerAtk.value, def: +playerDef.value, hp: +playerHp.value },
        enemy: { atk: +enemyAtk.value, def: +enemyDef.value, hp: +enemyHp.value }
    });
};
