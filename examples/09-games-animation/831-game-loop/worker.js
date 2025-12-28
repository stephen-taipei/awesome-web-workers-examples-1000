/**
 * Game Loop - Web Worker
 * Fixed timestep game loop with entity simulation
 */

let isRunning = false;
let tickRate = 60;
let tickInterval = null;
let entities = [];
let tick = 0;
let canvasWidth = 800;
let canvasHeight = 400;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            startGameLoop(payload);
            break;
        case 'STOP':
            stopGameLoop();
            break;
    }
};

function startGameLoop(config) {
    tickRate = config.tickRate || 60;
    canvasWidth = config.canvasWidth || 800;
    canvasHeight = config.canvasHeight || 400;

    initializeEntities(config.entityCount || 100);

    isRunning = true;
    tick = 0;

    const intervalMs = 1000 / tickRate;
    tickInterval = setInterval(gameTick, intervalMs);
}

function stopGameLoop() {
    isRunning = false;
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}

function initializeEntities(count) {
    entities = [];
    const colors = ['#4a9eff', '#28a745', '#ffc107', '#dc3545', '#17a2b8', '#6f42c1'];

    for (let i = 0; i < count; i++) {
        entities.push({
            id: i,
            x: Math.random() * canvasWidth,
            y: Math.random() * canvasHeight,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            radius: 5 + Math.random() * 10,
            color: colors[Math.floor(Math.random() * colors.length)]
        });
    }
}

function gameTick() {
    if (!isRunning) return;

    const startTime = performance.now();

    tick++;
    updateEntities();

    const tickTime = performance.now() - startTime;

    self.postMessage({
        type: 'STATE',
        payload: {
            tick,
            tickTime,
            entities: entities.map(e => ({
                x: e.x,
                y: e.y,
                radius: e.radius,
                color: e.color
            }))
        }
    });
}

function updateEntities() {
    entities.forEach(entity => {
        entity.x += entity.vx;
        entity.y += entity.vy;

        if (entity.x - entity.radius < 0 || entity.x + entity.radius > canvasWidth) {
            entity.vx *= -1;
            entity.x = Math.max(entity.radius, Math.min(canvasWidth - entity.radius, entity.x));
        }

        if (entity.y - entity.radius < 0 || entity.y + entity.radius > canvasHeight) {
            entity.vy *= -1;
            entity.y = Math.max(entity.radius, Math.min(canvasHeight - entity.radius, entity.y));
        }
    });
}
