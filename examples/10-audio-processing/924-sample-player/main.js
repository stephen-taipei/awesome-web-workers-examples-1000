const worker = new Worker('worker.js');
const padsEl = document.getElementById('pads');
const playingEl = document.getElementById('playing');
const samples = ['Kick', 'Snare', 'HiHat', 'Clap', 'Tom', 'Crash', 'Ride', 'Perc'];

worker.onmessage = (e) => {
  playingEl.textContent = e.data.playing || 'None';
  document.querySelectorAll('.pad').forEach((p, i) => {
    p.style.background = e.data.active === i ? '#ffd700' : '#4a9eff';
  });
};

padsEl.innerHTML = samples.map((s, i) => `<button class="pad btn" onclick="play(${i})" style="padding:2rem">${s}</button>`).join('');

function play(i) { worker.postMessage({ type: 'play', index: i, name: samples[i] }); }
