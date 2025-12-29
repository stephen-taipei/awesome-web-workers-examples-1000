const itemTypes = ['Sword', 'Shield', 'Helmet', 'Armor', 'Ring', 'Amulet', 'Boots', 'Gloves'];
const prefixes = ['Mighty', 'Swift', 'Ancient', 'Cursed', 'Blessed', 'Flaming', 'Frozen', 'Thunder'];
const rarities = [
    { name: 'common', weight: 60, mult: 1 },
    { name: 'uncommon', weight: 25, mult: 1.5 },
    { name: 'rare', weight: 10, mult: 2 },
    { name: 'epic', weight: 4, mult: 3 },
    { name: 'legendary', weight: 1, mult: 5 }
];

function pickRarity(luck) {
    const adjustedWeights = rarities.map(r => ({ ...r, weight: r.name === 'common' ? Math.max(10, r.weight - luck) : r.weight + luck / 10 }));
    const total = adjustedWeights.reduce((s, r) => s + r.weight, 0);
    let rand = Math.random() * total;
    for (const r of adjustedWeights) {
        rand -= r.weight;
        if (rand <= 0) return r;
    }
    return rarities[0];
}

self.onmessage = function(e) {
    const { level, luck } = e.data;
    const numItems = 1 + Math.floor(Math.random() * 3);
    const items = [];

    for (let i = 0; i < numItems; i++) {
        const rarity = pickRarity(luck);
        const type = itemTypes[Math.floor(Math.random() * itemTypes.length)];
        const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
        const baseStat = Math.floor(level * rarity.mult * (0.8 + Math.random() * 0.4));
        items.push({
            name: `${prefix} ${type}`,
            rarity: rarity.name,
            stats: `+${baseStat} Power`
        });
    }

    const gold = Math.floor(level * 10 * (1 + Math.random()));
    self.postMessage({ items, gold });
};
