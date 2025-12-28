const quests = [
    { id: 1, name: 'Goblin Slayer', action: 'kill_goblin', target: 5, progress: 0, reward: '100 Gold', completed: false },
    { id: 2, name: 'Herb Collector', action: 'collect_herb', target: 10, progress: 0, reward: '50 Gold', completed: false },
    { id: 3, name: 'Village Helper', action: 'talk_npc', target: 3, progress: 0, reward: 'Magic Amulet', completed: false }
];

self.onmessage = function(e) {
    const { action } = e.data;
    let justCompleted = null;

    for (const quest of quests) {
        if (!quest.completed && quest.action === action) {
            quest.progress = Math.min(quest.progress + 1, quest.target);
            if (quest.progress >= quest.target) {
                quest.completed = true;
                justCompleted = quest;
            }
        }
    }

    self.postMessage({
        active: quests.filter(q => !q.completed),
        completed: quests.filter(q => q.completed),
        justCompleted
    });
};
