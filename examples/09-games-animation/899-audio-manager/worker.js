const sounds = { jump: 200, coin: 150, hit: 300, music: 2000 };
let queue = [];
async function processQueue() {
  while (queue.length > 0) {
    queue[0].playing = true;
    postMessage({ queue });
    await new Promise(r => setTimeout(r, sounds[queue[0].name]));
    queue.shift();
    postMessage({ queue });
  }
}
onmessage = (e) => {
  if (e.data.type === 'play') {
    queue.push({ name: e.data.sound, playing: false });
    postMessage({ queue });
    if (queue.length === 1) processQueue();
  }
};
