/**
 * Shadow Casting - Web Worker
 */

let boxes = [];
let width = 800, height = 500;
let lightX = 400, lightY = 250;

self.onmessage = function(event) {
    const { type, payload } = event.data;

    switch (type) {
        case 'START':
            boxes = payload.boxes;
            width = payload.width;
            height = payload.height;
            break;
        case 'BOXES':
            boxes = payload;
            break;
        case 'LIGHT':
            lightX = payload.x;
            lightY = payload.y;
            calculateShadows();
            break;
    }
};

function calculateShadows() {
    const shadows = [];

    for (const box of boxes) {
        const corners = [
            { x: box.x, y: box.y },
            { x: box.x + box.w, y: box.y },
            { x: box.x + box.w, y: box.y + box.h },
            { x: box.x, y: box.y + box.h }
        ];

        // Find silhouette edges
        const edges = [];
        for (let i = 0; i < 4; i++) {
            const c1 = corners[i];
            const c2 = corners[(i + 1) % 4];
            const mid = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
            const toLight = { x: lightX - mid.x, y: lightY - mid.y };
            const edgeNormal = { x: -(c2.y - c1.y), y: c2.x - c1.x };

            if (toLight.x * edgeNormal.x + toLight.y * edgeNormal.y < 0) {
                edges.push({ c1, c2 });
            }
        }

        // Project shadow for each edge
        for (const edge of edges) {
            const shadow = [];
            shadow.push(edge.c1);
            shadow.push(edge.c2);

            // Project to far distance
            const proj2 = projectPoint(edge.c2, lightX, lightY, 2000);
            const proj1 = projectPoint(edge.c1, lightX, lightY, 2000);

            shadow.push(proj2);
            shadow.push(proj1);

            shadows.push(shadow);
        }
    }

    self.postMessage({ type: 'SHADOWS', payload: { shadows } });
}

function projectPoint(point, lx, ly, dist) {
    const dx = point.x - lx;
    const dy = point.y - ly;
    const len = Math.sqrt(dx * dx + dy * dy);
    return {
        x: point.x + (dx / len) * dist,
        y: point.y + (dy / len) * dist
    };
}
