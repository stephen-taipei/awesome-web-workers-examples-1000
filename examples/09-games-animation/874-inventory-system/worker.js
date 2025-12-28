const items = {
    potion: { name: 'Health Potion', stackable: true, maxStack: 99 },
    sword: { name: 'Iron Sword', stackable: false, maxStack: 1 },
    shield: { name: 'Wooden Shield', stackable: false, maxStack: 1 },
    gold: { name: 'Gold Coin', stackable: true, maxStack: 999 }
};
const inventory = [];
const maxSlots = 20;

self.onmessage = function(e) {
    const { action, type, quantity } = e.data;

    if (action === 'add') {
        const itemDef = items[type];
        let remaining = quantity;

        if (itemDef.stackable) {
            const existing = inventory.find(i => i.type === type && i.quantity < itemDef.maxStack);
            if (existing) {
                const add = Math.min(remaining, itemDef.maxStack - existing.quantity);
                existing.quantity += add;
                remaining -= add;
            }
        }

        while (remaining > 0 && inventory.length < maxSlots) {
            const add = Math.min(remaining, itemDef.maxStack);
            inventory.push({ type, name: itemDef.name, quantity: add });
            remaining -= add;
        }

        if (remaining > 0) {
            self.postMessage({ inventory, slotsUsed: inventory.length, error: 'Inventory full!' });
            return;
        }
    }

    self.postMessage({ inventory, slotsUsed: inventory.length });
};
