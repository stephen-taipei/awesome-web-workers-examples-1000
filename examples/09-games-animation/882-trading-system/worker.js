const shop = [
  { id: 'potion', name: 'Health Potion', price: 25, sellPrice: 15 },
  { id: 'sword', name: 'Steel Sword', price: 50, sellPrice: 30 },
  { id: 'shield', name: 'Iron Shield', price: 40, sellPrice: 25 },
  { id: 'armor', name: 'Chain Mail', price: 80, sellPrice: 50 },
  { id: 'ring', name: 'Magic Ring', price: 60, sellPrice: 40 }
];

onmessage = (e) => {
  const { type, id, gold, items } = e.data;
  if (type === 'getShop') postMessage({ type: 'shop', data: shop });
  else if (type === 'buy') {
    const item = shop.find(i => i.id === id);
    if (!item) return postMessage({ type: 'error', data: 'Item not found' });
    if (gold < item.price) return postMessage({ type: 'error', data: 'Not enough gold' });
    items.push({ ...item });
    postMessage({ type: 'bought', data: { gold: gold - item.price, items } });
  } else if (type === 'sell') {
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return postMessage({ type: 'error', data: 'Item not found' });
    const item = items.splice(idx, 1)[0];
    postMessage({ type: 'sold', data: { gold: gold + item.sellPrice, items } });
  }
};
