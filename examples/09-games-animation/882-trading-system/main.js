const worker = new Worker('worker.js');
const goldEl = document.getElementById('gold');
const shopEl = document.getElementById('shop');
const itemsEl = document.getElementById('items');

let gold = 100, items = [];

worker.onmessage = (e) => {
  const { type, data } = e.data;
  if (type === 'shop') renderShop(data);
  else if (type === 'bought') { gold = data.gold; items = data.items; render(); }
  else if (type === 'sold') { gold = data.gold; items = data.items; render(); }
  else if (type === 'error') alert(data);
};

function renderShop(shopItems) {
  shopEl.innerHTML = shopItems.map(i => `<div class="item"><strong>${i.name}</strong> - ${i.price}g <button onclick="buy('${i.id}')">Buy</button></div>`).join('');
}

function render() {
  goldEl.textContent = gold;
  itemsEl.innerHTML = items.length ? items.map(i => `<span class="tag">${i.name} <button onclick="sell('${i.id}')">Sell</button></span>`).join(' ') : 'No items';
}

function buy(id) { worker.postMessage({ type: 'buy', id, gold, items: [...items] }); }
function sell(id) { worker.postMessage({ type: 'sell', id, gold, items: [...items] }); }

render();
worker.postMessage({ type: 'getShop' });
