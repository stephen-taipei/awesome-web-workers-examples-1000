const worker = new Worker('worker.js');
const entitiesEl = document.getElementById('entities');
const systemsEl = document.getElementById('systems');

worker.onmessage = (e) => {
  const { entities, systems } = e.data;
  entitiesEl.innerHTML = entities.map(ent =>
    `<div class="entity"><strong>${ent.type} #${ent.id}</strong><br>Components: ${ent.components.join(', ')}</div>`
  ).join('');
  systemsEl.innerHTML = systems.map(s => `<span class="tag tag-${s.active ? 'success' : 'secondary'}">${s.name}</span>`).join(' ');
};

function createEntity(type) {
  worker.postMessage({ type: 'create', entityType: type });
}

worker.postMessage({ type: 'init' });
