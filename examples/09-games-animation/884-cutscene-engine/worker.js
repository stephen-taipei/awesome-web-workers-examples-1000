const cutscene = [
  { text: 'In a world of darkness...', bg: '#000', duration: 2000 },
  { text: 'A hero rises.', bg: '#1a1a2e', color: '#ffd700', size: 24, duration: 2000 },
  { text: 'Armed with courage and determination...', bg: '#2d1b4e', duration: 2000 },
  { text: 'They embark on a journey...', bg: '#1e3a5f', duration: 2000 },
  { text: 'To save the realm!', bg: '#4a1a1a', color: '#ff6b6b', size: 28, duration: 2500 }
];

let playing = false;

onmessage = async (e) => {
  if (e.data.type === 'play' && !playing) {
    playing = true;
    for (const frame of cutscene) {
      postMessage({ type: 'frame', data: frame });
      await new Promise(r => setTimeout(r, frame.duration));
    }
    playing = false;
    postMessage({ type: 'end' });
  }
};
