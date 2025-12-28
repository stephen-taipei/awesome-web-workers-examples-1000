onmessage = (e) => {
  const { voices: count, depth } = e.data;
  const voices = Array(count).fill(0).map((_, i) => ({
    delay: Math.round(depth * (i + 1) / count),
    detune: Math.round((i - count / 2) * 10)
  }));
  postMessage({ voices });
};
