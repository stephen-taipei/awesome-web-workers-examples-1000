const worker = new Worker('worker.js');
const inventoryEl = document.getElementById('inventory');
const recipesEl = document.getElementById('recipes');
const craftedEl = document.getElementById('crafted');

const inventory = { wood: 10, stone: 8, iron: 5, leather: 4, cloth: 6 };

worker.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'recipes') renderRecipes(data);
  else if (type === 'crafted') { Object.assign(inventory, data.inventory); renderInventory(); addCrafted(data.item); }
  else if (type === 'error') alert(data);
};

function renderInventory() {
  inventoryEl.innerHTML = Object.entries(inventory).map(([k,v]) => `<span class="tag">${k}: ${v}</span>`).join(' ');
}

function renderRecipes(recipes) {
  recipesEl.innerHTML = recipes.map(r => `<div class="recipe"><strong>${r.name}</strong>: ${Object.entries(r.materials).map(([k,v])=>`${k}x${v}`).join(', ')} <button onclick="craft('${r.id}')">Craft</button></div>`).join('');
}

function addCrafted(item) {
  craftedEl.innerHTML += `<span class="tag tag-success">${item}</span> `;
}

function craft(id) {
  worker.postMessage({ type: 'craft', id, inventory: {...inventory} });
}

renderInventory();
worker.postMessage({ type: 'getRecipes' });
