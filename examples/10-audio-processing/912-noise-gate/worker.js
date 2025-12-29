onmessage = (e) => {
  const { threshold, level } = e.data;
  postMessage({ open: level > threshold });
};
