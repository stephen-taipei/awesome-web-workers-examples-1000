const itemType = document.getElementById('itemType');
const quantity = document.getElementById('quantity');
const addBtn = document.getElementById('addBtn');
const inventoryDisplay = document.getElementById('inventory');
const slotsDisplay = document.getElementById('slots');
const worker = new Worker('worker.js');

const itemIcons = { potion: '🧪', sword: '⚔️', shield: '🛡️', gold: '🪙' };

worker.onmessage = function(e) {
    const { inventory, slotsUsed, error } = e.data;
    if (error) { alert(error); return; }
    slotsDisplay.textContent = `${slotsUsed}/20`;
    inventoryDisplay.innerHTML = inventory.map(item =>
        `<div class="stat-item"><span class="stat-label">${itemIcons[item.type]} ${item.name}</span><span class="stat-value">x${item.quantity}</span></div>`
    ).join('') || '<p>Inventory empty</p>';
};

addBtn.onclick = () => worker.postMessage({ action: 'add', type: itemType.value, quantity: parseInt(quantity.value) || 1 });

worker.postMessage({ action: 'get' });
