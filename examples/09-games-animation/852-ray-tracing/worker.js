/**
 * Ray Tracing - Web Worker
 * Simple sphere ray tracer
 */

const spheres = [
    { x: 0, y: 0, z: 5, radius: 1, color: [255, 100, 100], reflectivity: 0.3 },
    { x: -2, y: 1, z: 6, radius: 1.2, color: [100, 255, 100], reflectivity: 0.5 },
    { x: 2, y: -0.5, z: 4, radius: 0.8, color: [100, 100, 255], reflectivity: 0.4 },
    { x: 0, y: -101, z: 5, radius: 100, color: [200, 200, 200], reflectivity: 0.2 }
];

const light = { x: -5, y: 5, z: -5 };

self.onmessage = function(event) {
    const { type, payload } = event.data;

    if (type === 'RENDER') {
        renderScene(payload.width, payload.height, payload.maxBounces);
    }
};

function renderScene(width, height, maxBounces) {
    const startTime = performance.now();
    const aspectRatio = width / height;
    const fov = Math.PI / 3;

    for (let y = 0; y < height; y++) {
        const row = new Uint8Array(width * 3);

        for (let x = 0; x < width; x++) {
            const nx = (x / width - 0.5) * 2 * aspectRatio * Math.tan(fov / 2);
            const ny = (0.5 - y / height) * 2 * Math.tan(fov / 2);

            const ray = {
                ox: 0, oy: 0, oz: 0,
                dx: nx, dy: ny, dz: 1
            };
            normalize(ray);

            const color = trace(ray, maxBounces);
            row[x * 3] = Math.min(255, color[0]);
            row[x * 3 + 1] = Math.min(255, color[1]);
            row[x * 3 + 2] = Math.min(255, color[2]);
        }

        self.postMessage({
            type: 'ROW',
            payload: { y, pixels: row, width }
        });

        if (y % 10 === 0) {
            self.postMessage({
                type: 'PROGRESS',
                payload: { percent: Math.floor((y / height) * 100) }
            });
        }
    }

    self.postMessage({
        type: 'COMPLETE',
        payload: { time: performance.now() - startTime }
    });
}

function trace(ray, depth) {
    if (depth <= 0) return [30, 30, 50];

    const hit = intersectScene(ray);
    if (!hit) return [30, 30, 50];

    const { sphere, t, hitPoint, normal } = hit;

    // Lighting
    const toLight = {
        dx: light.x - hitPoint.x,
        dy: light.y - hitPoint.y,
        dz: light.z - hitPoint.z
    };
    normalize(toLight);

    // Shadow check
    const shadowRay = {
        ox: hitPoint.x + normal.x * 0.001,
        oy: hitPoint.y + normal.y * 0.001,
        oz: hitPoint.z + normal.z * 0.001,
        dx: toLight.dx, dy: toLight.dy, dz: toLight.dz
    };
    const inShadow = intersectScene(shadowRay) !== null;

    // Diffuse
    const diffuse = Math.max(0, dot(normal, toLight));
    const ambient = 0.2;
    const lighting = inShadow ? ambient : ambient + diffuse * 0.8;

    let color = [
        sphere.color[0] * lighting,
        sphere.color[1] * lighting,
        sphere.color[2] * lighting
    ];

    // Reflection
    if (sphere.reflectivity > 0) {
        const reflectDir = reflect(ray, normal);
        const reflectRay = {
            ox: hitPoint.x + normal.x * 0.001,
            oy: hitPoint.y + normal.y * 0.001,
            oz: hitPoint.z + normal.z * 0.001,
            dx: reflectDir.dx, dy: reflectDir.dy, dz: reflectDir.dz
        };
        const reflectColor = trace(reflectRay, depth - 1);
        color[0] = color[0] * (1 - sphere.reflectivity) + reflectColor[0] * sphere.reflectivity;
        color[1] = color[1] * (1 - sphere.reflectivity) + reflectColor[1] * sphere.reflectivity;
        color[2] = color[2] * (1 - sphere.reflectivity) + reflectColor[2] * sphere.reflectivity;
    }

    return color;
}

function intersectScene(ray) {
    let closest = null;
    let closestT = Infinity;

    for (const sphere of spheres) {
        const t = intersectSphere(ray, sphere);
        if (t > 0 && t < closestT) {
            closestT = t;
            const hitPoint = {
                x: ray.ox + ray.dx * t,
                y: ray.oy + ray.dy * t,
                z: ray.oz + ray.dz * t
            };
            const normal = {
                x: (hitPoint.x - sphere.x) / sphere.radius,
                y: (hitPoint.y - sphere.y) / sphere.radius,
                z: (hitPoint.z - sphere.z) / sphere.radius
            };
            closest = { sphere, t, hitPoint, normal };
        }
    }

    return closest;
}

function intersectSphere(ray, sphere) {
    const dx = ray.ox - sphere.x;
    const dy = ray.oy - sphere.y;
    const dz = ray.oz - sphere.z;

    const a = ray.dx * ray.dx + ray.dy * ray.dy + ray.dz * ray.dz;
    const b = 2 * (dx * ray.dx + dy * ray.dy + dz * ray.dz);
    const c = dx * dx + dy * dy + dz * dz - sphere.radius * sphere.radius;

    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return -1;

    return (-b - Math.sqrt(discriminant)) / (2 * a);
}

function normalize(v) {
    const len = Math.sqrt(v.dx * v.dx + v.dy * v.dy + v.dz * v.dz);
    v.dx /= len; v.dy /= len; v.dz /= len;
}

function dot(a, b) {
    return a.x * b.dx + a.y * b.dy + a.z * b.dz;
}

function reflect(ray, normal) {
    const d = 2 * (ray.dx * normal.x + ray.dy * normal.y + ray.dz * normal.z);
    return {
        dx: ray.dx - d * normal.x,
        dy: ray.dy - d * normal.y,
        dz: ray.dz - d * normal.z
    };
}
