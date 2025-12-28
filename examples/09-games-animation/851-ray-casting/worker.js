/**
 * Ray Casting - Web Worker
 */

let walls = [];
let rayCount = 360;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            walls = payload.walls;
            rayCount = payload.rayCount;
            break;
        case 'WALLS':
            walls = payload;
            break;
        case 'CAST':
            castRays(payload.x, payload.y);
            break;
    }
};

function castRays(sourceX, sourceY) {
    const startTime = performance.now();
    const rays = [];

    for (let i = 0; i < rayCount; i++) {
        const angle = (i / rayCount) * Math.PI * 2;
        const ray = {
            x: sourceX,
            y: sourceY,
            dx: Math.cos(angle),
            dy: Math.sin(angle)
        };

        const hit = castRay(ray);
        if (hit) {
            rays.push({
                angle,
                hitX: hit.x,
                hitY: hit.y,
                distance: hit.distance
            });
        }
    }

    // Sort by angle for polygon
    rays.sort((a, b) => a.angle - b.angle);

    const calcTime = performance.now() - startTime;

    self.postMessage({
        type: 'RAYS',
        payload: { rays, calcTime }
    });
}

function castRay(ray) {
    let closest = null;
    let closestDist = Infinity;

    for (const wall of walls) {
        const hit = rayWallIntersection(ray, wall);
        if (hit && hit.distance < closestDist) {
            closestDist = hit.distance;
            closest = hit;
        }
    }

    return closest;
}

function rayWallIntersection(ray, wall) {
    const x1 = wall.x1, y1 = wall.y1;
    const x2 = wall.x2, y2 = wall.y2;
    const x3 = ray.x, y3 = ray.y;
    const x4 = ray.x + ray.dx, y4 = ray.y + ray.dy;

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

    if (t >= 0 && t <= 1 && u >= 0) {
        const hitX = x1 + t * (x2 - x1);
        const hitY = y1 + t * (y2 - y1);
        const dx = hitX - ray.x;
        const dy = hitY - ray.y;
        return {
            x: hitX,
            y: hitY,
            distance: Math.sqrt(dx * dx + dy * dy)
        };
    }

    return null;
}
