const worker = new Worker('worker.js');
worker.onmessage = (e) => {
  const { hp, maxHp, mp, maxMp, xp, level } = e.data;
  document.getElementById('hud').innerHTML = `
    <div>HP: <progress value="${hp}" max="${maxHp}"></progress> ${hp}/${maxHp}</div>
    <div>MP: <progress value="${mp}" max="${maxMp}"></progress> ${mp}/${maxMp}</div>
    <div>XP: <progress value="${xp}" max="100"></progress> ${xp}/100</div>
    <div>Level: ${level}</div>`;
};
function action(type) { worker.postMessage({ type }); }
worker.postMessage({ type: 'init' });
