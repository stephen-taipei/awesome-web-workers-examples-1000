const taps = [];
onmessage = (e) => {
  taps.push(e.data.time);
  if (taps.length > 8) taps.shift();
  if (taps.length < 2) return postMessage({ bpm: null });
  const intervals = [];
  for (let i = 1; i < taps.length; i++) intervals.push(taps[i] - taps[i-1]);
  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  const bpm = Math.round(60000 / avg);
  postMessage({ bpm: bpm > 20 && bpm < 300 ? bpm : null });
};
