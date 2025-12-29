const level = document.getElementById('level');
const charClass = document.getElementById('charClass');
const str = document.getElementById('str');
const dex = document.getElementById('dex');
const int = document.getElementById('int');
const vit = document.getElementById('vit');
const calcBtn = document.getElementById('calcBtn');
const derivedDisplay = document.getElementById('derived');
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const s = e.data;
    derivedDisplay.innerHTML = `
        <div class="stat-item"><span class="stat-label">HP</span><span class="stat-value">${s.hp}</span></div>
        <div class="stat-item"><span class="stat-label">MP</span><span class="stat-value">${s.mp}</span></div>
        <div class="stat-item"><span class="stat-label">Physical ATK</span><span class="stat-value">${s.physAtk}</span></div>
        <div class="stat-item"><span class="stat-label">Magic ATK</span><span class="stat-value">${s.magAtk}</span></div>
        <div class="stat-item"><span class="stat-label">Physical DEF</span><span class="stat-value">${s.physDef}</span></div>
        <div class="stat-item"><span class="stat-label">Magic DEF</span><span class="stat-value">${s.magDef}</span></div>
        <div class="stat-item"><span class="stat-label">Crit Rate</span><span class="stat-value">${s.critRate}%</span></div>
        <div class="stat-item"><span class="stat-label">Dodge Rate</span><span class="stat-value">${s.dodgeRate}%</span></div>
    `;
};

calcBtn.onclick = function() {
    worker.postMessage({
        level: +level.value,
        charClass: charClass.value,
        str: +str.value,
        dex: +dex.value,
        int: +int.value,
        vit: +vit.value
    });
};
