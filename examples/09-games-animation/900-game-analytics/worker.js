const stats = { sessions: 0, levels_completed: 0, purchases: 0, achievements: 0, total_events: 0 };
onmessage = (e) => {
  const ev = e.data.event;
  stats.total_events++;
  if (ev === 'session_start') stats.sessions++;
  else if (ev === 'level_complete') stats.levels_completed++;
  else if (ev === 'purchase') stats.purchases++;
  else if (ev === 'achievement') stats.achievements++;
  postMessage({ stats });
};
