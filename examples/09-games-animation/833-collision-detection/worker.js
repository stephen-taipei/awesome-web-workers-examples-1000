/**
 * Collision Detection - Web Worker
 * Spatial hash grid for efficient collision detection
 */

let objects = [];
let cellSize = 50;
let width = 800;
let height = 400;
let isRunning = false;
let interval = null;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            cellSize = payload.cellSize;
            width = payload.width;
            height = payload.height;
            initObjects(payload.objectCount);
            startDetection();
            break;
        case 'STOP':
            stopDetection();
            break;
    }
};

function initObjects(count) {
    objects = [];
    for (let i = 0; i < count; i++) {
        objects.push({
            id: i,
            x: Math.random() * width,
            y: Math.random() * height,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            radius: 5 + Math.random() * 10,
            colliding: false
        });
    }
}

function startDetection() {
    isRunning = true;
    interval = setInterval(update, 1000 / 60);
}

function stopDetection() {
    isRunning = false;
    if (interval) clearInterval(interval);
}

function update() {
    const startTime = performance.now();

    // Move objects
    objects.forEach(obj => {
        obj.x += obj.vx;
        obj.y += obj.vy;

        if (obj.x < obj.radius || obj.x > width - obj.radius) obj.vx *= -1;
        if (obj.y < obj.radius || obj.y > height - obj.radius) obj.vy *= -1;

        obj.x = Math.max(obj.radius, Math.min(width - obj.radius, obj.x));
        obj.y = Math.max(obj.radius, Math.min(height - obj.radius, obj.y));
        obj.colliding = false;
    });

    // Build spatial hash grid
    const grid = new Map();
    objects.forEach(obj => {
        const cells = getCells(obj);
        cells.forEach(cell => {
            if (!grid.has(cell)) grid.set(cell, []);
            grid.get(cell).push(obj);
        });
    });

    // Check collisions using grid
    let collisionCount = 0;
    let checksPerformed = 0;
    const checked = new Set();

    grid.forEach(cellObjects => {
        for (let i = 0; i < cellObjects.length; i++) {
            for (let j = i + 1; j < cellObjects.length; j++) {
                const a = cellObjects[i];
                const b = cellObjects[j];
                const pairKey = a.id < b.id ? `${a.id}-${b.id}` : `${b.id}-${a.id}`;

                if (!checked.has(pairKey)) {
                    checked.add(pairKey);
                    checksPerformed++;

                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < a.radius + b.radius) {
                        a.colliding = true;
                        b.colliding = true;
                        collisionCount++;
                    }
                }
            }
        }
    });

    const bruteForceChecks = (objects.length * (objects.length - 1)) / 2;
    const checksSaved = ((bruteForceChecks - checksPerformed) / bruteForceChecks) * 100;

    const detectionTime = performance.now() - startTime;

    self.postMessage({
        type: 'STATE',
        payload: {
            objects: objects.map(o => ({
                x: o.x,
                y: o.y,
                radius: o.radius,
                colliding: o.colliding
            })),
            collisionCount,
            checksSaved,
            detectionTime
        }
    });
}

function getCells(obj) {
    const cells = [];
    const minX = Math.floor((obj.x - obj.radius) / cellSize);
    const maxX = Math.floor((obj.x + obj.radius) / cellSize);
    const minY = Math.floor((obj.y - obj.radius) / cellSize);
    const maxY = Math.floor((obj.y + obj.radius) / cellSize);

    for (let x = minX; x <= maxX; x++) {
        for (let y = minY; y <= maxY; y++) {
            cells.push(`${x},${y}`);
        }
    }
    return cells;
}
