/**
 * AI Behavior Tree - Web Worker
 */
let ai = { x: 400, y: 250, health: 100, speed: 2 };
let resources = [], threats = [];
let activeNode = 'Idle';
let width = 800, height = 500;
let interval = null;

self.onmessage = function(e) {
    if (e.data.type === 'START') {
        width = e.data.payload.width;
        height = e.data.payload.height;
        ai = { x: width / 2, y: height / 2, health: 100, speed: 2 };
        resources = Array.from({ length: 5 }, () => ({ x: Math.random() * width, y: Math.random() * height }));
        threats = Array.from({ length: 2 }, () => ({
            x: Math.random() * width, y: Math.random() * height,
            vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2
        }));
        if (interval) clearInterval(interval);
        interval = setInterval(update, 1000 / 60);
    }
};

function update() {
    // Move threats
    threats.forEach(t => {
        t.x += t.vx; t.y += t.vy;
        if (t.x < 0 || t.x > width) t.vx *= -1;
        if (t.y < 0 || t.y > height) t.vy *= -1;
    });

    // Behavior tree logic
    executeBehaviorTree();

    // Damage from nearby threats
    threats.forEach(t => {
        const d = Math.hypot(t.x - ai.x, t.y - ai.y);
        if (d < 35) ai.health = Math.max(0, ai.health - 0.5);
    });

    // Collect resources
    resources = resources.filter(r => {
        const d = Math.hypot(r.x - ai.x, r.y - ai.y);
        if (d < 25) { ai.health = Math.min(100, ai.health + 10); return false; }
        return true;
    });

    // Spawn new resources
    if (resources.length < 3 && Math.random() < 0.01) {
        resources.push({ x: Math.random() * width, y: Math.random() * height });
    }

    self.postMessage({
        type: 'STATE',
        payload: { ...ai, activeNode, resources, threats }
    });
}

function executeBehaviorTree() {
    // Root: Selector
    if (checkDanger()) {
        if (ai.health < 30) { flee(); activeNode = 'Flee'; }
        else { evade(); activeNode = 'Evade'; }
    } else if (ai.health < 70 && resources.length > 0) {
        seekResource(); activeNode = 'Seek Resource';
    } else {
        wander(); activeNode = 'Wander';
    }
}

function checkDanger() {
    return threats.some(t => Math.hypot(t.x - ai.x, t.y - ai.y) < 100);
}

function flee() {
    const closest = threats.reduce((c, t) => Math.hypot(t.x - ai.x, t.y - ai.y) < Math.hypot(c.x - ai.x, c.y - ai.y) ? t : c);
    const angle = Math.atan2(ai.y - closest.y, ai.x - closest.x);
    moveAI(angle, 4);
}

function evade() {
    const closest = threats.reduce((c, t) => Math.hypot(t.x - ai.x, t.y - ai.y) < Math.hypot(c.x - ai.x, c.y - ai.y) ? t : c);
    const angle = Math.atan2(ai.y - closest.y, ai.x - closest.x) + (Math.random() - 0.5);
    moveAI(angle, 3);
}

function seekResource() {
    if (resources.length === 0) return;
    const closest = resources.reduce((c, r) => Math.hypot(r.x - ai.x, r.y - ai.y) < Math.hypot(c.x - ai.x, c.y - ai.y) ? r : c);
    const angle = Math.atan2(closest.y - ai.y, closest.x - ai.x);
    moveAI(angle, 2);
}

function wander() {
    const angle = Math.sin(Date.now() * 0.001) * Math.PI;
    moveAI(angle, 1);
}

function moveAI(angle, speed) {
    ai.x += Math.cos(angle) * speed;
    ai.y += Math.sin(angle) * speed;
    ai.x = Math.max(20, Math.min(width - 20, ai.x));
    ai.y = Math.max(20, Math.min(height - 20, ai.y));
}
