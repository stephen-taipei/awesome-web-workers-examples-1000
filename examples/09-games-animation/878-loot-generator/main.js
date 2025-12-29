const monsterLevel = document.getElementById('monsterLevel');
const luck = document.getElementById('luck');
const generateBtn = document.getElementById('generateBtn');
const lootDisplay = document.getElementById('loot');
const worker = new Worker('worker.js');

const rarityColors = { common: '#888', uncommon: '#2ecc71', rare: '#3498db', epic: '#9b59b6', legendary: '#f39c12' };

worker.onmessage = function(e) {
    const { items, gold } = e.data;
    lootDisplay.innerHTML = items.map(item =>
        `<div class="stat-item"><span class="stat-label" style="color:${rarityColors[item.rarity]}">${item.name}</span><span class="stat-value">${item.stats}</span></div>`
    ).join('') + `<div class="stat-item"><span class="stat-label">🪙 Gold</span><span class="stat-value">${gold}</span></div>`;
};

generateBtn.onclick = function() {
    worker.postMessage({ level: +monsterLevel.value, luck: +luck.value });
};
