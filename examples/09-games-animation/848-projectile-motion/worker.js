/**
 * Projectile Motion - Web Worker
 */

let projectile = null;
let config = null;
let interval = null;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'FIRE') {
        if (interval) clearInterval(interval);

        config = payload;
        projectile = {
            x: payload.x,
            y: payload.y,
            vx: Math.cos(payload.angle) * payload.velocity,
            vy: Math.sin(payload.angle) * payload.velocity,
            trail: [],
            maxHeight: 0,
            time: 0
        };

        interval = setInterval(update, 1000 / 60);
    }
};

function update() {
    if (!projectile) return;

    const dt = 1 / 60;
    projectile.time += dt;

    // Calculate air resistance
    const speed = Math.sqrt(projectile.vx * projectile.vx + projectile.vy * projectile.vy);
    const dragX = -config.airResistance * speed * projectile.vx;
    const dragY = -config.airResistance * speed * projectile.vy;

    // Update velocity
    projectile.vx += dragX * dt;
    projectile.vy += (dragY - config.gravity) * dt;

    // Update position
    projectile.x += projectile.vx * dt * 10;
    projectile.y += projectile.vy * dt * 10;

    // Track max height
    if (projectile.y > projectile.maxHeight) {
        projectile.maxHeight = projectile.y;
    }

    // Store trail point
    projectile.trail.push({ x: projectile.x, y: projectile.y });

    // Check if landed
    if (projectile.y <= 0 && projectile.vy < 0) {
        projectile.y = 0;

        self.postMessage({
            type: 'COMPLETE',
            payload: {
                trail: projectile.trail,
                maxHeight: projectile.maxHeight,
                range: projectile.x - config.x,
                flightTime: projectile.time
            }
        });

        clearInterval(interval);
        interval = null;
        projectile = null;
        return;
    }

    // Safety check - stop if out of bounds
    if (projectile.x > 1000 || projectile.time > 30) {
        clearInterval(interval);
        interval = null;
        projectile = null;
        return;
    }

    self.postMessage({
        type: 'UPDATE',
        payload: {
            x: projectile.x,
            y: projectile.y,
            trail: projectile.trail
        }
    });
}
