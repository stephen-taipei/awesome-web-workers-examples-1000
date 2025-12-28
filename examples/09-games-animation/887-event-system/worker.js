const listeners = {
  'player:spawn': [() => 'UI updated', () => 'Sound played'],
  'enemy:killed': [() => 'Score +100', () => 'Particle effect'],
  'item:collected': [() => 'Inventory updated', () => 'Achievement check'],
  'level:complete': [() => 'Save game', () => 'Load next level', () => 'Show stats']
};

const events = [];

onmessage = (e) => {
  const { type, name } = e.data;
  if (type === 'emit') {
    const handlers = listeners[name] || [];
    const reactions = handlers.map(h => h());
    const evType = name.split(':')[0];
    events.unshift({ name, type: evType, time: new Date().toLocaleTimeString(), reactions });
    if (events.length > 20) events.pop();
  }
  postMessage({ events });
};
