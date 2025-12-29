let points = 5;
const skills = [
    { id: 'slash', name: 'Slash', description: 'Basic attack', prereq: null, unlocked: false },
    { id: 'power_slash', name: 'Power Slash', description: '+50% damage', prereq: 'slash', unlocked: false },
    { id: 'whirlwind', name: 'Whirlwind', description: 'AOE attack', prereq: 'power_slash', unlocked: false },
    { id: 'block', name: 'Block', description: 'Reduce damage', prereq: null, unlocked: false },
    { id: 'counter', name: 'Counter', description: 'Counter attack', prereq: 'block', unlocked: false },
    { id: 'heal', name: 'Heal', description: 'Restore HP', prereq: null, unlocked: false },
    { id: 'regen', name: 'Regeneration', description: 'HP over time', prereq: 'heal', unlocked: false }
];

function updatePrereqs() {
    for (const s of skills) {
        s.prereqMet = !s.prereq || skills.find(sk => sk.id === s.prereq)?.unlocked;
    }
}

self.onmessage = function(e) {
    const { action, id } = e.data;

    if (action === 'unlock' && points > 0) {
        const skill = skills.find(s => s.id === id);
        if (skill && !skill.unlocked && skill.prereqMet) {
            skill.unlocked = true;
            points--;
        }
    } else if (action === 'reset') {
        points = 5;
        for (const s of skills) s.unlocked = false;
    }

    updatePrereqs();
    self.postMessage({ skills, points });
};
