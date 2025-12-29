onmessage = (e) => {
  const { effects } = e.data;
  const path = ['Input', ...effects.filter(e => e.enabled).map(e => e.name), 'Output'];
  postMessage({ path });
};
