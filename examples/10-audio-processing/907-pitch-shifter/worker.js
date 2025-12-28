onmessage = (e) => {
  const { semitones } = e.data;
  const ratio = Math.pow(2, semitones / 12);
  postMessage({ semitones, ratio });
};
