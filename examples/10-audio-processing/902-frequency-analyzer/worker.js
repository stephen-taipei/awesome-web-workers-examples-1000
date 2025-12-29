const bandDefs = [
  { name: 'Sub', color: '#ff6b6b' },
  { name: 'Bass', color: '#ffa502' },
  { name: 'Low', color: '#ffd700' },
  { name: 'Mid', color: '#2ed573' },
  { name: 'High', color: '#1e90ff' },
  { name: 'Air', color: '#a55eea' }
];

onmessage = () => {
  const bands = bandDefs.map(b => ({ ...b, level: 20 + Math.random() * 80 }));
  postMessage({ bands });
};
