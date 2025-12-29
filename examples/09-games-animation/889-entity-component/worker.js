let nextId = 1;
const entities = [];

const archetypes = {
  player: ['Position', 'Velocity', 'Health', 'Input', 'Render'],
  enemy: ['Position', 'Velocity', 'Health', 'AI', 'Render'],
  item: ['Position', 'Collider', 'Pickup', 'Render']
};

const systems = [
  { name: 'MovementSystem', requires: ['Position', 'Velocity'], active: false },
  { name: 'InputSystem', requires: ['Input'], active: false },
  { name: 'AISystem', requires: ['AI'], active: false },
  { name: 'RenderSystem', requires: ['Render'], active: false },
  { name: 'CollisionSystem', requires: ['Collider'], active: false }
];

function updateSystems() {
  systems.forEach(s => {
    s.active = entities.some(e => s.requires.every(c => e.components.includes(c)));
  });
}

onmessage = (e) => {
  const { type, entityType } = e.data;
  if (type === 'create' && archetypes[entityType]) {
    entities.push({ id: nextId++, type: entityType, components: [...archetypes[entityType]] });
    updateSystems();
  }
  postMessage({ entities, systems });
};
