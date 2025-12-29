const dialogue = {
  start: { speaker: 'Elder', text: 'Welcome, traveler. What brings you to our village?', choices: [
    { text: 'I seek adventure', next: 'adventure' },
    { text: 'I need supplies', next: 'supplies' },
    { text: 'Just passing through', next: 'passing' }
  ]},
  adventure: { speaker: 'Elder', text: 'Brave soul! The ancient ruins to the north hold many treasures... and dangers.', choices: [
    { text: 'Tell me more', next: 'ruins' },
    { text: 'Thank you', next: 'end' }
  ]},
  supplies: { speaker: 'Elder', text: 'The merchant by the fountain has everything you need.', choices: [{ text: 'Thank you', next: 'end' }]},
  passing: { speaker: 'Elder', text: 'Safe travels, stranger. The roads can be treacherous at night.', choices: [{ text: 'Farewell', next: 'end' }]},
  ruins: { speaker: 'Elder', text: 'Legend speaks of a dragon guarding an ancient artifact. Many have tried, few returned.', choices: [{ text: 'I will try', next: 'end' }]},
  end: { speaker: 'Elder', text: 'May fortune favor you, traveler.', choices: [] }
};

let current = 'start';

onmessage = (e) => {
  const { type, idx } = e.data;
  if (type === 'start') { current = 'start'; postMessage(dialogue[current]); }
  else if (type === 'choose') {
    const choice = dialogue[current].choices[idx];
    if (choice) { current = choice.next; postMessage(dialogue[current]); }
  }
};
