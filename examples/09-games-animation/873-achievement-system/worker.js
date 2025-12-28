const stats = { kills: 0, coins: 0, level: 1 };
const achievements = [
    { id: 'first_blood', name: 'First Blood', description: 'Kill 1 enemy', check: () => stats.kills >= 1, unlocked: false },
    { id: 'slayer', name: 'Slayer', description: 'Kill 10 enemies', check: () => stats.kills >= 10, unlocked: false },
    { id: 'collector', name: 'Collector', description: 'Collect 50 coins', check: () => stats.coins >= 50, unlocked: false },
    { id: 'rich', name: 'Rich', description: 'Collect 200 coins', check: () => stats.coins >= 200, unlocked: false },
    { id: 'level5', name: 'Adventurer', description: 'Reach level 5', check: () => stats.level >= 5, unlocked: false },
    { id: 'level10', name: 'Hero', description: 'Reach level 10', check: () => stats.level >= 10, unlocked: false }
];

self.onmessage = function(e) {
    const { action } = e.data;
    let unlocked = null;

    if (action === 'kill') stats.kills++;
    else if (action === 'collect') stats.coins++;
    else if (action === 'levelup') stats.level++;

    for (const a of achievements) {
        if (!a.unlocked && a.check()) {
            a.unlocked = true;
            unlocked = a;
        }
    }

    self.postMessage({ stats, achievements, unlocked });
};
