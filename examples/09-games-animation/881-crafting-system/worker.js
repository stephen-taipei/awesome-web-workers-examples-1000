const recipes = [
  { id: 'sword', name: 'Iron Sword', materials: { iron: 3, wood: 1 } },
  { id: 'shield', name: 'Wooden Shield', materials: { wood: 4, leather: 2 } },
  { id: 'armor', name: 'Leather Armor', materials: { leather: 3, cloth: 2 } },
  { id: 'axe', name: 'Stone Axe', materials: { stone: 2, wood: 2 } },
  { id: 'bow', name: 'Hunting Bow', materials: { wood: 3, cloth: 1 } }
];

onmessage = (e) => {
  const { type, id, inventory } = e.data;
  if (type === 'getRecipes') postMessage({ type: 'recipes', data: recipes });
  else if (type === 'craft') {
    const recipe = recipes.find(r => r.id === id);
    if (!recipe) return postMessage({ type: 'error', data: 'Recipe not found' });
    for (const [mat, qty] of Object.entries(recipe.materials)) {
      if ((inventory[mat] || 0) < qty) return postMessage({ type: 'error', data: `Not enough ${mat}` });
    }
    for (const [mat, qty] of Object.entries(recipe.materials)) inventory[mat] -= qty;
    postMessage({ type: 'crafted', data: { item: recipe.name, inventory } });
  }
};
