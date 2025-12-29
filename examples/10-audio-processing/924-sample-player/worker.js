let timeout;
onmessage = (e) => {
  const { index, name } = e.data;
  postMessage({ playing: name, active: index });
  clearTimeout(timeout);
  timeout = setTimeout(() => postMessage({ playing: null, active: -1 }), 300);
};
