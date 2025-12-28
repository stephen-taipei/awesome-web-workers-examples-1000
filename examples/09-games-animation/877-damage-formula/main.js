const baseAtk = document.getElementById('baseAtk');
const targetDef = document.getElementById('targetDef');
const skillMult = document.getElementById('skillMult');
const element = document.getElementById('element');
const calcBtn = document.getElementById('calcBtn');
const resultsDisplay = document.getElementById('results');
const worker = new Worker('worker.js');

worker.onmessage = function(e) {
    const { baseDamage, skillDamage, elementalDamage, finalDamage, critRange } = e.data;
    resultsDisplay.innerHTML = `
        <div class="stat-item"><span class="stat-label">Base Damage:</span><span class="stat-value">${baseDamage}</span></div>
        <div class="stat-item"><span class="stat-label">After Skill Mult:</span><span class="stat-value">${skillDamage}</span></div>
        <div class="stat-item"><span class="stat-label">After Element:</span><span class="stat-value">${elementalDamage}</span></div>
        <div class="stat-item"><span class="stat-label">Final (with variance):</span><span class="stat-value">${finalDamage}</span></div>
        <div class="stat-item"><span class="stat-label">Damage Range:</span><span class="stat-value">${critRange.min} - ${critRange.max}</span></div>
    `;
};

calcBtn.onclick = function() {
    worker.postMessage({
        baseAtk: +baseAtk.value,
        targetDef: +targetDef.value,
        skillMult: +skillMult.value,
        element: +element.value
    });
};
